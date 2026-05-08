"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { assertAssetPath, assertBannerImagePath } from "@/lib/assets-path";
import { logAdminAction } from "@/lib/admin-audit";
import { err, ok, type AdminActionResult } from "@/lib/admin-action-result";
import type { PolicyTab } from "@/lib/legal-defaults";
import { LEGAL_FALLBACK } from "@/lib/legal-defaults";
import {
  columnFor,
  mergeDraft,
  parsePolicyDrafts,
  publishedAtField,
  removeTabDrafts,
  type PolicyLang,
} from "@/lib/policy-storage";

async function guard() {
  const session = await requireAdminSession();
  return { storeId: STORE_ID, userId: session.userId };
}

export type AdminOrderDetailDTO = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  deliveryPrice: number;
  discountAmount: number;
  pointsDiscountAmount: number;
  total: number;
  deliveryOptionName: string;
  deliveryOptionType: string;
  deliveryOptionPrice: number;
  address: string | null;
  notes: string | null;
  couponCode: string | null;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  payments: {
    id: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    transactionId: string | null;
    createdAt: string;
  }[];
  customerProfile: {
    pointsBalance: number;
    userName: string | null;
    userEmail: string | null;
  } | null;
};

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetailDTO | null> {
  await requireAdminSession();
  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: {
      items: true,
      payments: true,
      customerProfile: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    subtotal: Number(order.subtotal),
    deliveryPrice: Number(order.deliveryPrice),
    discountAmount: Number(order.discountAmount),
    pointsDiscountAmount: Number(order.pointsDiscountAmount),
    total: Number(order.total),
    deliveryOptionName: order.deliveryOptionName,
    deliveryOptionType: order.deliveryOptionType,
    deliveryOptionPrice: Number(order.deliveryOptionPrice),
    address: order.address,
    notes: order.notes,
    couponCode: order.couponCode,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      transactionId: p.transactionId,
      createdAt: p.createdAt.toISOString(),
    })),
    customerProfile: order.customerProfile
      ? {
          pointsBalance: order.customerProfile.pointsBalance,
          userName: order.customerProfile.user?.name ?? null,
          userEmail: order.customerProfile.user?.email ?? null,
        }
      : null,
  };
}

export async function deleteProduct(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    await prisma.product.deleteMany({ where: { id, storeId } });
    await logAdminAction({
      userId,
      action: "product.delete",
      entity: "Product",
      entityId: id,
    });
    revalidatePath("/admin/products");
    revalidatePath(`/products/${id}`);
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקה נכשלה");
  }
}

export async function upsertProduct(formData: FormData): Promise<
  AdminActionResult<{ productId: string }>
