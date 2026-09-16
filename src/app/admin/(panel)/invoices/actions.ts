"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { err, ok, type AdminActionResult } from "@/lib/admin-action-result";

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
  accountantEmail: z
    .union([z.string().trim().email(), z.literal("")])
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim().toLowerCase() : null)),
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
