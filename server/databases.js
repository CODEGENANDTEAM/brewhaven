// Everything about "which databases do we have, and are they working?"
//
// The three adapters in src/database/ all look the same from here (see README.md, "Same UI and logic"):
//   { id, label, requiredEnv, createDb() }
// This file turns them into a list of "entries" the API can use:
//   { id, label, configured, missingEnv, getDb() }
//
// Two ideas matter:
//  1. A database with a missing environment variable is "not configured".
//     We skip it instead of crashing, so the app runs with 1, 2 or 3 databases.
//  2. Connecting and creating tables (init) happens once, on first use, and the
//     result is cached while the serverless function stays warm. If it fails,
//     we forget the failure so the next request tries again.

// The order we fall back in when the database you asked for is not working.
export const DB_ORDER = ["firebase", "cockroachdb", "mysql"];

// Loads the real adapters. It uses import() inside a function, so importing this
// file does not load the database drivers. The tests rely on that: they use
// fake databases and never touch pg, mysql2 or Firestore.
export async function loadAdapters() {
  const modules = await Promise.all([
    import("../src/database/firebase.js"),
    import("../src/database/cockroachdb.js"),
    import("../src/database/mysql.js"),
  ]);
  return modules;
}

// Builds one entry per adapter. `catalog` is the product list every database
// gets a copy of. `env` is process.env in real life and a plain object in tests.
export function createDatabases(adapters, { catalog, env = process.env }) {
  return adapters.map((adapter) => {
    const missingEnv = adapter.requiredEnv.filter((name) => !env[name]);
    let dbPromise = null;

    return {
      id: adapter.id,
      label: adapter.label,
      requiredEnv: adapter.requiredEnv,
      configured: missingEnv.length === 0,
      missingEnv,

      // Returns a ready to use database: created and initialised once, then reused.
      getDb() {
        if (!dbPromise) {
          dbPromise = (async () => {
            const db = adapter.createDb();
            await db.init(catalog); // creates tables if needed and copies the products in
            return db;
          })().catch((error) => {
            dbPromise = null; // try again on the next request, e.g. once the database is back
            throw error;
          });
        }
        return dbPromise;
      },
    };
  });
}

// A short message that is safe to show in the browser.
// Driver errors can contain host names, user names or even a whole connection
// string, so the real error only goes to the logs (console.error).
function safeError(entry) {
  return `Could not reach ${entry.label}. Check ${entry.requiredEnv.join(" and ")} and the function logs.`;
}

// Runs fn(db) on one database and describes what happened as a DbResult:
//   { id, label, state: "ok" | "error" | "not_configured", data?, error?, missingEnv? }
// It never throws, so one broken database cannot break the others.
export async function runOn(entry, fn) {
  const base = { id: entry.id, label: entry.label };
  if (!entry.configured) {
    return { ...base, state: "not_configured", missingEnv: entry.missingEnv };
  }
  try {
    const db = await entry.getDb();
    const data = await fn(db);
    return data === undefined ? { ...base, state: "ok" } : { ...base, state: "ok", data };
  } catch (error) {
    console.error(`[${entry.id}]`, error);
    return { ...base, state: "error", error: safeError(entry) };
  }
}

// "Fan out": run fn on every database at the same time and wait for all of them.
// Promise.allSettled waits for every promise, even when some fail, unlike
// Promise.all which gives up at the first failure.
export async function fanOut(entries, fn) {
  const settled = await Promise.allSettled(entries.map((entry) => runOn(entry, fn)));
  return settled.map((outcome, index) =>
    outcome.status === "fulfilled"
      ? outcome.value
      : { id: entries[index].id, label: entries[index].label, state: "error", error: safeError(entries[index]) }
  );
}

// The order to try databases in for a read: the one you asked for first,
// then the others in the fixed DB_ORDER.
export function readOrder(entries, fromId) {
  const rank = (entry) => (entry.id === fromId ? -1 : DB_ORDER.indexOf(entry.id));
  return [...entries].sort((a, b) => rank(a) - rank(b));
}

// Reads from one database, falling back to the next working one.
// Returns { source, data } or null when no database could answer.
export async function readWithFallback(entries, fromId, fn) {
  for (const entry of readOrder(entries, fromId)) {
    if (!entry.configured) continue;
    const result = await runOn(entry, fn);
    if (result.state === "ok") return { source: entry.id, data: result.data };
    console.warn(`Reading from ${entry.label} failed, trying the next database.`);
  }
  return null;
}