> {
  try {
    const { storeId, userId } = await guard();
    const id = (formData.get("id") as string) || "";
    const categoryId = formData.get("categoryId") as string;
    const name_he = formData.get("name_he") as string;
    const name_ar = formData.get("name_ar") as string;
    const name_en = formData.get("name_en") as string;
    const price = Number(formData.get("price"));
    const stock = Number(formData.get("stock"));
    const sku = formData.get("sku") as string;
    const active = formData.get("active") === "on";

    const emptyToNull = (v: FormDataEntryValue | null) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };
    const oldPriceRaw = formData.get("oldPrice") as string;
    const discountRaw = formData.get("discountPercent") as string;
    const variantGroupsRaw = (formData.get("variantGroups") as string) || "";
    const relatedProductsRaw = (formData.get("relatedProducts") as string) || "";

    const base = {
      categoryId,
      title_he: name_he,
      title_ar: name_ar,
      title_en: name_en,
      name_he,
      name_ar,
      name_en,
      description_he: emptyToNull(formData.get("description_he")),
      description_ar: emptyToNull(formData.get("description_ar")),
      description_en: emptyToNull(formData.get("description_en")),
      price: new Prisma.Decimal(price),
      oldPrice:
        oldPriceRaw === undefined || String(oldPriceRaw).trim() === ""
          ? null
          : new Prisma.Decimal(Number(oldPriceRaw)),
      discountPercent:
        discountRaw === undefined || String(discountRaw).trim() === ""
          ? null
          : Number(discountRaw),
      stock,
      sku,
      active,
      featured: formData.get("featured") === "on",
    };

    type VariantOptionInput = {
      value: string;
      priceAdd?: number;
      stock?: number | null;
      sku?: string | null;
      image?: string | null;
      isDefault?: boolean;
      sortOrder?: number;
    };
    type VariantGroupInput = {
      name: string;
      sortOrder?: number;
      options?: VariantOptionInput[];
    };

    const parsedGroups: VariantGroupInput[] | null = (() => {
      const s = variantGroupsRaw.trim();
      if (!s) return null;
      try {
        const val = JSON.parse(s);
        if (!Array.isArray(val)) return null;
        return val as VariantGroupInput[];
      } catch {
        return null;
      }
    })();

    const parsedRelated: Array<{ id: string; sortOrder?: number }> | null = (() => {
      const s = relatedProductsRaw.trim();
      if (!s) return null;
      try {
        const val = JSON.parse(s);
        if (!Array.isArray(val)) return null;
        return val as Array<{ id: string; sortOrder?: number }>;
      } catch {
        return null;
      }
    })();

    // Normalize variant payload OUTSIDE the transaction (no uploads here; image is already a URL/path).
    const normalizedGroups =
      parsedGroups?.map((g, gi) => {
        const name = String(g?.name ?? "").trim();
        const optionsRaw = Array.isArray(g.options) ? g.options : [];
        const options = optionsRaw
          .map((o, oi) => ({
            value: String(o?.value ?? "").trim(),
            priceAdd: Number(o?.priceAdd ?? 0),
            stock: o?.stock == null || String(o.stock).trim() === "" ? null : Number(o.stock),
            sku: o?.sku ? String(o.sku) : null,
            image: o?.image ? String(o.image) : null,
            isDefault: Boolean(o?.isDefault),
            sortOrder: Number(o?.sortOrder ?? oi),
          }))
          .filter((o) => o.value.length > 0);

        // Ensure at most one default; if none selected, keep first as default.
        let defaultIdx = options.findIndex((o) => o.isDefault);
        if (defaultIdx === -1 && options.length > 0) defaultIdx = 0;
        const optionsWithDefault = options.map((o, idx) => ({ ...o, isDefault: idx === defaultIdx }));

        return {
          name,
          sortOrder: Number(g?.sortOrder ?? gi),
          options: optionsWithDefault,
        };
      }).filter((g) => g.name.length > 0) ?? null;

    const normalizedRelated =
      parsedRelated
        ?.map((r, idx) => ({
          id: String(r?.id ?? "").trim(),
          sortOrder: Number(r?.sortOrder ?? idx),
        }))
        .filter((r) => r.id.length > 0) ?? null;

    const { productId, action } = await prisma.$transaction(
      async (tx) => {
        let productId = id;
        let action: "product.update" | "product.create" = "product.update";

        if (id) {
          await tx.product.updateMany({
            where: { id, storeId },
            data: base,
          });
        } else {
          const created = await tx.product.create({ data: { ...base, storeId } });
          productId = created.id;
          action = "product.create";
        }

        // Backward compatible: only touch variants if payload provided.
        if (normalizedGroups) {
          // SAFE delete order: options -> groups.
          await tx.productVariantOption.deleteMany({
            where: { group: { productId } },
          });
          await tx.productVariantGroup.deleteMany({ where: { productId } });

          for (const g of normalizedGroups) {
            const group = await tx.productVariantGroup.create({
              data: { productId, name: g.name, sortOrder: g.sortOrder },
            });
            if (g.options.length > 0) {
              await tx.productVariantOption.createMany({
                data: g.options.map((o) => ({
                  groupId: group.id,
                  value: o.value,
                  priceAdd: new Prisma.Decimal(o.priceAdd),
                  stock: o.stock,
                  sku: o.sku,
                  image: o.image,
                  isDefault: o.isDefault,
                  sortOrder: o.sortOrder,
                })),
              });
            }
          }
        }

        if (normalizedRelated) {
          await tx.productRelatedProduct.deleteMany({ where: { productId } });
          const uniq = Array.from(new Set(normalizedRelated.map((r) => r.id))).filter((rid) => rid !== productId);
          if (uniq.length > 0) {
            // Ensure related products exist and belong to same store.
            const okRelated = await tx.product.findMany({
              where: { storeId, id: { in: uniq } },
              select: { id: true },
            });
            const okSet = new Set(okRelated.map((p) => p.id));
            const data = normalizedRelated
              .filter((r) => okSet.has(r.id) && r.id !== productId)
              .map((r) => ({ productId, relatedProductId: r.id, sortOrder: r.sortOrder }));
            if (data.length > 0) {
              await tx.productRelatedProduct.createMany({ data });
            }
          }
        }

        return { productId, action };
      },
      { timeout: 20000 },
    );

    // Log OUTSIDE the transaction (keeps tx short; avoids interactive timeout).
    await logAdminAction({
      userId,
      action,
      entity: "Product",
      entityId: productId,
      metadata: { sku },
    });
    revalidatePath("/admin/products");
    return ok({ productId });
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירה נכשלה");
  }
}

