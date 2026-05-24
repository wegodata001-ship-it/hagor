"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProductSelectedOptions } from "@/lib/hagour-product-options";
import { parseSelectedOptions } from "@/lib/hagour-product-options";

export type CartLine = {
  key: string;
  productId: string;
  quantity: number;
  optionIds: string[];
  selectedOptions: ProductSelectedOptions | null;
};

type CartContextValue = {
  items: CartLine[];
  lastAddedAt: number;
  setQuantity: (key: string, quantity: number) => void;
  addItem: (
    productId: string,
    qty?: number,
    optionIds?: string[],
    selectedOptions?: ProductSelectedOptions | null,
  ) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey() {
  const id = process.env.NEXT_PUBLIC_STORE_ID ?? "store";
  return `cart:${id}`;
}

function makeKey(productId: string, optionIds: string[], selectedOptions?: ProductSelectedOptions | null) {
  const uniq = Array.from(new Set(optionIds.map(String))).sort();
  const variantPart = uniq.length ? uniq.join(",") : "";
  const optionsPart = selectedOptions ? JSON.stringify(selectedOptions) : "";
  if (variantPart && optionsPart) return `${productId}:${variantPart}:${optionsPart}`;
  if (variantPart) return `${productId}:${variantPart}`;
  if (optionsPart) return `${productId}::${optionsPart}`;
  return productId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const list = Array.isArray(parsed) ? parsed : [];
        const normalized = list
          .map((l) => {
            if (!l || typeof l !== "object") return null;
            const rec = l as Record<string, unknown>;
            const productId = typeof rec.productId === "string" ? rec.productId : "";
            if (!productId) return null;
            const quantity = typeof rec.quantity === "number" ? rec.quantity : Number(rec.quantity ?? 1);
            const optionIds = Array.isArray(rec.optionIds)
              ? rec.optionIds.filter((x): x is string => typeof x === "string")
              : [];
            const selectedOptions = parseSelectedOptions(rec.selectedOptions);
            const key =
              typeof rec.key === "string"
                ? rec.key
                : makeKey(productId, optionIds, selectedOptions);
            return {
              key,
              productId,
              quantity: Number(quantity) || 1,
              optionIds,
              selectedOptions,
            } satisfies CartLine;
          })
          .filter((x): x is CartLine => x != null);
        setItems(normalized);
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  }, [items]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => {
      const line = prev.find((p) => p.key === key);
      const next = prev.filter((p) => p.key !== key);
      if (quantity > 0 && line) next.push({ ...line, quantity });
      return next;
    });
  }, []);

  const addItem = useCallback(
    (
      productId: string,
      qty = 1,
      optionIds: string[] = [],
      selectedOptions?: ProductSelectedOptions | null,
    ) => {
      setItems((prev) => {
        const key = makeKey(productId, optionIds, selectedOptions);
        const cur = prev.find((p) => p.key === key);
        const q = (cur?.quantity ?? 0) + qty;
        const rest = prev.filter((p) => p.key !== key);
        rest.push({
          key,
          productId,
          quantity: q,
          optionIds: Array.from(new Set(optionIds.map(String))).sort(),
          selectedOptions: selectedOptions ?? null,
        });
        return rest.sort((a, b) => a.key.localeCompare(b.key));
      });
      setLastAddedAt(Date.now());
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, lastAddedAt, setQuantity, addItem, removeItem, clear }),
    [items, lastAddedAt, setQuantity, addItem, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
