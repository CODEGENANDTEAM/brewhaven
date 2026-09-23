// The "Shop" view: the hero, a band of tasting notes, the products as roast
// tickets (with category tabs) and the cart drawer.
//
// The products are read from the database picked in the header (Database).
// The API tells us which database they really came from (response.source),
// so we print it, with a warning when that is not the one you picked. If no
// database answers, the server falls back to its built-in catalog and the
// shop still works.

import { useEffect, useRef, useState } from "react";
import { getProducts, placeOrder } from "../lib/api.js";
import { fallbackNote, formatPrice, sourceLabel, shortId } from "../lib/format.js";
import { ROAST_SCALE, TASTING_NOTES } from "../lib/productArt.js";
import { useReveal } from "../lib/useReveal.js";
import CartPanel from "./CartPanel.jsx";
import ProductCard from "./ProductCard.jsx";

const FILTERS = ["All", "Beans", "Brew gear", "Merch"];

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <p className="hero-kicker">
        <span>Small-batch roastery</span>
        <span>Bengaluru, IN</span>
        <span className="hide-sm">Est. 2019</span>
      </p>
      <h1 id="hero-title" className="wordmark">
        Brew Haven
      </h1>
      <div className="hero-grid">
        <p className="manifesto">
          Four coffees a week, roasted Thursday, shipped Friday. Every number that matters is printed on the bag.
        </p>
        <dl className="spec-sheet">
          <div className="spec-row">
            <dt>Origins</dt>
            <dd>Yirgacheffe · Chikmagalur · Malabar</dd>
          </div>
          <div className="spec-row">
            <dt>Roast day</dt>
            <dd>Thursday, 12 kg drum</dd>
          </div>
          <div className="spec-row">
            <dt>Rest</dt>
            <dd>5 days before it ships</dd>
          </div>
          <div className="spec-row">
            <dt>Grind</dt>
            <dd>Whole bean only</dd>
          </div>
          <div className="spec-row spec-row-scale">
            <dt>Scale</dt>
            <dd>
              <ol className="scale-legend">
                {ROAST_SCALE.map((step) => (
                  <li key={step.id} style={{ "--tone": step.tone }}>
                    {step.label}
                  </li>
                ))}
              </ol>
            </dd>
          </div>
        </dl>
      </div>
      <a className="button button-fill hero-cta" href="#shop-title">
        <span>See this week's roast list</span>
        <span className="button-arrow" aria-hidden="true">
          ↓
        </span>
      </a>
    </section>
  );
}

// Two copies of the notes scroll in a loop; the second is hidden from screen readers.
function Marquee() {
  const notes = TASTING_NOTES.map((note) => (
    <span key={note} className="marquee-item">
      {note}
      <span className="marquee-sep" aria-hidden="true" />
    </span>
  ));
  return (
    <div className="marquee" role="region" aria-label="Tasting notes this week">
      <div className="marquee-track">
        <div className="marquee-group">{notes}</div>
        <div className="marquee-group" aria-hidden="true">
          {notes}
        </div>
      </div>
    </div>
  );
}

