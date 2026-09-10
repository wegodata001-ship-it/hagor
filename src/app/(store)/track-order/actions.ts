"use server";

import {
  findOrderByNumberAndContact,
  findOrderByTrackingToken,
  type PublicTrackOrderView,
} from "@/lib/order-tracking-access";

export type TrackOrderActionResult =
  | { ok: true; order: PublicTrackOrderView }
  | { ok: false; error: string };

export async function lookupTrackOrderAction(formData: FormData): Promise<TrackOrderActionResult> {
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
    return { ok: false, error: "לא נמצאה הזמנה התואמת לפרטים שהוזנו." };
  }
  return { ok: true, order };
}
