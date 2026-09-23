// The "My orders" view: the signed in user's orders as a ledger, read from
// ONE database, the one picked in the header (Database).
//
// Pick a different database and the same orders (with the same ids) should
// appear, because by default every order is written to all of them. (An order
// placed with "Save to: Only ..." is only in that one database.) If the
// database you picked is down or not configured, the server falls back to
// another one and we say so, because then you are NOT looking at the one you picked.

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { getMyOrders } from "../lib/api.js";
import { fallbackNote, formatDate, formatPrice, shortId, sourceLabel } from "../lib/format.js";

function PageHead({ children }) {
  return (
    <div className="page-head">
      <p className="section-kicker">Ledger</p>
      <h1 id="orders-title" className="page-title">
        My orders
      </h1>
      {children}
    </div>
  );
}

// from: the picked database id, or "" to let the server use its primary one.
// selectedDb / selectedState: the database shown as selected and its health.
// onBrowse: go back to the shop.
export default function OrdersView({ from, selectedDb, selectedState, onSignIn, signingIn, onBrowse }) {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const uid = user ? user.uid : null;

  useEffect(() => {
    if (!uid) return undefined;
    let ignore = false; // drop answers from older requests
    setLoading(true);
    setError("");
    getMyOrders(from || undefined)
      .then((data) => {
        if (ignore) return;
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setSource(data.source || "");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message);
        setOrders([]);
        setSource("");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [uid, from]);

  if (!ready) {
    return (
      <section className="container orders" aria-labelledby="orders-title">
        <PageHead>
          <p className="loading">Checking who is signed in</p>
        </PageHead>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container orders" aria-labelledby="orders-title">
        <PageHead>
          <div className="empty-state">
            <p>Sign in to see the orders you have placed, read back from whichever database you pick.</p>
            <button type="button" className="button button-flame" onClick={onSignIn} disabled={signingIn}>
              {signingIn ? "Signing in…" : "Sign in with Google"}
            </button>
          </div>
        </PageHead>
      </section>
    );
  }

  // The server used another database than the selected one.
  const fellBack = Boolean(selectedDb && source && source !== selectedDb);

  return (
    <section className="container orders" aria-labelledby="orders-title">
      <PageHead>
        {source && !loading && (
          <p className={fellBack ? "source-note source-warning" : "source-note"}>
            <span className={`led led-${fellBack ? "error" : "ok"}`} aria-hidden="true" />
            <span>{fellBack ? fallbackNote(selectedDb, source, selectedState) : `Orders read from ${sourceLabel(source)}.`}</span>
          </p>
        )}
      </PageHead>

      {loading && <p className="loading">Loading your orders</p>}
      {!loading && error && (
        <div className="message message-error" role="alert">
          <span className="message-tag">Error</span>
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <p>No orders yet. Your first bag is on the roast list.</p>
          <button type="button" className="button button-outline" onClick={onBrowse}>
            Go to the Shop
          </button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="ledger">
          <div className="ledger-head" aria-hidden="true">
            <span>Order</span>
            <span>Date</span>
            <span>Items</span>
            <span>Status</span>
            <span className="ledger-right">Total</span>
          </div>
          <ol className="ledger-list">
            {orders.map((order) => (
              <li key={order.id} className="ledger-entry">
                <article aria-label={`Order ${shortId(order.id)}`}>
                  <div className="ledger-row">
                    <span className="ledger-order">
                      <span className="ledger-cell-label">Order </span>
                      {shortId(order.id)}
                    </span>
                    <span className="ledger-date">{formatDate(order.createdAt)}</span>
                    <ul className="ledger-items">
                      {(order.items || []).map((item) => (
                        <li key={item.productId}>
                          <span>
                            {item.quantity} × {item.name}
                          </span>
                          <span className="ledger-item-price">{formatPrice(item.unitPrice * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="ledger-status">{order.status || "placed"}</span>
                    <span className="ledger-total">{formatPrice(order.total)}</span>
                  </div>
                  {/* The full id, so you can find the same order in each database's console. */}
                  <p className="ledger-id">
                    <span className="ledger-cell-label">Order id</span>
                    <code>{order.id}</code>
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
