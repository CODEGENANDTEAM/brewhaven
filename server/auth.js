// Checks the Firebase ID token the browser sends in the Authorization header.

import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebase-admin.js";

export function createFirebaseVerifier() {
  return async (token) => {
    // Throws if the token is fake, expired or from another Firebase project.
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
      photoUrl: decoded.picture || null,
    };
  };
}