export async function addProductImage(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const productId = formData.get("productId") as string;
    const urlRaw = formData.get("url") as string;
    const url = assertAssetPath(urlRaw);
    await prisma.product.findFirstOrThrow({ where: { id: productId, storeId } });
    await prisma.productImage.create({
      data: {
        storeId,
        productId,
        url,
        sortOrder: Number(formData.get("sortOrder") || 0),
        isMain: formData.get("isMain") === "on",
      },
    });
    await logAdminAction({
      userId,
      action: "product.image.create",
      entity: "Product",
      entityId: productId,
      metadata: { path: url },
    });
    revalidatePath("/admin/products");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "הוספת תמונה נכשלה");
  }
}

export async function deleteProductImage(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const imageId = formData.get("imageId") as string;
    const img = await prisma.productImage.findFirst({
      where: { id: imageId, storeId },
    });
    if (!img) return err("תמונה לא נמצאה");
    await prisma.productImage.deleteMany({ where: { id: imageId, storeId } });
    await logAdminAction({
      userId,
      action: "product.image.delete",
      entity: "ProductImage",
      entityId: imageId,
    });
    revalidatePath("/admin/products");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת תמונה נכשלה");
  }
}

export async function setMainProductImage(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const productId = formData.get("productId") as string;
    const imageId = formData.get("imageId") as string;
    await prisma.product.findFirstOrThrow({ where: { id: productId, storeId } });
    await prisma.productImage.findFirstOrThrow({ where: { id: imageId, productId, storeId } });
    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId, storeId },
        data: { isMain: false },
      }),
      prisma.productImage.updateMany({
        where: { id: imageId, storeId },
        data: { isMain: true },
      }),
    ]);
    await logAdminAction({
      userId,
      action: "product.image.main",
      entity: "Product",
      entityId: productId,
    });
    revalidatePath("/admin/products");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "עדכון תמונה ראשית נכשל");
  }
}

export async function reorderProductImage(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const imageId = String(formData.get("imageId") ?? "");
    const direction = String(formData.get("direction") ?? "");
    if (!imageId || (direction !== "up" && direction !== "down")) {
      return err("פרמטרים חסרים");
    }

    const current = await prisma.productImage.findFirst({
      where: { id: imageId, storeId },
      select: { id: true, productId: true, sortOrder: true },
    });
    if (!current) return err("תמונה לא נמצאה");

    const sibling = await prisma.productImage.findFirst({
      where: {
        storeId,
        productId: current.productId,
        ...(direction === "up"
          ? { sortOrder: { lt: current.sortOrder } }
          : { sortOrder: { gt: current.sortOrder } }),
      },
      orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
      select: { id: true, sortOrder: true },
    });
    if (!sibling) return ok();

    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { id: current.id, storeId },
        data: { sortOrder: sibling.sortOrder },
      }),
      prisma.productImage.updateMany({
        where: { id: sibling.id, storeId },
        data: { sortOrder: current.sortOrder },
      }),
    ]);

    await logAdminAction({
      userId,
      action: "product.image.reorder",
      entity: "ProductImage",
      entityId: imageId,
      metadata: { direction, productId: current.productId },
    });
    revalidatePath("/admin/products");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שינוי סדר תמונה נכשל");
  }
}

