// The whole API in one file.
// createApi() takes its helpers as arguments (the databases and the token checker).
// The real app passes real ones (see runtime.js); the tests pass fakes.
// This is called dependency injection.
//
// It uses the web standard Request and Response classes, so the exact same code
// runs on Vercel, on Netlify and in our local dev server.

import crypto from "node:crypto";
import { CATALOG, CURRENCY, findProduct, toPublicProduct } from "./catalog.js";
import { fanOut, readWithFallback } from "./databases.js";
import { validateOrderInput } from "./validate.js";

// An error we are happy to show the user, with the HTTP status code to send.
// `extra` adds more fields to the JSON reply, like the per database results.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// CORS: which websites are allowed to call this API from a browser.
//
// The React site serves the website and the API from one address, so it never
// needs this. A separate static website that calls this API by its full URL
// makes a cross site call, and a browser only shows the reply when the API says
// that website is welcome.
//
// ALLOWED_ORIGINS is an optional comma separated list of website addresses, like
// "https://brew-haven.netlify.app,http://localhost:5500".
// ---------------------------------------------------------------------------

// Splits ALLOWED_ORIGINS into a clean list. A trailing slash is ignored.
function readAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter((value) => value !== "");
}

// Builds the CORS headers for one request.
// Exported so runtime.js can put the same headers on its setup error replies.
export function corsHeaders(request) {
  const allowed = readAllowedOrigins();
  const headers = {};

  if (allowed.length === 0) {
    // Nothing configured, so any website may call the API.
    // That is fine for this workshop because the API trusts the Firebase ID token
    // in the Authorization header and uses no cookies, so another website cannot
    // borrow a visitor's session just by calling us. A real shop would list its
    // own addresses here instead.
    headers["Access-Control-Allow-Origin"] = "*";
  } else {
    // A list is configured, so echo the address back only when it is on the list.
    // When it is not, we send no Access-Control-Allow-Origin header at all and
    // the browser blocks the reply.
    const origin = (request.headers.get("origin") || "").replace(/\/+$/, "");
    if (origin !== "" && allowed.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    // The reply now depends on the Origin header, so caches must keep one copy
    // per website rather than sharing the first one they saw.
    headers["Vary"] = "Origin";
  }

  // A preflight also needs to know which methods and headers are allowed.
  // Max-Age lets the browser remember the answer instead of asking every time.
  if (request.method === "OPTIONS") {
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }

  return headers;
}

// Netlify may call us with /.netlify/functions/api/products, so map that to /api/products.
// Also drop trailing slashes, so /api/products/ works too.
function normalisePath(pathname) {
  let path = pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, "/api");
  path = path.replace(/\/+$/, "");
  return path || "/";
}

// Removes the `data` field from a DbResult, for replies that only need to say
// which databases worked.
function withoutData(result) {
  const { data: _data, ...rest } = result;
  return rest;
}

// The 503 message when no database saved a write. "None set up" and "all down"
// need different fixes, so say which one it is.
function nothingSavedMessage(what, results) {
  // Only one database was asked (?to=) and it is not set up: name it.
  if (results.length === 1 && results[0].state === "not_configured") {
    return `Could not save ${what}: ${results[0].label} is not set up yet. Add its settings to .env (or your host's environment variables) and restart, or save to all databases instead.`;
  }
  if (results.every((result) => result.state === "not_configured")) {
    return `Could not save ${what} to any database: none is set up yet. Add a database's settings to .env (or your host's environment variables) and restart.`;
  }
  return `Could not save ${what} to any database. Check the function logs, then try again.`;
}

