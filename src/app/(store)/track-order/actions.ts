"use server";

import { headers } from "next/headers";
import {
  findOrderByNumberAndContact,
  findOrderByTrackingToken,
  type PublicTrackOrderView,
} from "@/lib/order-tracking-access";
import { rateLimit } from "@/lib/rate-limit";

export type TrackOrderActionResult =
  | { ok: true; order: PublicTrackOrderView }
  | { ok: false; error: string };

const GENERIC_MISS = "לא נמצאה הזמנה התואמת לפרטים שהוזנו";
const RATE_LIMITED = "יותר מדי ניסיונות. נסו שוב בעוד דקה.";

export async function lookupTrackOrderAction(formData: FormData): Promise<TrackOrderActionResult> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";

  if (!rateLimit(`track-lookup:${ip}`, 20, 60_000)) {
    return { ok: false, error: RATE_LIMITED };
  }

  const token = String(formData.get("token") ?? "").trim();
  if (token) {
    const order = await findOrderByTrackingToken(token);
    if (!order) return { ok: false, error: "קישור המעקב אינו תקף או שפג תוקפו." };
    return { ok: true, order };
  }

  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const phoneOrEmail = String(formData.get("phoneOrEmail") ?? "").trim();
  if (!orderNumber || !phoneOrEmail) {
    return { ok: false, error: "יש להזין מספר הזמנה וטלפון או אימייל." };
  }

  const order = await findOrderByNumberAndContact({ orderNumber, phoneOrEmail });
  if (!order) {
    return { ok: false, error: GENERIC_MISS };
  }
  return { ok: true, order };
}
