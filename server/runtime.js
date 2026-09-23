// Glue between the hosting platform and createApi().
// Builds the real API once (checks settings, loads the database adapters) and
// reuses it for later requests while the serverless function stays warm.
//
// Nothing happens at import time, so tests can import this file safely.
// Databases connect even later: on the first request that needs them
// (see getDb() in databases.js), so one broken database never stops the app.

import { createApi, corsHeaders } from "./handlers.js";
import { createFirebaseVerifier } from "./auth.js";
import { CATALOG } from "./catalog.js";
import { createDatabases, loadAdapters, DB_ORDER } from "./databases.js";

// A setup problem we can explain to the person deploying the site.
// Its message only ever names variables, never their values.
export class SetupError extends Error {}

// Needed whatever databases you use: it checks sign in tokens.
// Each database adds its own variables (requiredEnv in src/database/*.js),
// and a database with missing variables is skipped rather than being an error.
const REQUIRED_ENV = ["FIREBASE_PROJECT_ID"];

const HOW_TO_FIX =
  "Add them to .env for local development, or to your Vercel or Netlify environment variables and redeploy.";

// Returns the settings build() needs, or throws a SetupError that explains the fix.
export function checkEnv(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new SetupError(`Missing environment variables: ${missing.join(", ")}. ${HOW_TO_FIX}`);
  }

  // PRIMARY_DB is optional, but a typo should be explained, not silently ignored.
  const primaryId = (env.PRIMARY_DB || "").trim() || "firebase";
  if (!DB_ORDER.includes(primaryId)) {
    throw new SetupError(
      `PRIMARY_DB must be one of: ${DB_ORDER.join(", ")}. Fix it in .env or your Vercel or Netlify environment variables.`
    );
  }
  return { primaryId };
}

export async function build() {
  const { primaryId } = checkEnv();
  const adapters = await loadAdapters();
  const databases = createDatabases(adapters, { catalog: CATALOG });

  for (const entry of databases) {
    if (!entry.configured) {
      console.warn(`${entry.label} is not configured (missing ${entry.missingEnv.join(", ")}), so it is skipped.`);
    }
  }

  return createApi({ databases, verifyIdToken: createFirebaseVerifier(), primaryId });
}

let apiPromise = null;

export function getApi() {
  if (!apiPromise) {
    apiPromise = build().catch((error) => {
      apiPromise = null; // try again on the next request, e.g. after fixing a variable
      throw error;
    });
  }
  return apiPromise;
}

// Tests use this to plug in an API built from fakes. Pass null to reset.
export function setApiForTesting(api) {
  apiPromise = api ? Promise.resolve(api) : null;
}

// The single entry point used by Vercel, Netlify and the local dev server.
export async function handle(request) {
  try {
    const api = await getApi();
    return await api(request);
  } catch (error) {
    // SetupError messages are safe to show. Anything else might contain secrets, so hide it.
    const message =
      error instanceof SetupError
        ? error.message
        : "The server could not start. Check the function logs.";
    if (error instanceof SetupError) console.error(error.message);
    else console.error(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        // The same CORS headers a normal reply would carry. Without them a
        // browser hides this message and shows a CORS error instead, which
        // sends you hunting for the wrong problem.
        ...corsHeaders(request),
      },
    });
  }
}
