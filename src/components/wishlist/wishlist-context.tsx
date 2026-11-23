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

import { authClient } from "@/lib/auth-client";
import {
  loadWishlist,
  mergeWishlist,
  setWishlisted,
} from "@/lib/account-actions";

// Signed in: the wishlist lives in the database. Guests: it lives in this
// browser (localStorage) and is merged into the account on sign-in.

const STORAGE_KEY = "atelier-wishlist-v1";

type WishlistContextValue = {
  slugs: string[];
  // True once we know what is saved (local read, or database load).
  ready: boolean;
  signedIn: boolean;
  has: (slug: string) => boolean;
  toggle: (slug: string) => Promise<void>;
  // Last failed save, in words; cleared on the next successful change.
  error: string | null;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readLocal(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((slug): slug is string => typeof slug === "string")
      : [];
  } catch {
    return [];
  }
}

function writeLocal(slugs: string[]) {
  try {
    if (slugs.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Storage unavailable (private mode): the list lasts for this visit only.
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const userId = session.isPending ? undefined : (session.data?.user.id ?? null);

  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which account the in-memory list belongs to ("guest" before sign-in).
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (userId === undefined) return; // session still loading
    const owner = userId ?? "guest";
    if (loadedFor.current === owner) return;
    loadedFor.current = owner;

    if (userId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      setSlugs(readLocal());
      setReady(true);
      return;
    }

    // Signed in: merge what the guest saved, then use the database list.
    let cancelled = false;
    setReady(false);
    const local = readLocal();
    (async () => {
      try {
        const saved = local.length > 0 ? await mergeWishlist(local) : await loadWishlist();
        if (cancelled) return;
        if (saved === null) {
          loadedFor.current = null; // session ended while loading
          return;
        }
        writeLocal([]);
        setSlugs(saved);
        setError(null);
      } catch {
        if (cancelled) return;
        loadedFor.current = null; // retry on the next render of this effect
        setError("We couldn't load your saved items. Please refresh to try again.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const slugsRef = useRef(slugs);
  useEffect(() => {
    slugsRef.current = slugs;
  }, [slugs]);

  const toggle = useCallback(
    async (slug: string) => {
      const was = slugsRef.current.includes(slug);
      const next = was
        ? slugsRef.current.filter((item) => item !== slug)
        : [slug, ...slugsRef.current];
      slugsRef.current = next;
      setSlugs(next);
      setError(null);

      if (!userId) {
        writeLocal(next);
        return;
      }
      try {
        await setWishlisted(slug, !was);
      } catch {
        // Put it back: it was not saved.
        const reverted = was
          ? [slug, ...slugsRef.current]
          : slugsRef.current.filter((item) => item !== slug);
        slugsRef.current = reverted;
        setSlugs(reverted);
        setError("That change wasn't saved. Please try again.");
      }
    },
    [userId],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      slugs,
      ready,
      signedIn: Boolean(userId),
      has: (slug) => slugs.includes(slug),
      toggle,
      error,
    }),
    [slugs, ready, userId, toggle, error],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return context;
}
