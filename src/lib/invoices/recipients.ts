import "server-only";

import { z } from "zod";

export const RECIPIENT_KIND_VALUES = ["accountant", "bookkeeping", "other"] as const;
export type RecipientKind = (typeof RECIPIENT_KIND_VALUES)[number];

export type SavedRecipient = {
  id: string;
  name: string;
  email: string;
  kind: RecipientKind;
};

const recipientSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  kind: z.enum(RECIPIENT_KIND_VALUES).default("other"),
});

const listSchema = z.array(recipientSchema).max(20);

/** Coerce whatever came out of the JSON column into a well-typed list. */
export function parseSavedRecipients(raw: unknown): SavedRecipient[] {
  if (!raw) return [];
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success) return [];
  // Deduplicate by lowercased email.
  const byEmail = new Map<string, SavedRecipient>();
  for (const r of parsed.data) {
    const key = r.email.toLowerCase();
    if (byEmail.has(key)) continue;
    byEmail.set(key, r);
  }
  return Array.from(byEmail.values());
}

/** Generate a stable, short id for a new recipient. Not cryptographic. */
export function newRecipientId(): string {
  return "r_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
