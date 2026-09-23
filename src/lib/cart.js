// The cart lives in the browser only, until the order is placed.
//
// It is a plain object { productId: quantity } saved in localStorage, so it
// survives a page refresh. localStorage can be missing or blocked (private
// windows, strict privacy settings), so every read and write is wrapped in
// try/catch: the cart then just lasts until the tab closes.

import { useEffect, useState } from "react";

const STORAGE_KEY = "brew-haven-cart";
export const MAX_QUANTITY = 10;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // Keep only sensible entries in case the saved value was edited by hand.
    const cart = {};
    for (const [id, quantity] of Object.entries(saved || {})) {
      if (Number.isInteger(quantity) && quantity >= 1) cart[id] = Math.min(quantity, MAX_QUANTITY);
    }
    return cart;
  } catch {
    return {};
  }
}

// A React hook: const { cart, setQuantity, clear } = useCart();
export function useCart() {
  const [cart, setCart] = useState(loadCart);

  // Save after every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage is blocked: the cart still works for this visit.
    }
  }, [cart]);

  // Quantity 0 removes the line. Anything else is kept between 1 and 10,
  // the same limits the server checks.
  function setQuantity(productId, quantity) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = Math.min(quantity, MAX_QUANTITY);
      return next;
    });
  }

  function add(productId) {
    setCart((current) => ({
      ...current,
      [productId]: Math.min((current[productId] || 0) + 1, MAX_QUANTITY),
    }));
  }

  function clear() {
    setCart({});
  }

  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return { cart, count, add, setQuantity, clear };
}