export async function upsertCategory(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = (formData.get("id") as string) || "";
    const parentIdRaw = (formData.get("parentId") as string) || "";
    const parentId = parentIdRaw.trim() === "" ? null : parentIdRaw.trim();
    const emptyToNull = (v: FormDataEntryValue | null) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };
    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parentId, storeId },
        select: { id: true, parentId: true },
      });
      if (!parent) return err("קטגוריית אב לא נמצאה");
      if (parent.parentId) return err("מותרת היררכיה של רמה אחת בלבד (אב → תת־קטגוריה)");
      if (id && parentId === id) return err("parentId לא יכול להיות זהה ל־id");
    }
    const common = {
      name_he: formData.get("name_he") as string,
      name_ar: formData.get("name_ar") as string,
      name_en: formData.get("name_en") as string,
      description_he: emptyToNull(formData.get("description_he")),
      description_ar: emptyToNull(formData.get("description_ar")),
      description_en: emptyToNull(formData.get("description_en")),
      parentId,
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
      imageUrl: (() => {
        const v = formData.get("imageUrl") as string;
        if (!v?.trim()) return null;
        return assertAssetPath(v.trim());
      })(),
    };
    if (id) {
      await prisma.category.updateMany({ where: { id, storeId }, data: common });
      await logAdminAction({ userId, action: "category.update", entity: "Category", entityId: id });
    } else {
      const c = await prisma.category.create({ data: { ...common, storeId } });
      await logAdminAction({ userId, action: "category.create", entity: "Category", entityId: c.id });
    }
    revalidatePath("/admin/categories");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת קטגוריה נכשלה");
  }
}

export async function deleteCategory(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    const productCount = await prisma.product.count({
      where: { categoryId: id, storeId },
    });
    if (productCount > 0) {
      return err("לא ניתן למחוק קטגוריה עם מוצרים.");
    }
    const childrenCount = await prisma.category.count({
      where: { storeId, parentId: id },
    });
    if (childrenCount > 0) {
      return err("לא ניתן למחוק קטגוריה עם תתי־קטגוריות. מחק/העבר את תתי־הקטגוריות קודם.");
    }
    await prisma.category.deleteMany({ where: { id, storeId } });
    await logAdminAction({
      userId,
      action: "category.delete",
      entity: "Category",
      entityId: id,
    });
    revalidatePath("/admin/categories");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת קטגוריה נכשלה");
  }
}

export async function upsertBanner(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = (formData.get("id") as string) || "";
    const imageRaw = (formData.get("imageUrl") as string)?.trim();
    if (!imageRaw) return err("נדרש נתיב תמונה");
    const imageUrl = assertBannerImagePath(imageRaw);
    const type = String(formData.get("type") || "SECTION").toUpperCase() as
      | "HERO"
      | "SECTION"
      | "POPUP"
      | "PROMO";
    const isHero = formData.get("isHero") === "on";
    const common = {
      title_he: formData.get("title_he") as string,
      title_ar: formData.get("title_ar") as string,
      title_en: formData.get("title_en") as string,
      subtitle_he: (formData.get("subtitle_he") as string) || null,
      subtitle_ar: (formData.get("subtitle_ar") as string) || null,
      subtitle_en: (formData.get("subtitle_en") as string) || null,
      imageUrl,
      buttonText_he: (formData.get("buttonText_he") as string) || null,
      buttonText_ar: (formData.get("buttonText_ar") as string) || null,
      buttonText_en: (formData.get("buttonText_en") as string) || null,
      buttonUrl: (formData.get("buttonUrl") as string) || null,
      type: type as never,
      isHero,
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
    };
    if (isHero) {
      await prisma.banner.updateMany({
        where: { storeId, isHero: true, ...(id ? { id: { not: id } } : {}) },
        data: { isHero: false },
      });
    }
    if (id) {
      await prisma.banner.updateMany({ where: { id, storeId }, data: common });
      await logAdminAction({
        userId,
        action: "banner.update",
        entity: "Banner",
        entityId: id,
        metadata: { isHero, type },
      });
    } else {
      const b = await prisma.banner.create({ data: { ...common, storeId } });
      await logAdminAction({
        userId,
        action: "banner.create",
        entity: "Banner",
        entityId: b.id,
        metadata: { isHero, type },
      });
    }
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת באנר נכשלה");
  }
}

