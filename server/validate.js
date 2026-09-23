// Input checks for POST /api/orders.
// Never trust what the browser sends: anyone can call the API with any body.
// Returns { error: "message" } or { value: cleanedData }.

import { findProduct } from "./catalog.js";

export const MAX_LINES = 20;
export const MAX_QUANTITY = 10;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateOrderInput(body) {
  if (!isObject(body) || !Array.isArray(body.items)) {
    return { error: "Send your cart as { items: [{ productId, quantity }] }." };
  }
  if (body.items.length < 1) {
    return { error: "Your cart is empty. Add something first." };
  }
  if (body.items.length > MAX_LINES) {
    return { error: `An order can have at most ${MAX_LINES} lines.` };
  }

  // Merge duplicate lines, so [{a, 1}, {a, 2}] becomes {a: 3}.
  // A Map keeps the order the items were first added in.
  const quantities = new Map();
  for (const item of body.items) {
    if (!isObject(item)) {
      return { error: "Each item must look like { productId, quantity }." };
    }

    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    if (!productId || !findProduct(productId)) {
      return { error: "One of the products in your cart is not on the menu." };
    }

    // A numeric string like "2" is fine too.
    let quantity = item.quantity;
    if (typeof quantity === "string" && /^\d+$/.test(quantity)) quantity = Number(quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { error: `Quantity must be a whole number from 1 to ${MAX_QUANTITY}.` };
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  for (const [productId, quantity] of quantities) {
    if (quantity > MAX_QUANTITY) {
      return { error: `You can buy at most ${MAX_QUANTITY} of ${findProduct(productId).name}.` };
    }
  }

  // Notice there is no price here. The server always takes prices from the catalog.
  const items = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
  return { value: { items } };
}