// databases:     entries from createDatabases() in databases.js
// verifyIdToken: async (token) => { uid, email, name, photoUrl }, throws if invalid
// primaryId:     the database to read from when the browser does not say (?from=)
export function createApi({ databases, verifyIdToken, primaryId = "firebase" }) {
  const knownIds = databases.map((entry) => entry.id);

  // Reads "Authorization: Bearer <token>" and returns the signed in user.
  async function requireUser(request) {
    const header = request.headers.get("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new HttpError(401, "Sign in to continue.");
    try {
      return await verifyIdToken(match[1].trim());
    } catch (error) {
      // Logged so you can spot problems such as a wrong FIREBASE_PROJECT_ID.
      console.warn("Token check failed:", error.code || error.message);
      throw new HttpError(401, "Your session has expired. Sign in again.");
    }
  }

  async function readJson(request) {
    try {
      return await request.json();
    } catch {
      throw new HttpError(400, "Request body must be JSON.");
    }
  }

  // Which database to read from: ?from=mysql, or the primary one.
  function readSource(url) {
    const from = (url.searchParams.get("from") || "").trim();
    if (from === "") return primaryId;
    if (!knownIds.includes(from)) {
      throw new HttpError(400, `Unknown database "${from}". Use one of: ${knownIds.join(", ")}.`);
    }
    return from;
  }

  // Which databases to WRITE to: ?to=mysql writes only to that one.
  // No ?to= means every database, which is the normal fan-out.
  // Either way the list goes through the same fanOut(), so one database or
  // three are handled by exactly the same code.
  function readTargets(url) {
    const to = (url.searchParams.get("to") || "").trim();
    if (to === "") return databases;
    if (!knownIds.includes(to)) {
      throw new HttpError(400, `Unknown database "${to}". Use one of: ${knownIds.join(", ")}.`);
    }
    return databases.filter((entry) => entry.id === to);
  }

  // Each route is "METHOD /path": handler.
  const routes = {
    // Pings every configured database, so you can see at a glance which ones work.
    "GET /api/health": async () => {
      const results = await fanOut(databases, (db) => db.ping());
      return json({ status: "ok", primary: primaryId, databases: results.map(withoutData) });
    },

    // ?from=cockroachdb reads from that database. If it is down, the next working
    // one answers instead, and `source` tells you which one that was.
    "GET /api/products": async (request, url) => {
      const from = readSource(url);
      const read = await readWithFallback(databases, from, (db) => db.listProducts());
      if (read) return json({ source: read.source, products: read.data });

      // No database answered. The menu is also in the code, so show that
      // instead of an empty shop. You still cannot order until a database is back.
      return json({ source: "catalog", products: CATALOG.map(toPublicProduct) });
    },

    // Called by the browser right after Firebase sign in.
    // Saves (or updates) the user in every database at the same time,
    // or only in the one named by ?to=.
    "POST /api/login": async (request, url) => {
      const user = await requireUser(request);
      const targets = readTargets(url);
      const profile = {
        uid: user.uid,
        email: user.email || null,
        name: user.name || null,
        photoUrl: user.photoUrl || null,
      };

      const results = await fanOut(targets, (db) => db.upsertUser(profile));
      const summary = { uid: profile.uid, email: profile.email, name: profile.name };

      if (!results.some((result) => result.state === "ok")) {
        throw new HttpError(503, nothingSavedMessage("your sign in", results), {
          user: summary,
          results,
        });
      }
      return json({ user: summary, results });
    },

    "POST /api/orders": async (request, url) => {
      const user = await requireUser(request);
      const targets = readTargets(url);
      const { error, value } = validateOrderInput(await readJson(request));
      if (error) throw new HttpError(400, error);

      // Prices ALWAYS come from the catalog. Any price the browser sent is ignored.
      const items = value.items.map(({ productId, quantity }) => {
        const product = findProduct(productId);
        return { productId, name: product.name, unitPrice: product.price, quantity };
      });
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      // The server makes the id, so the same order has the same id in every database.
      const id = crypto.randomUUID();
      const input = {
        id,
        user: { uid: user.uid, email: user.email || null, name: user.name || null },
        items,
        total,
        currency: CURRENCY,
      };

      // This is a "dual write" (here, a triple write): each database saves the
      // order on its own. There is no transaction across databases, so if one
      // is down right now, it will simply be missing this order.
      // With ?to= only that one database gets the order, on purpose.
      const results = await fanOut(targets, (db) => db.createOrder(input));
      const saved = results.find((result) => result.state === "ok");
      if (!saved) {
        throw new HttpError(503, nothingSavedMessage("your order", results), {
          results,
        });
      }

      const order = {
        id,
        userUid: user.uid,
        total,
        currency: CURRENCY,
        status: "placed",
        createdAt: saved.data?.createdAt || new Date().toISOString(),
        items,
      };
      return json({ order, results }, 201);
    },

    // The signed in user's orders, newest first. No catalog fallback here:
    // orders only live in the databases.
    "GET /api/orders": async (request, url) => {
      const user = await requireUser(request);
      const from = readSource(url);
      const read = await readWithFallback(databases, from, (db) => db.listOrdersForUser(user.uid));
      if (!read) throw new HttpError(503, "Could not load your orders from any database. Try again soon.");
      return json({ source: read.source, orders: read.data });
    },
  };

  return async function api(request) {
    // Read ALLOWED_ORIGINS on every request, not once at import time,
    // so tests (and a redeploy) can change it.
    const cors = corsHeaders(request);

    // Every reply gets the CORS headers, errors included. Without them the
    // browser hides the real message behind a confusing CORS complaint.
    function withCors(response) {
      for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
      return response;
    }

    try {
      const url = new URL(request.url);
      const path = normalisePath(url.pathname);

      // Before a real cross site call the browser sends a preflight: an OPTIONS
      // request that asks "may I?". Answer it here, before the normal routing,
      // and without asking for a token. 204 means "yes, and there is no body".
      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }));
      }

      const route = routes[`${request.method} ${path}`];

      if (!route) {
        const knownPath = Object.keys(routes).some((key) => key.endsWith(` ${path}`));
        if (knownPath) throw new HttpError(405, `${request.method} is not allowed on ${path}.`);
        throw new HttpError(404, `No API route at ${path}.`);
      }
      return withCors(await route(request, url));
    } catch (error) {
      // Errors we expect (bad input, not signed in, databases down) carry a status code.
      if (error instanceof HttpError) {
        return withCors(json({ error: error.message, ...error.extra }, error.status));
      }
      // Anything else is a bug or an outage. Log the details, show a safe message.
      console.error(error);
      return withCors(
        json({ error: "Something went wrong on the server. Check the function logs." }, 500)
      );
    }
  };
}
