// The cart, drawn as a receipt in a drawer (right side on a laptop, a bottom
// sheet on a phone): one row per product with − / + buttons (1 to 10),
// Remove, the total and "Place order".
//
// It is a native <dialog> opened with showModal(), so the browser handles the
// hard accessibility parts: focus moves into it, Tab stays inside, Esc closes
// it, and focus goes back to the button that opened it.
//
// The total shown here is only a preview. The server works out the real
// price from its own catalog, so nobody can change prices in the browser.

import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { MAX_QUANTITY } from "../lib/cart.js";
import { formatPrice } from "../lib/format.js";

export default function CartPanel({ open, onClose, lines, total, onSetQuantity, onPlaceOrder, placing, onSignIn, signingIn }) {
  const { user } = useAuth();
  const dialogRef = useRef(null);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  const returnTo = useRef(null);

  // Keep the <dialog> in step with the `open` prop. We remember which button
  // opened it and put focus back there on close (or on the header's Cart
  // button if that one is gone).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    if (!open && returnTo.current) {
      const target = document.body.contains(returnTo.current) && returnTo.current !== document.body
        ? returnTo.current
        : document.getElementById("cart-button");
      returnTo.current = null;
      if (target) target.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="drawer"
      aria-labelledby="cart-title"
      onClose={onClose}
      // A click on the dimmed backdrop lands on the <dialog> itself: close.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drawer-inner receipt">
        <div className="receipt-head">
          <h2 id="cart-title" className="receipt-title">
            Your cart
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close cart">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p className="receipt-meta">
          <span>Brew Haven Roasters</span>
          <span>{count === 1 ? "1 item" : `${count} items`}</span>
        </p>

        {lines.length === 0 ? (
          <div className="receipt-empty">
            <p>Your cart is empty. Pick a bag from the roast list.</p>
            <button type="button" className="button button-outline" onClick={onClose}>
              Back to the shop
            </button>
          </div>
        ) : (
          <>
            <ul className="receipt-lines">
              {lines.map(({ product, quantity }) => (
                <li key={product.id} className="receipt-line">
                  <span className="receipt-name">{product.name}</span>
                  <span className="receipt-amount">{formatPrice(product.price * quantity)}</span>
                  <div className="receipt-controls">
                    <span className="receipt-unit">{formatPrice(product.price)} ×</span>
                    <div className="qty" role="group" aria-label={`Quantity of ${product.name}`}>
                      <button
                        type="button"
                        className="qty-button"
                        onClick={() => onSetQuantity(product.id, quantity - 1)}
                        disabled={quantity <= 1}
                        aria-label="One less"
                      >
                        −
                      </button>
                      <span className="qty-value" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className="qty-button"
                        onClick={() => onSetQuantity(product.id, quantity + 1)}
                        disabled={quantity >= MAX_QUANTITY}
                        aria-label="One more"
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="link-button" onClick={() => onSetQuantity(product.id, 0)}>
                      Remove<span className="sr-only"> {product.name}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="receipt-total">
              <span>Total</span>
              <span className="receipt-total-value">{formatPrice(total)}</span>
            </div>
            <p className="receipt-small">Priced again by the server when you order. Max {MAX_QUANTITY} of each.</p>

            {/* Placing an order needs to know who you are, so ask to sign in first. */}
            {user ? (
              <button type="button" className="button button-flame button-block" onClick={onPlaceOrder} disabled={placing}>
                {placing ? "Placing order…" : "Place order"}
              </button>
            ) : (
              <>
                <p className="receipt-small">Sign in to place your order.</p>
                <button type="button" className="button button-flame button-block" onClick={onSignIn} disabled={signingIn}>
                  {signingIn ? "Signing in…" : "Sign in with Google"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