export async function setBannerAsHero(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = String(formData.get("id") ?? "");
    if (!id) return err("מזהה באנר חסר");

    await prisma.$transaction([
      prisma.banner.updateMany({
        where: { storeId, isHero: true, id: { not: id } },
        data: { isHero: false },
      }),
      prisma.banner.updateMany({
        where: { id, storeId },
        data: { isHero: true, type: "HERO" as never, active: true },
      }),
    ]);

    await logAdminAction({
      userId,
      action: "banner.set.hero",
      entity: "Banner",
      entityId: id,
    });
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "הגדרת HERO נכשלה");
  }
}

export async function deleteBanner(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    await prisma.banner.deleteMany({ where: { id, storeId } });
    await logAdminAction({ userId, action: "banner.delete", entity: "Banner", entityId: id });
    revalidatePath("/admin/banners");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת באנר נכשלה");
  }
}

export async function upsertDelivery(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = (formData.get("id") as string) || "";
    const type = formData.get("type") as "PICKUP" | "SHIPPING";
    const common = {
      name_he: formData.get("name_he") as string,
      name_ar: formData.get("name_ar") as string,
      name_en: formData.get("name_en") as string,
      type,
      price: new Prisma.Decimal(Number(formData.get("price"))),
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
    };
    if (id) {
      await prisma.deliveryOption.updateMany({ where: { id, storeId }, data: common });
      await logAdminAction({ userId, action: "delivery.update", entity: "DeliveryOption", entityId: id });
    } else {
      const d = await prisma.deliveryOption.create({ data: { ...common, storeId } });
      await logAdminAction({
        userId,
        action: "delivery.create",
        entity: "DeliveryOption",
        entityId: d.id,
      });
    }
    revalidatePath("/admin/delivery");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת משלוח נכשלה");
  }
}

export async function deleteDeliveryOption(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    await prisma.deliveryOption.deleteMany({ where: { id, storeId } });
    await logAdminAction({
      userId,
      action: "delivery.delete",
      entity: "DeliveryOption",
      entityId: id,
    });
    revalidatePath("/admin/delivery");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת אפשרות משלוח נכשלה");
  }
}

export async function upsertCoupon(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = (formData.get("id") as string) || "";
    const type = formData.get("type") as "PERCENT" | "FIXED";
    const expRaw = formData.get("expiresAt") as string;
    const expiresAt =
      !expRaw || Number.isNaN(Date.parse(expRaw)) ? null : new Date(expRaw);

    const minRaw = formData.get("minOrderAmount");
    const limRaw = formData.get("usageLimit");

    const common = {
      code: (formData.get("code") as string).toUpperCase(),
      type,
      value: new Prisma.Decimal(Number(formData.get("value"))),
      minOrderAmount:
        minRaw === null || minRaw === ""
          ? null
          : new Prisma.Decimal(Number(minRaw)),
      usageLimit: limRaw === null || limRaw === "" ? null : Number(limRaw),
      active: formData.get("active") === "on",
      expiresAt,
    };
    if (id) {
      await prisma.coupon.updateMany({ where: { id, storeId }, data: common });
      await logAdminAction({ userId, action: "coupon.update", entity: "Coupon", entityId: id });
    } else {
      const c = await prisma.coupon.create({ data: { ...common, storeId } });
      await logAdminAction({ userId, action: "coupon.create", entity: "Coupon", entityId: c.id });
    }
    revalidatePath("/admin/coupons");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת קופון נכשלה");
  }
}

export async function deleteCoupon(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    await prisma.coupon.deleteMany({ where: { id, storeId } });
    await logAdminAction({ userId, action: "coupon.delete", entity: "Coupon", entityId: id });
    revalidatePath("/admin/coupons");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת קופון נכשלה");
  }
}

