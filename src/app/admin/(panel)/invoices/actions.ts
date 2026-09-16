"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { err, ok, type AdminActionResult } from "@/lib/admin-action-result";
import {
  newRecipientId,
  parseSavedRecipients,
  RECIPIENT_KIND_VALUES,
  type SavedRecipient,
} from "@/lib/invoices/recipients";
import type { Prisma } from "@prisma/client";

async function guard() {
  const session = await requireAdminSession();
  return { storeId: STORE_ID, userId: session.userId };
}

const accountantSchema = z.object({
  accountantName: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  // §17: validate case-insensitively (via z.email regex) but preserve the
  // original casing exactly as entered. Do NOT auto-lowercase.
  accountantEmail: z
    .union([z.string().trim().email(), z.literal("")])
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

/**
 * Save accountant name + email onto the StoreSettings row.
 *
 * The email is validated with zod and normalized to lowercase. A blank email
 * clears the setting (which disables "send to accountant" until re-entered).
 */
export async function saveAccountantSettings(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const parsed = accountantSchema.safeParse({
      accountantName: formData.get("accountantName") ?? undefined,
      accountantEmail: formData.get("accountantEmail") ?? undefined,
    });
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
    }
    const payload = parsed.data;

    await prisma.storeSettings.upsert({
      where: { storeId },
      create: { storeId, ...payload },
      update: payload,
    });

    await logAdminAction({
      userId,
      action: "invoices.accountant.save",
      entity: "StoreSettings",
      metadata: {
        hasEmail: Boolean(payload.accountantEmail),
      },
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/settings");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת פרטי רואה חשבון נכשלה");
  }
}

// ─── Business / legal details for invoice PDFs ───────────────────────────
//
// These live on `StoreSettings` too, and were previously edited from
// /admin/settings. Since we're removing that page from the sidebar, expose
// them directly on /admin/invoices so operators can still keep the invoice
// PDF footer accurate. Purely presentation — no financial impact.
const businessDetailsSchema = z.object({
  businessLegalName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  businessTaxId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  businessWebsite: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function saveBusinessDetails(formData: FormData): Promise<AdminActionResult> {
  try {
    const { storeId, userId } = await guard();
    const parsed = businessDetailsSchema.safeParse({
      businessLegalName: formData.get("businessLegalName") ?? undefined,
      businessTaxId: formData.get("businessTaxId") ?? undefined,
      businessWebsite: formData.get("businessWebsite") ?? undefined,
    });
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
    }
    const payload = parsed.data;
    await prisma.storeSettings.upsert({
      where: { storeId },
      create: { storeId, ...payload },
      update: payload,
    });
    await logAdminAction({
      userId,
      action: "invoices.business.save",
      entity: "StoreSettings",
      metadata: {
        hasLegalName: Boolean(payload.businessLegalName),
        hasTaxId: Boolean(payload.businessTaxId),
      },
    });
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/settings");
    return ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת פרטי העסק נכשלה");
  }
}

// ─── Saved recipients (secondary email addresses) ────────────────────────
const savedRecipientSchema = z.object({
  id: z.string().trim().max(64).optional(),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  kind: z.enum(RECIPIENT_KIND_VALUES).optional().default("other"),
});

/** Add or update a saved recipient. When `id` is present, update in place. */
export async function upsertSavedRecipient(
  formData: FormData,
): Promise<AdminActionResult<{ recipients: SavedRecipient[] }>> {
  try {
    const { storeId, userId } = await guard();
    const parsed = savedRecipientSchema.safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name") ?? "",
      email: formData.get("email") ?? "",
      kind: formData.get("kind") || undefined,
    });
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "פרטי נמען לא תקינים");
    }
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId },
      select: { invoiceRecipients: true },
    });
    const list = parseSavedRecipients(settings?.invoiceRecipients);

    let next: SavedRecipient[];
    if (parsed.data.id) {
      let found = false;
      next = list.map((r) => {
        if (r.id === parsed.data.id) {
          found = true;
          return {
            id: r.id,
            name: parsed.data.name,
            email: parsed.data.email, // preserve casing
            kind: parsed.data.kind,
          };
        }
        return r;
      });
      if (!found) {
        return err("הנמען לא נמצא");
      }
    } else {
      if (list.length >= 20) {
        return err("ניתן לשמור עד 20 נמענים קבועים");
      }
      next = [
        ...list,
        {
          id: newRecipientId(),
          name: parsed.data.name,
          email: parsed.data.email,
          kind: parsed.data.kind,
        },
      ];
    }

    await prisma.storeSettings.upsert({
      where: { storeId },
      create: { storeId, invoiceRecipients: next as unknown as Prisma.InputJsonValue },
      update: { invoiceRecipients: next as unknown as Prisma.InputJsonValue },
    });
    await logAdminAction({
      userId,
      action: parsed.data.id ? "invoices.recipient.update" : "invoices.recipient.add",
      entity: "StoreSettings",
      metadata: { count: next.length },
    });
    revalidatePath("/admin/invoices");
    return ok({ recipients: next });
  } catch (e) {
    return err(e instanceof Error ? e.message : "שמירת נמען נכשלה");
  }
}

export async function deleteSavedRecipient(
  formData: FormData,
): Promise<AdminActionResult<{ recipients: SavedRecipient[] }>> {
  try {
    const { storeId, userId } = await guard();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return err("id חסר");
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId },
      select: { invoiceRecipients: true },
    });
    const list = parseSavedRecipients(settings?.invoiceRecipients);
    const next = list.filter((r) => r.id !== id);
    if (next.length === list.length) return err("הנמען לא נמצא");
    await prisma.storeSettings.update({
      where: { storeId },
      data: { invoiceRecipients: next as unknown as Prisma.InputJsonValue },
    });
    await logAdminAction({
      userId,
      action: "invoices.recipient.delete",
      entity: "StoreSettings",
      metadata: { id, count: next.length },
    });
    revalidatePath("/admin/invoices");
    return ok({ recipients: next });
  } catch (e) {
    return err(e instanceof Error ? e.message : "מחיקת נמען נכשלה");
  }
}
