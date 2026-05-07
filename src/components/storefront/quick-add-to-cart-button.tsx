"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { RelatedProductsModal } from "@/components/storefront/related-products-modal";

type RelatedProduct = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  price: number;
  stock: number;
  image: string | null;
};

export function QuickAddToCartButton({
  product,
  disabled,
}: {
  product: { id: string; title: string; price: number; image: string | null; stock: number };
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const { t } = useStoreI18n();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [related, setRelated] = useState<RelatedProduct[]>([]);

  const click = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/related?productId=${encodeURIComponent(product.id)}`);
      if (!res.ok) {
        addItem(product.id, 1, []);
        return;
      }
      const data = (await res.json()) as { related?: RelatedProduct[] };
      const rel = Array.isArray(data.related) ? data.related : [];
      if (rel.length === 0) {
        addItem(product.id, 1, []);
        return;
      }
      setRelated(rel);
      setOpen(true);
    } catch {
      addItem(product.id, 1, []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void click()}
        className="w-full rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition hover:-translate-y-0.5 hover:shadow-orange-700/40 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400"
      >
        {disabled ? t("outOfStock") : loading ? "טוען…" : t("addToCart")}
      </button>

      {open && (
        <RelatedProductsModal
          open={open}
          onClose={() => setOpen(false)}
          main={{ productId: product.id, qty: 1, optionIds: [], title: product.title }}
          mainDisplay={{ image: product.image, price: product.price }}
          related={related}
        />
      )}
    </>
  );
}

