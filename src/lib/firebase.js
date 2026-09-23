// Everything the browser does with Firebase lives in this file: Google sign in.
//
// The browser never talks to a database directly. It only proves who the
// user is (an ID token) and our API does the database work.
//
// The settings come from .env. Vite only puts variables whose names start
// with VITE_ into the browser bundle, so these four are the ONLY settings
// visitors can see. They are public by design: the server checks every
// token, so hiding these values would not protect anything.

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The names of the VITE_ variables that are still empty.
// App.jsx shows this list instead of crashing.
const VARIABLE_NAMES = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  appId: "VITE_FIREBASE_APP_ID",
};
export const missingConfig = Object.entries(VARIABLE_NAMES)
  .filter(([key]) => !firebaseConfig[key] || String(firebaseConfig[key]).includes("YOUR_"))
  .map(([, name]) => name);

const SETUP_MESSAGE = `Firebase is not set up yet. Add ${missingConfig.join(", ")} to .env and restart.`;

// Only start Firebase when the config is complete.
const app = missingConfig.length === 0 ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

function requireFirebase() {
  if (!app) throw new Error(SETUP_MESSAGE);
}

// Opens the Google sign in popup. Resolves with the signed in user.
export async function signIn() {
  requireFirebase();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}

// The ID token proves to our server who the user is.
// It goes in the "Authorization: Bearer <token>" header of API calls.
// Firebase refreshes it for us when it gets old.
export async function getIdToken() {
  const user = auth ? auth.currentUser : null;
  if (!user) throw new Error("Sign in to continue.");
  return user.getIdToken();
}

// Turns Firebase sign in errors into plain sentences.
// Returns "" when the user simply closed the popup (nothing to report).
export function signInErrorText(error) {
  const code = error && error.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign in popup. Allow popups for this site and try again.";
  if (code === "auth/unauthorized-domain") {
    return "This domain is not allowed to sign in yet. Add it in Firebase console > Authentication > Settings > Authorized domains.";
  }
  return (error && error.message) || "Sign in failed. Please try again.";
}
