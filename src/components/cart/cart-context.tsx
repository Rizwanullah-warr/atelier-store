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

// The bag is stored in this browser only (localStorage). There is no orders
// backend yet, so nothing here is sent to the server.

export type CartItem = {
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  size: string | null;
  quantity: number;
  // Stock when the item was added; caps the quantity. Re-check on the server at checkout.
  maxQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (slug: string, size: string | null, quantity: number) => void;
  removeItem: (slug: string, size: string | null) => void;
};

const STORAGE_KEY = "atelier-bag-v1";
const CartContext = createContext<CartContextValue | null>(null);

const sameLine = (item: CartItem, slug: string, size: string | null) =>
  item.slug === slug && item.size === size;

function readStoredItems(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load after mount so server and first client render match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setItems(readStoredItems());
    setLoaded(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(readStoredItems());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable (private mode); the bag still works for this visit.
    }
  }, [items, loaded]);

  const addItem = useCallback<CartContextValue["addItem"]>((item, quantity) => {
    setItems((current) => {
      const existing = current.find((line) => sameLine(line, item.slug, item.size));
      if (existing) {
        return current.map((line) =>
          line === existing
            ? {
                ...line,
                ...item,
                quantity: Math.min(line.quantity + quantity, item.maxQuantity),
              }
            : line,
        );
      }
      return [...current, { ...item, quantity: Math.min(quantity, item.maxQuantity) }];
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback<CartContextValue["updateQuantity"]>(
    (slug, size, quantity) => {
      setItems((current) =>
        current.map((line) =>
          sameLine(line, slug, size)
            ? { ...line, quantity: Math.max(1, Math.min(quantity, line.maxQuantity)) }
            : line,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>((slug, size) => {
    setItems((current) => current.filter((line) => !sameLine(line, slug, size)));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, line) => sum + line.quantity, 0),
      subtotalCents: items.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      addItem,
      updateQuantity,
      removeItem,
    }),
    [items, isOpen, addItem, updateQuantity, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
