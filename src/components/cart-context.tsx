"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartLine = { productId: string; quantity: number };

type CartContextValue = {
  items: CartLine[];
  lastAddedAt: number;
  setQuantity: (productId: string, quantity: number) => void;
  addItem: (productId: string, qty?: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey() {
  const id = process.env.NEXT_PUBLIC_STORE_ID ?? "store";
  return `cart:${id}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw) setItems(JSON.parse(raw) as CartLine[]);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  }, [items]);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.productId !== productId);
      if (quantity > 0) next.push({ productId, quantity });
      return next;
    });
  }, []);

  const addItem = useCallback((productId: string, qty = 1) => {
    setItems((prev) => {
      const cur = prev.find((p) => p.productId === productId);
      const q = (cur?.quantity ?? 0) + qty;
      const rest = prev.filter((p) => p.productId !== productId);
      rest.push({ productId, quantity: q });
      return rest;
    });
    setLastAddedAt(Date.now());
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
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
