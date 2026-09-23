// Keeps track of who is signed in and shares it with every component.
//
// Any component can call useAuth() to get:
//   user:  the signed in Firebase user, or null
//   ready: false until Firebase has told us whether someone is signed in

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase.js";

const AuthContext = createContext({ user: null, ready: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!auth); // without Firebase there is nothing to wait for

  useEffect(() => {
    if (!auth) return undefined;
    // Runs now and every time the user signs in or out.
    // Returning the unsubscribe function stops listening when the provider goes away.
    return onAuthStateChanged(auth, (newUser) => {
      setUser(newUser);
      setReady(true);
    });
  }, []);

  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
