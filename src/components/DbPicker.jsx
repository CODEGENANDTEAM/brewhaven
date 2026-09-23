// The database switch in the header, shown on every page. It looks like two
// hardware selectors on an instrument panel:
//
//   DATABASE  [● Firebase Firestore] [● CockroachDB] [○ MySQL (Aiven) (not set up)]
//   SAVE TO   [All databases] [Only CockroachDB]
//
// "Database" decides where the shop and My orders READ from.
// "Save to" decides where sign ins and orders are WRITTEN:
//   "all" = every configured database at once (the normal fan-out),
//   "one" = only the database picked in "Database".
//
// Each is a group of real radio buttons, so arrow keys and screen readers work
// as usual. The LED next to each name is its health from /api/health:
// solid = answering, hollow = not set up, blinking = error. A database that
// is not set up can still be picked: the server then falls back to another
// one for reads (and the page says so), and a "Save to: Only" write fails
// with a clear message.

import { DATABASES } from "../lib/format.js";

// Shown after a database's name when it is not working.
const STATE_SUFFIX = { error: "(not answering)", not_configured: "(not set up)" };

// value: the picked database id ("" while we do not know the primary yet).
// saveTo: "all" or "one". health: the /api/health answer or null.
export default function DbPicker({ value, onChange, saveTo, onSaveToChange, health }) {
  const databases = health && Array.isArray(health.databases) ? health.databases : [];
  const stateOf = (id) => {
    const db = databases.find((item) => item.id === id);
    return db ? db.state : "";
  };
  const picked = DATABASES.find((db) => db.id === value);

  return (
    <div className="instruments">
      <div className="selector selector-db">
        <span className="selector-label">
          <span id="db-read-label">Database</span>
          <span className="selector-hint" aria-hidden="true">
            Read ←
          </span>
        </span>
        <div className="selector-options" role="radiogroup" aria-labelledby="db-read-label">
          {DATABASES.map((db) => {
            const state = stateOf(db.id);
            return (
              <label key={db.id} className="selector-option">
                <input
                  type="radio"
                  name="db-read"
                  value={db.id}
                  checked={value === db.id}
                  onChange={() => onChange(db.id)}
                />
                <span className="selector-face">
                  <span className={`led led-${state || "unknown"}`} aria-hidden="true" />
                  <span className="selector-text">
                    {db.label}
                    {STATE_SUFFIX[state] && <span className="selector-suffix"> {STATE_SUFFIX[state]}</span>}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="selector selector-save">
        <span className="selector-label">
          <span id="db-write-label">Save to</span>
          <span className="selector-hint" aria-hidden="true">
            Write →
          </span>
        </span>
        <div className="selector-options" role="radiogroup" aria-labelledby="db-write-label">
          <label className="selector-option">
            <input type="radio" name="db-write" value="all" checked={saveTo === "all"} onChange={() => onSaveToChange("all")} />
            <span className="selector-face">
              <span className="selector-text">All databases</span>
            </span>
          </label>
          <label className="selector-option">
            <input
              type="radio"
              name="db-write"
              value="one"
              checked={saveTo === "one"}
              disabled={!picked}
              onChange={() => onSaveToChange("one")}
            />
            <span className="selector-face">
              <span className="selector-text">Only {picked ? picked.label : "the picked database"}</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
