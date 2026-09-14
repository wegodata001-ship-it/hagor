"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-context";

/** Empty cart only after a verified PAID order (not on Hyp redirect). */
export function ClearCartOnPaid({ paid }: { paid: boolean }) {
  const { clear } = useCart();
  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);
  return null;
}
