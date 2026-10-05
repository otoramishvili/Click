"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/catalog";
import { fromTetri, toTetri } from "@/lib/format";
import { MAX_QUANTITY, type CartUpdate } from "@/lib/orders";

export type CartItem = {
  /* Product ID */
  id: string;
  sku: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  /* False for the first moment, until the saved cart has been read */
  ready: boolean;
  /* Number of units, counting quantities */
  count: number;
  total: number;
  quantityOf: (productId: string) => number;
  add: (product: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /* Brings prices and availability in line with what the server reported */
  applyUpdates: (updates: CartUpdate[]) => void;
};

/* The cart is kept in the browser under this name, so it survives a reload */
const STORAGE_KEY = "cart-v1";

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.sku === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

function readSavedCart(): CartItem[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  /* Read the saved cart once the page is in the browser */
  useEffect(() => {
    setItems(readSavedCart());
    setReady(true);
  }, []);

  /* Save the cart whenever it changes */
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* Storage can be full or blocked. The cart then lasts until the tab closes. */
    }
  }, [items, ready]);

  const add = useCallback((product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
            : item,
        );
      }
      return [
        ...current,
        {
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const safe = Math.max(1, Math.min(MAX_QUANTITY, Math.round(quantity) || 1));
    setItems((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, quantity: safe } : item,
      ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const applyUpdates = useCallback((updates: CartUpdate[]) => {
    setItems((current) =>
      current.flatMap((item) => {
        const update = updates.find((entry) => entry.productId === item.id);
        if (!update) return [item];
        if (!update.available) return [];
        return [{ ...item, price: update.price }];
      }),
    );
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalTetri = items.reduce(
      (sum, item) => sum + toTetri(item.price) * item.quantity,
      0,
    );

    return {
      items,
      ready,
      count,
      total: fromTetri(totalTetri),
      quantityOf: (productId) =>
        items.find((item) => item.id === productId)?.quantity ?? 0,
      add,
      setQuantity,
      remove,
      clear,
      applyUpdates,
    };
  }, [items, ready, add, setQuantity, remove, clear, applyUpdates]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  return cart;
}