// cart comes from useCart() in App.jsx.
// from: the picked database id, or "" to let the server use its primary one.
// selectedDb / selectedState: the database shown as selected and its health.
// writeTo: undefined to save the order everywhere, or one database id.
// onResult({ title, results, error }) shows the per-database panel in App.jsx.
// cartOpen / onCartOpen / onCartClose: the cart drawer, owned by App.jsx.
export default function ShopView({
  cart,
  from,
  selectedDb,
  selectedState,
  writeTo,
  onResult,
  onSignIn,
  signingIn,
  cartOpen,
  onCartOpen,
  onCartClose,
}) {
  const [products, setProducts] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump to load again after an error
  const [filter, setFilter] = useState("All");
  const gridRef = useRef(null);

  useEffect(() => {
    // "ignore" stops a slow, old request from overwriting newer state.
    let ignore = false;
    setLoading(true);
    setLoadError("");
    getProducts(from || undefined)
      .then((data) => {
        if (ignore) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setSource(data.source || "");
      })
      .catch((error) => {
        if (!ignore) setLoadError(error.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, from]); // load again when you pick another database

  const visible = filter === "All" ? products : products.filter((product) => product.category === filter);
  useReveal(gridRef, `${filter}:${products.length}`);

  // Join the cart { productId: quantity } with the product details.
  // Products that no longer exist in the shop are simply skipped.
  const lines = products
    .filter((product) => cart.cart[product.id])
    .map((product) => ({ product, quantity: cart.cart[product.id] }));
  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  // The server used another database than the selected one (or its catalog).
  const fellBack = Boolean(selectedDb && source && source !== selectedDb);

  async function handlePlaceOrder() {
    setPlacing(true);
    try {
      // Only ids and quantities go to the server. It looks up the prices.
      const items = lines.map(({ product, quantity }) => ({ productId: product.id, quantity }));
      const data = await placeOrder(items, { to: writeTo });
      cart.clear();
      onResult({ title: `Order ${shortId(data.order && data.order.id)} saved to:`, results: data.results });
    } catch (error) {
      // A 503 still tells us what each database said (error.results).
      // The cart is kept so the order can be tried again.
      onResult({ title: "Your order was not saved", results: error.results, error: error.message });
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <Hero />
      <Marquee />

      <section className="shop container" aria-labelledby="shop-title">
        <div className="shop-top">
          <div className="section-head">
            <p className="section-kicker">
              Shop <span aria-hidden="true">/</span> {products.length ? `${products.length} items` : "Index"}
            </p>
            <h2 id="shop-title" className="section-title" tabIndex={-1}>
              This week's roast list
            </h2>
            {source && !loading && (
              <p className={fellBack ? "source-note source-warning" : "source-note"}>
                <span className={`led led-${fellBack ? "error" : "ok"}`} aria-hidden="true" />
                {fellBack ? (
                  fallbackNote(selectedDb, source, selectedState)
                ) : (
                  <span>
                    Products read from <strong>{sourceLabel(source)}</strong>
                  </span>
                )}
              </p>
            )}
          </div>

          {products.length > 0 && (
            <div className="filters" role="group" aria-label="Filter by category">
              {FILTERS.map((name) => {
                const count = name === "All" ? products.length : products.filter((p) => p.category === name).length;
                return (
                  <button
                    key={name}
                    type="button"
                    className="filter"
                    aria-pressed={filter === name}
                    onClick={() => setFilter(name)}
                  >
                    {name}
                    <span className="filter-count">{String(count).padStart(2, "0")}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading && <p className="loading">Loading the roast list</p>}

        {!loading && loadError && (
          <div className="message message-error" role="alert">
            <span>{loadError}</span>
            <button type="button" className="button button-outline button-small" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && products.length === 0 && (
          <p className="empty-line">Nothing on the roast list yet. The next batch drops Thursday.</p>
        )}

        <div className="ticket-grid" ref={gridRef}>
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              index={products.indexOf(product)}
              inCart={cart.cart[product.id] || 0}
              onAdd={cart.add}
            />
          ))}
        </div>
      </section>

      {/* A cart button that follows you down the page once something is in it. */}
      {cart.count > 0 && (
        <button type="button" className="cart-dock" onClick={onCartOpen}>
          <span className="cart-dock-label">Your cart</span>
          <span className="cart-dock-count">{cart.count}</span>
          <span className="cart-dock-total">{formatPrice(total)}</span>
        </button>
      )}

      <CartPanel
        open={cartOpen}
        onClose={onCartClose}
        lines={lines}
        total={total}
        onSetQuantity={cart.setQuantity}
        onPlaceOrder={handlePlaceOrder}
        placing={placing}
        onSignIn={onSignIn}
        signingIn={signingIn}
      />
    </>
  );
}
