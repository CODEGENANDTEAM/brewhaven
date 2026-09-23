// One product in the shop, drawn as a "roast ticket": a big index number,
// a roast swatch (beans) or a line drawing (gear), the name, spec rows,
// the price and an "Add to cart" button.
//
// The look (number, swatch, spec rows) comes from lib/productArt.js; the
// name, description and price come from the API.

import { artFor, ROAST_SCALE } from "../lib/productArt.js";
import { formatPrice } from "../lib/format.js";
import Glyph from "./Glyph.jsx";

export default function ProductCard({ product, index, inCart, onAdd }) {
  const art = artFor(product, index);
  const roast = art.roastIndex >= 0 ? ROAST_SCALE[art.roastIndex] : null;
  const titleId = `product-${product.id}`;

  return (
    <article className="ticket" aria-labelledby={titleId} data-reveal style={{ "--i": index % 4 }}>
      <div className="ticket-top">
        <span className="ticket-number" aria-hidden="true">
          {art.number}
        </span>
        <span className="ticket-category">{product.category || "Item"}</span>
      </div>

      <div className="ticket-art">
        <Glyph name={art.glyph} tone={roast ? roast.tone : undefined} />
      </div>

      <h3 id={titleId} className="ticket-name">
        {product.name}
      </h3>
      {product.description && <p className="ticket-description">{product.description}</p>}

      <dl className="ticket-specs">
        {roast && (
          <div className="spec-row">
            <dt>Roast</dt>
            <dd>
              <span className="roast-scale" aria-hidden="true">
                {ROAST_SCALE.map((step, stepIndex) => (
                  <span
                    key={step.id}
                    className={stepIndex === art.roastIndex ? "roast-step is-current" : "roast-step"}
                    style={{ "--tone": step.tone }}
                  />
                ))}
              </span>
              {roast.label}
            </dd>
          </div>
        )}
        {art.specs.map(([label, value]) => (
          <div key={label} className="spec-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="ticket-buy">
        <p className="ticket-price">
          {formatPrice(product.price)}
          {art.unit && <span className="ticket-unit"> / {art.unit}</span>}
        </p>
        <button
          type="button"
          className="button button-fill ticket-add"
          onClick={() => onAdd(product.id)}
        >
          <span>
            {inCart > 0 ? `Add another (${inCart})` : "Add to cart"}
            <span className="sr-only">: {product.name}</span>
          </span>
          <span className="button-arrow" aria-hidden="true">
            +
          </span>
        </button>
      </div>
    </article>
  );
}
