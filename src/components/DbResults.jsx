// Shows what happened in EACH database after a write (login or order),
// styled like a lab readout: one numbered row per database with a stamp.
//
// The server writes to all configured databases at the same time and sends
// back one result per database:
//   { id, label, state: "ok" | "error" | "not_configured", error?, missingEnv?, data? }
// Seeing one row per database makes the "fan-out" write visible: you can
// switch one database off and watch the others still succeed.

import { useEffect, useRef } from "react";

function detail(result) {
  if (result.state === "ok") return "Saved";
  if (result.state === "error") return result.error || "Failed";
  // Not configured: say which settings are missing so the learner knows what to add.
  const missing = Array.isArray(result.missingEnv) ? result.missingEnv.join(", ") : "";
  return missing ? `Not configured (missing ${missing})` : "Not configured";
}

// title: e.g. "Saved your login to:".  note: optional extra line under the rows.
export default function DbResults({ title, results, note, error, onClose }) {
  const list = Array.isArray(results) ? results : [];
  const saved = list.filter((result) => result.state === "ok").length;
  const ref = useRef(null);

  // Move focus to the new readout so keyboard and screen reader users land on it.
  useEffect(() => {
    if (ref.current) ref.current.focus({ preventScroll: true });
  }, [title, results]);

  return (
    <section className="readout" aria-live="polite" aria-labelledby="readout-title" ref={ref} tabIndex={-1}>
      <div className="readout-head">
        <p className="readout-kicker">
          Write readout <span aria-hidden="true">·</span> {saved}/{list.length} saved
        </p>
        <h2 id="readout-title" className="readout-title">
          {title}
        </h2>
        {onClose && (
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      {error && <p className="readout-error">{error}</p>}

      <ol className="readout-rows">
        {list.map((result, index) => (
          <li key={result.id} className={`readout-row is-${result.state}`}>
            <span className="readout-index" aria-hidden="true">
              DB/{String(index + 1).padStart(2, "0")}
            </span>
            <span className="readout-label">
              <span className={`led led-${result.state}`} aria-hidden="true" />
              {result.label || result.id}
            </span>
            <span className="readout-stamp">{detail(result)}</span>
          </li>
        ))}
      </ol>

      {note && <p className="readout-note">{note}</p>}
    </section>
  );
}