export async function saveLoyaltySettings(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const payload = {
      enabled: formData.get("enabled") === "on",
      pointsPerShekel: new Prisma.Decimal(Number(formData.get("pointsPerShekel"))),
      minOrderForPoints: new Prisma.Decimal(Number(formData.get("minOrderForPoints"))),
      pointsToIlsRate: new Prisma.Decimal(Number(formData.get("pointsToIlsRate"))),
      allowRedeem: formData.get("allowRedeem") === "on",
      pointsExpireDays:
        formData.get("pointsExpireDays") === "" ? null : Number(formData.get("pointsExpireDays")),
    };
    await prisma.loyaltySettings.upsert({
      where: { storeId },
      create: { storeId, ...payload },
      update: payload,
    });
    await logAdminAction({ userId, action: "loyalty.settings.update", entity: "LoyaltySettings" });
    revalidatePath("/admin/loyalty");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת הגדרות נכשלה");
  }
}

export async function upsertLoyaltyReward(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = (formData.get("id") as string) || "";
    const rewardType = formData.get("rewardType") as
      | "DISCOUNT"
      | "FREE_SHIPPING"
      | "FREE_PRODUCT"
      | "COUPON";
    const common = {
      title_he: formData.get("title_he") as string,
      title_ar: formData.get("title_ar") as string,
      title_en: formData.get("title_en") as string,
      description_he: (formData.get("description_he") as string) || null,
      description_ar: (formData.get("description_ar") as string) || null,
      description_en: (formData.get("description_en") as string) || null,
      requiredPoints: Number(formData.get("requiredPoints")),
      rewardType,
      value: (formData.get("value") as string) || null,
      active: formData.get("active") === "on",
    };
    if (id) {
      await prisma.loyaltyReward.updateMany({ where: { id, storeId }, data: common });
      await logAdminAction({ userId, action: "loyalty.reward.update", entity: "LoyaltyReward", entityId: id });
    } else {
      const r = await prisma.loyaltyReward.create({ data: { ...common, storeId } });
      await logAdminAction({
        userId,
        action: "loyalty.reward.create",
        entity: "LoyaltyReward",
        entityId: r.id,
      });
    }
    revalidatePath("/admin/loyalty");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת פרס נכשלה");
  }
}

export async function deleteLoyaltyReward(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    await prisma.loyaltyReward.deleteMany({ where: { id, storeId } });
    await logAdminAction({ userId, action: "loyalty.reward.delete", entity: "LoyaltyReward", entityId: id });
    revalidatePath("/admin/loyalty");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת פרס נכשלה");
  }
}

export async function saveStoreSettings(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const storeNameRaw = (formData.get("storeName") as string)?.trim();
    if (storeNameRaw) {
      await prisma.store.update({
        where: { id: storeId },
        data: { name: storeNameRaw },
      });
    }

    const logoRaw = (formData.get("logoUrl") as string)?.trim();
    const prefixRaw = (formData.get("orderNumberPrefix") as string)?.trim().toUpperCase();
    const orderNumberPrefix = (prefixRaw || "ORD").slice(0, 12);

    const registrationEnabled = formData.get("registrationEnabled") === "on";
    const requireEmailVerificationForCheckout =
      formData.get("requireEmailVerificationForCheckout") === "on";

    const payload = {
      logoUrl: logoRaw ? assertAssetPath(logoRaw) : null,
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      accentColor: formData.get("accentColor") as string,
      currency: formData.get("currency") as string,
      languageDefault: formData.get("languageDefault") as string,
      rtlEnabled: formData.get("rtlEnabled") === "on",
      whatsappPhone: (formData.get("whatsappPhone") as string) || null,
      supportEmail: (formData.get("supportEmail") as string) || null,
      orderNumberPrefix,
      registrationEnabled,
      requireEmailVerificationForCheckout,
    };

    await prisma.storeSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        ...payload,
        nextOrderNumber: 1001,
      },
      update: payload,
    });
    await logAdminAction({ userId, action: "store.settings.update", entity: "StoreSettings" });
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת הגדרות נכשלה");
  }
}

function revalidateLegalStorefrontPaths() {
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/refunds");
  revalidatePath("/shipping");
}

