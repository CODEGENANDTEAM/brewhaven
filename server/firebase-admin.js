// The Firebase Admin SDK, used on the server to check sign in tokens
// and (in src/database/firebase.js) to read and write Firestore.

import { initializeApp, getApps, cert } from "firebase-admin/app";

export function getAdminApp() {
  // Serverless functions can be reused between requests, so reuse the app if it exists.
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const options = { projectId };

  // Checking sign in tokens only needs the project id.
  // Reading Firestore needs a service account key as well.
  if (clientEmail && privateKey) {
    options.credential = cert({
      projectId,
      clientEmail,
      // Environment variables often store the key with a literal "\n".
      // Turn those back into real line breaks.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  return initializeApp(options);
}
