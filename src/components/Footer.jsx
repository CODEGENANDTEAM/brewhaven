// The footer: a status strip with one LED per database, from GET /api/health.
//   green = OK, blinking red = Error, hollow grey = Not configured.
// It also says which database is the primary (the default for reads) and
// where logins and orders are being saved (the header's "Save to"), and ends
// with a big cropped wordmark.

import { sourceLabel } from "../lib/format.js";

const STATE_TEXT = { ok: "OK", error: "Error", not_configured: "Not configured" };

// health: the /api/health answer or null. healthError: text when it failed.
// writeTo: undefined when writes go to every database, or the one database id.
export default function Footer({ health, healthError, onRefresh, writeTo }) {
  const databases = health && Array.isArray(health.databases) ? health.databases : [];

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-block">
          <h2 className="footer-heading">Database health</h2>
          <div className="status-strip" aria-live="polite">
            {!health && !healthError && <p className="status-wait">Checking the databases…</p>}
            {healthError && <p className="status-error">API not reachable: {healthError}</p>}
            {databases.length > 0 && (
              <ul className="status-list">
                {databases.map((db) => (
                  <li
                    key={db.id}
                    className={`status-item is-${db.state}`}
                    title={db.error || (db.missingEnv ? `Missing ${db.missingEnv.join(", ")}` : "")}
                  >
                    <span className={`led led-${db.state}`} aria-hidden="true" />
                    <span className="status-name">
                      {db.label || db.id}
                      {health.primary === db.id && <span className="primary-tag">primary</span>}
                    </span>
                    <span className="status-state">{STATE_TEXT[db.state] || db.state}</span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="link-button" onClick={onRefresh}>
              Refresh
            </button>
          </div>
        </div>

        <div className="footer-block">
          <h2 className="footer-heading">How this shop works</h2>
          <p className="footer-note">
            Brew Haven, a learning project.{" "}
            {writeTo
              ? `Logins and orders are being saved only to ${sourceLabel(writeTo)}`
              : "Every login and order is written to all configured databases"}
            {health && health.primary ? `; reads default to ${sourceLabel(health.primary)}.` : "."}
          </p>
        </div>

        <div className="footer-block">
          <h2 className="footer-heading">Roastery</h2>
          <p className="footer-note">
            Roasted Thursdays in Bengaluru.
            <br />
            Whole bean, 250 g bags, shipped in five days.
          </p>
        </div>
      </div>

      <p className="footer-wordmark" aria-hidden="true">
        Brew Haven
      </p>
      <div className="container footer-small">
        <span>© {new Date().getFullYear()} Brew Haven Roasters</span>
        <span>Firestore · CockroachDB · MySQL</span>
      </div>
    </footer>
  );
}
