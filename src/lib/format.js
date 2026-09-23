// Small formatting helpers shared by the components.

// The three databases, in the order we show them.
// The ids match the adapter files in src/database/ and the API's ?from= value.
export const DATABASES = [
  { id: "firebase", label: "Firebase Firestore" },
  { id: "cockroachdb", label: "CockroachDB" },
  { id: "mysql", label: "MySQL (Aiven)" },
];

// "mysql" becomes "MySQL (Aiven)". "catalog" means the server used its
// built-in product list because no database answered.
export function sourceLabel(id) {
  if (id === "catalog") return "the built-in catalog";
  const db = DATABASES.find((item) => item.id === id);
  return db ? db.label : String(id || "unknown");
}

// The line shown when the server read from a different database than the one
// you picked, because yours is not set up or did not answer.
// wanted: the picked id. source: the id the server used. state: the picked
// database's health state ("ok", "error", "not_configured") if we know it.
export function fallbackNote(wanted, source, state) {
  const why = state === "not_configured" ? "is not set up" : "did not answer";
  return `${sourceLabel(wanted)} ${why}, so this is showing ${sourceLabel(source)} instead.`;
}

// Prices are whole numbers of paise (100 paise = 1 rupee), which avoids
// rounding errors. 79900 becomes "₹799" and 14950 becomes "₹149.50".
export function formatPrice(paise) {
  const rupees = Number(paise || 0) / 100;
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

// "2026-09-22T10:30:00Z" becomes something like "22 Sept 2026, 4:00 pm".
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// Long ids are hard to read, so we show the first 8 characters in capitals.
// The full id is the same in every database, so this short one is too.
export function shortId(id) {
  return String(id || "").slice(0, 8).toUpperCase();
}
