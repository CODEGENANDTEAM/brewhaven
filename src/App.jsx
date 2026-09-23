// The whole app. There is no router: `view` in state decides whether we show
// the Shop or My orders. This file also owns the things several parts share:
//   - the cart (header count + shop)
//   - signing in (header, cart and orders all have a sign in button)
//   - the "saved to each database" results panel
//   - the database health shown in the footer
//   - the database switch in the header: which database every page reads
//     from, and whether writes go to all databases or only that one

import { useCallback, useEffect, useState } from "react";
import { AuthProvider } from "./auth/AuthContext.jsx";
import DbResults from "./components/DbResults.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import Message from "./components/Message.jsx";
import OrdersView from "./components/OrdersView.jsx";
import SetupNotice from "./components/SetupNotice.jsx";
import ShopView from "./components/ShopView.jsx";
import { getHealth, login } from "./lib/api.js";
import { useCart } from "./lib/cart.js";
import { signIn, signInErrorText } from "./lib/firebase.js";
import { DATABASES } from "./lib/format.js";

// The database choice is remembered in localStorage, so it survives a reload.
// localStorage can throw (private windows, blocked storage), so every use is
// wrapped in try/catch and the app simply forgets the choice instead of breaking.
const DB_KEY = "brewHaven.database";
const SAVE_TO_KEY = "brewHaven.saveTo";

function loadSetting(key, allowed) {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value) ? value : "";
  } catch {
    return "";
  }
}

function saveSetting(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not saved, but the choice still works until the page is reloaded.
  }
}

// The login count comes back inside each database's result as data.loginCount.
// Every database counts on its own, so we take it from the first one that worked.
function loginCountFrom(results) {
  const ok = (results || []).find((result) => result.state === "ok" && result.data);
  return ok ? ok.data.loginCount : null;
}

function Store() {
  const [view, setView] = useState("shop");
  const cart = useCart();
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "info" });
  const [results, setResults] = useState(null); // { title, results, note?, error? } or null
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  // "" = not picked yet, so reads use the server's primary database.
  const [pickedDb, setPickedDb] = useState(() => loadSetting(DB_KEY, DATABASES.map((db) => db.id)));
  const [saveTo, setSaveTo] = useState(() => loadSetting(SAVE_TO_KEY, ["all", "one"]) || "all");
  const [cartOpen, setCartOpen] = useState(false);

  // The database shown as selected: your pick, or else the primary one.
  const primary = health ? health.primary : "";
  const selectedDb = pickedDb || primary;
  const selectedHealth = health && Array.isArray(health.databases)
    ? health.databases.find((db) => db.id === selectedDb)
    : null;
  const selectedState = selectedHealth ? selectedHealth.state : "";
  // Where writes go: undefined = every database, or one id for "Only ...".
  const writeTo = saveTo === "one" && selectedDb ? selectedDb : undefined;

  function pickDb(id) {
    setPickedDb(id);
    saveSetting(DB_KEY, id);
  }

  function pickSaveTo(value) {
    setSaveTo(value);
    saveSetting(SAVE_TO_KEY, value);
  }

  const refreshHealth = useCallback(() => {
    setHealthError("");
    getHealth()
      .then(setHealth)
      .catch((error) => setHealthError(error.message));
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  // Sign in with Google, then tell our API. The API saves the user in every
  // database (or only the picked one, with "Save to: Only"), and we show what
  // each database said.
  async function handleSignIn() {
    setMessage({ text: "" });
    setSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      const text = signInErrorText(error);
      if (text) setMessage({ text, type: "error" });
      setSigningIn(false);
      return;
    }

    try {
      const data = await login({ to: writeTo });
      const count = loginCountFrom(data.results);
      setResults({
        title: "Saved your login to:",
        results: data.results,
        note: count ? `This is login number ${count} for ${(data.user && (data.user.email || data.user.name)) || "you"}.` : "",
      });
    } catch (error) {
      if (error.results) {
        setResults({ title: "Your login was not saved", results: error.results, error: error.message });
      } else {
        setMessage({ text: `Signed in, but the server said: ${error.message}`, type: "error" });
      }
    } finally {
      setSigningIn(false);
      refreshHealth();
    }
  }

  // Called by the shop after "Place order" (success or failure).
  function handleOrderResult(result) {
    setCartOpen(false);
    setResults(result);
    refreshHealth();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigate(nextView) {
    setView(nextView);
    setMessage({ text: "" });
    window.scrollTo({ top: 0 });
  }

  // The cart drawer lives on the Shop, so the header's Cart button goes there first.
  function openCart() {
    if (view !== "shop") navigate("shop");
    setCartOpen(true);
  }

  return (
    <>
      <Header
        view={view}
        onNavigate={navigate}
        cartCount={cart.count}
        onOpenCart={openCart}
        onSignIn={handleSignIn}
        signingIn={signingIn}
        db={{ value: selectedDb, onChange: pickDb, saveTo, onSaveToChange: pickSaveTo, health }}
      />

      <main id="main">
        <div className="container notices">
          <SetupNotice />
          <Message message={message} onClose={() => setMessage({ text: "" })} />
          {results && (
            <DbResults
              title={results.title}
              results={results.results}
              note={results.note}
              error={results.error}
              onClose={() => setResults(null)}
            />
          )}
        </div>

        {view === "shop" ? (
          <ShopView
            cart={cart}
            from={pickedDb}
            selectedDb={selectedDb}
            selectedState={selectedState}
            writeTo={writeTo}
            onResult={handleOrderResult}
            onSignIn={handleSignIn}
            signingIn={signingIn}
            cartOpen={cartOpen}
            onCartOpen={() => setCartOpen(true)}
            onCartClose={() => setCartOpen(false)}
          />
        ) : (
          <OrdersView
            from={pickedDb}
            selectedDb={selectedDb}
            selectedState={selectedState}
            onSignIn={handleSignIn}
            signingIn={signingIn}
            onBrowse={() => navigate("shop")}
          />
        )}
      </main>

      <Footer health={health} healthError={healthError} onRefresh={refreshHealth} writeTo={writeTo} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Store />
    </AuthProvider>
  );
}
