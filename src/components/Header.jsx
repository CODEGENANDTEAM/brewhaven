// The top of every page:
//   1. a thin utility strip (lot number, where data is being written),
//   2. the store name, the views (Shop / My orders), the cart button and,
//      top right, either "Sign in with Google" or the signed in user,
//   3. the instrument panel: the database switch (Database + Save to).
//
// There is no router: App.jsx keeps the current view in state and we just
// call onNavigate("shop") or onNavigate("orders").
// App.jsx also owns the database choice, so every page reads from the same one.

import { useAuth } from "../auth/AuthContext.jsx";
import { signOutUser } from "../lib/firebase.js";
import { sourceLabel } from "../lib/format.js";
import DbPicker from "./DbPicker.jsx";

// "LOT 26/09": the year and month, like the lot code stamped on a bag.
function lotCode() {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}/${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// db: { value, onChange, saveTo, onSaveToChange, health }, passed on to DbPicker.
export default function Header({ view, onNavigate, cartCount, onOpenCart, onSignIn, signingIn, db }) {
  const { user, ready } = useAuth();
  const writeTarget = db.saveTo === "one" && db.value ? `Data written to ${sourceLabel(db.value)} only` : "Data written to 3 databases";

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="utility">
        <div className="container utility-inner">
          <span>Lot {lotCode()}</span>
          <span className="hide-sm">Roasted weekly in Bengaluru</span>
          <span>{writeTarget}</span>
        </div>
      </div>

      <div className="container header-main">
        <button type="button" className="brand" onClick={() => onNavigate("shop")} aria-label="Brew Haven, go to the shop">
          <span aria-hidden="true">Brew Haven</span>
          <span className="brand-sub" aria-hidden="true">
            Roast Lab
          </span>
        </button>

        <nav className="nav" aria-label="Main">
          <button
            type="button"
            className="nav-link"
            aria-current={view === "shop" ? "page" : undefined}
            onClick={() => onNavigate("shop")}
          >
            Shop
          </button>
          <button
            type="button"
            className="nav-link"
            aria-current={view === "orders" ? "page" : undefined}
            onClick={() => onNavigate("orders")}
          >
            My orders
          </button>
          <button type="button" id="cart-button" className="nav-link nav-cart" onClick={onOpenCart}>
            Cart
            <span className={cartCount > 0 ? "cart-count is-full" : "cart-count"}>
              <span className="sr-only">, </span>
              {cartCount}
              <span className="sr-only"> {cartCount === 1 ? "item" : "items"}</span>
            </span>
          </button>
        </nav>

        {/* Until Firebase answers we show nothing, so the button does not flicker. */}
        <div className="auth-area">
          {ready && user && (
            <>
              {user.photoURL ? (
                // no-referrer: Google profile pictures sometimes refuse requests that carry a referrer.
                <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="avatar avatar-letter" aria-hidden="true">
                  {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="user-name">{user.displayName || user.email || "Signed in"}</span>
              <button type="button" className="button button-outline button-small" onClick={() => signOutUser()}>
                Sign out
              </button>
            </>
          )}
          {ready && !user && (
            <button type="button" className="button button-fill button-small" onClick={onSignIn} disabled={signingIn}>
              <span>{signingIn ? "Signing in…" : "Sign in with Google"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="instrument-bar">
        <div className="container">
          <DbPicker {...db} />
        </div>
      </div>
    </header>
  );
}
