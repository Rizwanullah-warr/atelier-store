"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { loadSavedBag, mergeBag, saveBag } from "@/lib/account-actions";
import { checkBagStock } from "@/lib/bag-actions";
import { authClient } from "@/lib/auth-client";
import { formatPrice } from "@/lib/product-utils";

// The bag is stored in this browser only (localStorage). The server is asked
// for live stock and prices (validate) and, at checkout, creates the order.

export type CartItem = {
  // One line per variant (colour + size).
  sku: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  color: string;
  size: string | null;
  quantity: number;
  // Stock for this variant at the last check; 0 means unavailable.
  maxQuantity: number;
};

export type StockCheck = "idle" | "checking" | "ok" | "error";

type CartContextValue = {
  items: CartItem[];
  // True once the bag has been read from localStorage.
  ready: boolean;
  // How payments are set up on the server: null means checkout is unavailable.
  paymentMode: "test" | "live" | null;
  // Count and subtotal include available lines only.
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  // Removes every line with one of these SKUs (after they were bought).
  removeItems: (skus: string[]) => void;
  // Live stock check against the database. Resolves true when every line can
  // be bought as-is. Checkout must call this (and re-check on the server).
  validate: () => Promise<boolean>;
  stockCheck: StockCheck;
  // What the last check changed, per SKU, in words for the shopper.
  notices: Record<string, string>;
  // True while the bag is mirrored to the signed-in customer's account.
  savedToAccount: boolean;
  // Set after a sign-in merged this browser's bag into the account bag.
  accountNotice: string | null;
  // Set when the bag could not be saved to / loaded from the account.
  accountError: string | null;
  // Forget this browser's copy (after sign-out) without touching the account bag.
  detach: () => void;
};

// v1 bags had no SKU (stock was per product) and cannot be mapped to variants.
const STORAGE_KEY = "atelier-bag-v2";
// Which account the stored bag mirrors. Absent means a guest bag, which is the
// only kind that gets merged into an account on sign-in (merging a mirror of
// the account's own bag would double every quantity).
const OWNER_KEY = "atelier-bag-owner";

const readOwner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};
const writeOwner = (userId: string | null) => {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Storage unavailable: the next sign-in will merge again, capped at stock.
  }
};
const CartContext = createContext<CartContextValue | null>(null);

const isAvailable = (item: CartItem) => item.maxQuantity > 0;