export async function savePolicyDraft(
  tab: PolicyTab,
  lang: PolicyLang,
  html: string,
): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const row = await prisma.storeSettings.findUnique({ where: { storeId }, select: { policyDrafts: true } });
    const merged = mergeDraft(row?.policyDrafts ?? null, tab, lang, html);
    await prisma.storeSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        policyDrafts: merged as Prisma.InputJsonValue,
        nextOrderNumber: 1001,
      },
      update: { policyDrafts: merged as Prisma.InputJsonValue },
    });
    await logAdminAction({
      userId,
      action: "legal.draft.save",
      entity: "StoreSettings",
      metadata: { tab, lang },
    });
    revalidatePath("/admin/settings/terms");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת טיוטה נכשלה");
  }
}

export async function publishPolicyTab(tab: PolicyTab): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const row = await prisma.storeSettings.findUnique({ where: { storeId } });
    if (!row) return err("הגדרות חנות לא נמצאו");

    const drafts = parsePolicyDrafts(row.policyDrafts);
    const tabDrafts = drafts[tab] ?? {};
    const hasDraft = Object.keys(tabDrafts).some((k) => tabDrafts[k as PolicyLang] !== undefined);
    if (!hasDraft) {
      return err("אין טיוטה לפרסום. שמרו טיוטה או ערכו תוכן לפני פרסום.");
    }

    const updateData: Prisma.StoreSettingsUpdateInput = {
      [publishedAtField(tab)]: new Date(),
    };

    for (const L of ["he", "en", "ar"] as PolicyLang[]) {
      const html = tabDrafts[L];
      if (html !== undefined) {
        (updateData as Record<string, unknown>)[columnFor(tab, L)] =
          html.trim() === "" ? null : html;
      }
    }

    const nextDrafts = removeTabDrafts(row.policyDrafts, tab);
    updateData.policyDrafts =
      Object.keys(nextDrafts).length === 0
        ? Prisma.DbNull
        : (nextDrafts as Prisma.InputJsonValue);

    await prisma.storeSettings.update({
      where: { storeId },
      data: updateData,
    });

    await logAdminAction({
      userId,
      action: "legal.publish",
      entity: "StoreSettings",
      metadata: { tab },
    });
    revalidateLegalStorefrontPaths();
    revalidatePath("/admin/settings/terms");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "פרסום נכשל");
  }
}

export async function restorePolicyTabDefaults(tab: PolicyTab): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const d = LEGAL_FALLBACK[tab];
    const pubField = publishedAtField(tab);

    const row = await prisma.storeSettings.findUnique({
      where: { storeId },
      select: { policyDrafts: true },
    });
    const nextDrafts = removeTabDrafts(row?.policyDrafts ?? null, tab);
    const policyDraftsValue =
      Object.keys(nextDrafts).length === 0
        ? Prisma.DbNull
        : (nextDrafts as Prisma.InputJsonValue);

    const updateData: Prisma.StoreSettingsUpdateInput = {
      [`${tab}_he`]: d.he,
      [`${tab}_en`]: d.en,
      [`${tab}_ar`]: d.ar,
      [pubField]: new Date(),
      policyDrafts: policyDraftsValue,
    };

    await prisma.storeSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        nextOrderNumber: 1001,
        [`${tab}_he`]: d.he,
        [`${tab}_en`]: d.en,
        [`${tab}_ar`]: d.ar,
        [pubField]: new Date(),
        ...(Object.keys(nextDrafts).length > 0
          ? { policyDrafts: nextDrafts as Prisma.InputJsonValue }
          : {}),
      },
      update: updateData,
    });

    await logAdminAction({
      userId,
      action: "legal.restore_defaults",
      entity: "StoreSettings",
      metadata: { tab },
    });
    revalidateLegalStorefrontPaths();
    revalidatePath("/admin/settings/terms");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שחזור ברירת מחדל נכשל");
  }
}

export async function savePickupEnabled(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const pickupEnabled = formData.get("pickupEnabled") === "on";
    await prisma.storeSettings.upsert({
      where: { storeId },
      create: { storeId, pickupEnabled },
      update: { pickupEnabled },
    });
    await logAdminAction({
      userId,
      action: "delivery.pickup.toggle",
      entity: "StoreSettings",
      metadata: { pickupEnabled },
    });
    revalidatePath("/admin/delivery");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "עדכון איסוף נכשל");
  }
}

