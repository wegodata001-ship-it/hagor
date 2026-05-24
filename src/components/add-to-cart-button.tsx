"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import type { ProductSelectedOptions } from "@/lib/hagour-product-options";

export function AddToCartButton({
  productId,
  optionIds,
  selectedOptions,
  disabled,
  validationError,
  qty = 1,
}: {
  productId: string;
  optionIds?: string[];
  selectedOptions?: ProductSelectedOptions | null;
  disabled?: boolean;
  validationError?: string | null;
  qty?: number;
}) {
  const { addItem } = useCart();
  const { t } = useStoreI18n();
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const click = () => {
    if (disabled) return;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    addItem(productId, qty, optionIds ?? [], selectedOptions ?? null);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 1400);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={click}
        className="w-full rounded-xl border border-hagor-gold/40 bg-gradient-to-r from-hagor-gold to-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:shadow-orange-700/40 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400"
      >
        {disabled ? t("outOfStock") : t("addToCart")}
      </button>
      {(error || validationError) && !showToast ? (
        <p className="mt-2 text-xs text-red-400">{error ?? validationError}</p>
      ) : null}
      {showToast && (
        <div className="absolute -top-10 right-0 rounded-lg border border-orange-400/40 bg-zinc-900 px-3 py-1 text-xs text-hagor-gold/80">
          {t("addedToCart")}
        </div>
      )}
    </div>
  );
}