function readStoredItems(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item?.sku === "string")
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({
  children,
  paymentMode,
}: {
  children: ReactNode;
  paymentMode: CartContextValue["paymentMode"];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stockCheck, setStockCheck] = useState<StockCheck>("idle");
  const [notices, setNotices] = useState<Record<string, string>>({});
  const session = authClient.useSession();
  const userId = session.isPending ? undefined : (session.data?.user.id ?? null);
  const [savedToAccount, setSavedToAccount] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  // The account whose merge already started (never merge twice for one sign-in)
  // and the account whose bag is now in sync (saves are allowed).
  const mergeStartedFor = useRef<string | null>(null);
  const syncedFor = useRef<string | null>(null);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  // Latest items for validate(); addItem also updates it directly.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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

  // On sign-in, combine this browser's bag with the saved one (same variant
  // adds up, capped at stock) and use the result everywhere.
  useEffect(() => {
    if (!loaded || userId === undefined) return;
    if (userId === null) {
      mergeStartedFor.current = null;
      syncedFor.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the session
      setSavedToAccount(false);
      setAccountError(null);
      return;
    }
    if (mergeStartedFor.current === userId) return;
    mergeStartedFor.current = userId;

    const owner = readOwner();
    const guestBag =
      owner === null
        ? itemsRef.current.map(({ sku, quantity }) => ({ sku, quantity }))
        : [];
    // Own mirror (or someone else's leftovers): the account's bag is the truth.
    const task = owner === null ? mergeBag(guestBag) : loadSavedBag();
    task.then(
      (merged) => {
        if (mergeStartedFor.current !== userId) return;
        if (merged === null) {
          // The session ended while loading: stay a guest.
          mergeStartedFor.current = null;
          return;
        }
        syncedFor.current = userId;
        writeOwner(userId);
        setItems(merged);
        itemsRef.current = merged;
        setSavedToAccount(true);
        setAccountError(null);
        setAccountNotice(
          guestBag.length > 0
            ? "The items in this browser's bag were added to your account bag."
            : null,
        );
      },
      () => {
        mergeStartedFor.current = null;
        setAccountError(
          "We couldn't load your account bag. Your bag is only stored in this browser for now.",
        );
      },
    );
  }, [loaded, userId]);

  // Mirror changes to the account (debounced, in order).
  useEffect(() => {
    if (!loaded || !userId || syncedFor.current !== userId) return;
    const timer = setTimeout(() => {
      const lines = items.map(({ sku, quantity }) => ({ sku, quantity }));
      saveChain.current = saveChain.current
        .then(() => saveBag(lines))
        .then(
          () => setAccountError(null),
          () =>
            setAccountError(
              "Your latest bag changes couldn't be saved to your account.",
            ),
        );
    }, 400);
    return () => clearTimeout(timer);
  }, [items, loaded, userId]);

  const detach = useCallback(() => {
    mergeStartedFor.current = null;
    syncedFor.current = null;
    writeOwner(null);
    setSavedToAccount(false);
    setAccountNotice(null);
    setAccountError(null);
    setNotices({});
    itemsRef.current = [];
    setItems([]);
  }, []);

  // Only the most recent check may update the bag: an older, slower response
  // must not overwrite fresher results.
  const latestCheck = useRef(0);

  const validate = useCallback(async () => {
    const checkId = ++latestCheck.current;
    const skus = itemsRef.current.map((item) => item.sku);
    if (skus.length === 0) {
      setNotices({});
      setStockCheck("ok");
      return true;
    }

    setStockCheck("checking");
    let live: Awaited<ReturnType<typeof checkBagStock>>;
    try {
      live = await checkBagStock(skus);
    } catch {
      if (checkId === latestCheck.current) setStockCheck("error");
      return false;
    }
    if (checkId !== latestCheck.current) return false;
    const bySku = new Map(live.map((line) => [line.sku, line]));

    // Work out the corrections from the current bag, then apply them.
    const nextNotices: Record<string, string> = {};
    const corrected = itemsRef.current.map((item) => {
      const current = bySku.get(item.sku);
      if (!current) {
        nextNotices[item.sku] = "This piece is no longer available.";
        return { ...item, maxQuantity: 0 };
      }
      const next = { ...item, maxQuantity: current.stock, name: current.name };
      if (current.stock === 0) {
        nextNotices[item.sku] = "Sold out since you added it.";
      } else if (item.quantity > current.stock) {
        next.quantity = current.stock;
        nextNotices[item.sku] =
          `Only ${current.stock} left, so the quantity was reduced.`;
      }
      if (current.priceCents !== item.priceCents) {
        next.priceCents = current.priceCents;
        nextNotices[item.sku] = [
          nextNotices[item.sku],
          `Price updated to ${formatPrice(current.priceCents)}.`,
        ]
          .filter(Boolean)
          .join(" ");
      }
      return next;
    });

    // Lines added or removed while the check ran are left as they are.
    const correctedBySku = new Map(corrected.map((item) => [item.sku, item]));
    setItems((latest) =>
      latest.map((item) => correctedBySku.get(item.sku) ?? item),
    );
    setNotices(nextNotices);
    setStockCheck("ok");
    return Object.keys(nextNotices).length === 0;
  }, []);

  // Every way of opening the bag re-checks live stock.
  const open = useCallback(() => {
    setIsOpen(true);
    void validate();
  }, [validate]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    (item, quantity) => {
      const current = itemsRef.current;
      const existing = current.find((line) => line.sku === item.sku);
      const next = existing
        ? current.map((line) =>
            line === existing
              ? {
                  ...line,
                  ...item,
                  quantity: Math.min(line.quantity + quantity, item.maxQuantity),
                }
              : line,
          )
        : [...current, { ...item, quantity: Math.min(quantity, item.maxQuantity) }];
      // Update the ref now so the check below includes the new line.
      itemsRef.current = next;
      setItems(next);
      open();
    },
    [open],
  );

  const updateQuantity = useCallback<CartContextValue["updateQuantity"]>(
    (sku, quantity) => {
      setItems((current) =>
        current.map((line) =>
          line.sku === sku
            ? { ...line, quantity: Math.max(1, Math.min(quantity, line.maxQuantity)) }
            : line,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>((sku) => {
    setItems((current) => current.filter((line) => line.sku !== sku));
    setNotices((current) => {
      const next = { ...current };
      delete next[sku];
      return next;
    });
  }, []);

  const removeItems = useCallback<CartContextValue["removeItems"]>((skus) => {
    setItems((current) => current.filter((line) => !skus.includes(line.sku)));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const available = items.filter(isAvailable);
    return {
      items,
      ready: loaded,
      paymentMode,
      count: available.reduce((sum, line) => sum + line.quantity, 0),
      subtotalCents: available.reduce(
        (sum, line) => sum + line.priceCents * line.quantity,
        0,
      ),
      isOpen,
      open,
      close: () => setIsOpen(false),
      addItem,
      updateQuantity,
      removeItem,
      removeItems,
      validate,
      stockCheck,
      notices,
      savedToAccount,
      accountNotice,
      accountError,
      detach,
    };
  }, [
    items,
    loaded,
    paymentMode,
    isOpen,
    open,
    addItem,
    updateQuantity,
    removeItem,
    removeItems,
    validate,
    stockCheck,
    notices,
    savedToAccount,
    accountNotice,
    accountError,
    detach,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