export async function updateOrderStatus(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    const paymentStatus = formData.get("paymentStatus") as string;
    const fulfillmentRaw = String(formData.get("fulfillmentStatus") ?? "").trim();
    const fulfillmentOk = ["RECEIVED", "PROCESSING", "PACKED", "SHIPPED", "COMPLETED"].includes(
      fulfillmentRaw,
    );
    // Restore inventory when cancelling a previously active order (best-effort, backward compatible).
    const prev = await prisma.order.findFirst({
      where: { id, storeId },
      select: { status: true, paymentStatus: true, inventoryReducedAt: true },
    });
    const nextStatus = status as never;
    const nextPayment = paymentStatus as never;

    await prisma.$transaction(async (tx) => {
      if (prev?.status !== "CANCELLED" && status === "CANCELLED" && prev?.inventoryReducedAt) {
        const items = await tx.orderItem.findMany({
          where: { orderId: id, storeId },
          select: { productId: true, quantity: true, variantOptionIds: true },
        });
        for (const it of items) {
          const optionIds = Array.isArray(it.variantOptionIds) ? it.variantOptionIds : [];
          if (optionIds.length > 0) {
            // Increment only managed variant options (stock != null)
            await tx.productVariantOption.updateMany({
              where: { id: { in: optionIds }, stock: { not: null } },
              data: { stock: { increment: it.quantity } },
            });
          } else {
            await tx.product.updateMany({
              where: { id: it.productId, storeId },
              data: { stock: { increment: it.quantity } },
            });
          }
        }
        await tx.order.updateMany({
          where: { id, storeId },
          data: { inventoryReducedAt: null },
        });
      }

      await tx.order.updateMany({
        where: { id, storeId },
        data: {
          status: nextStatus,
          paymentStatus: nextPayment,
          ...(fulfillmentOk ? { fulfillmentStatus: fulfillmentRaw as never } : {}),
        },
      });
    });

    // If admin marks order as PAID, reduce inventory immediately.
    if (prev?.paymentStatus !== "PAID" && paymentStatus === "PAID") {
      // Make sure the order is PAID/PAID in DB (already done above), then reduce inventory.
      const { reduceInventoryAfterPayment } = await import("@/lib/inventory/updateInventory");
      await reduceInventoryAfterPayment(id);
    }
    await logAdminAction({
      userId,
      action: "order.status.update",
      entity: "Order",
      entityId: id,
      metadata: { status, paymentStatus, fulfillmentStatus: fulfillmentOk ? fulfillmentRaw : undefined },
    });
    revalidatePath("/admin/orders");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "עדכון הזמנה נכשל");
  }
}

/** Homepage hero lines (optional); store name uses saveStoreSettings `storeName`. */
export async function saveHomeHero(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const emptyToNull = (v: FormDataEntryValue | null) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };
    await prisma.storeSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        heroTitle_he: emptyToNull(formData.get("heroTitle_he")),
        heroTitle_ar: emptyToNull(formData.get("heroTitle_ar")),
        heroTitle_en: emptyToNull(formData.get("heroTitle_en")),
        heroSubtitle_he: emptyToNull(formData.get("heroSubtitle_he")),
        heroSubtitle_ar: emptyToNull(formData.get("heroSubtitle_ar")),
        heroSubtitle_en: emptyToNull(formData.get("heroSubtitle_en")),
      },
      update: {
        heroTitle_he: emptyToNull(formData.get("heroTitle_he")),
        heroTitle_ar: emptyToNull(formData.get("heroTitle_ar")),
        heroTitle_en: emptyToNull(formData.get("heroTitle_en")),
        heroSubtitle_he: emptyToNull(formData.get("heroSubtitle_he")),
        heroSubtitle_ar: emptyToNull(formData.get("heroSubtitle_ar")),
        heroSubtitle_en: emptyToNull(formData.get("heroSubtitle_en")),
      },
    });
    await logAdminAction({ userId, action: "store.hero.update", entity: "StoreSettings" });
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת תוכן נכשלה");
  }
}
