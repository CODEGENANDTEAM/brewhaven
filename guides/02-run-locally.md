# 02. Run it on your laptop

**Goal:** the shop runs at `http://localhost:5173`, you sign in with Google, and you place an order that is saved to Firestore.

You only have Firebase so far. That is fine: CockroachDB and MySQL show as **not set up** and are skipped. You add them in guides 03 and 04.

## Two rules before you start

* Always open **`http://localhost:5173`**, never `http://127.0.0.1:5173`. Firebase allows Google sign in on `localhost` only. `127.0.0.1` counts as a different domain and sign in fails.
* **Changed `.env`? Restart.** Stop the server with `Ctrl + C`, then run `npm run dev` again. The server reads `.env` only when it starts.

## Steps

1. In the terminal, inside the project folder (`brewhaven`):

   ```bash
   npm run dev
   ```

   Vite prints `Local: http://localhost:5173/`. Leave this terminal open. It is also where server errors appear.

2. Open [http://localhost:5173/api/health](http://localhost:5173/api/health). You should see something like:

   ```json
   {
     "status": "ok",
     "primary": "firebase",
     "databases": [
       { "id": "firebase", "label": "Firebase Firestore", "state": "ok" },
       { "id": "cockroachdb", "label": "CockroachDB", "state": "not_configured", "missingEnv": ["COCKROACH_DATABASE_URL"] },
       { "id": "mysql", "label": "MySQL (Aiven)", "state": "not_configured", "missingEnv": ["MYSQL_DATABASE_URL"] }
     ]
   }
   ```

   Firebase must say `"ok"`. The other two say `"not_configured"` for now.

3. Open [http://localhost:5173](http://localhost:5173). You should see:
   * the heading **Fresh coffee, brewed your way** and eight products,
   * in the header: **Shop**, **My orders**, the **Database** switch and the **Save to** switch,
   * at the bottom, under **Database health**: one light per database (green **OK**, hollow grey **Not configured**, blinking red **Error**).

4. Click **Sign in with Google** (top right) and pick your account in the popup.
5. A panel appears at the top: **Saved your login to:** with one row per database.
   * **Firebase Firestore:** ✓ **Saved**
   * **CockroachDB** and **MySQL (Aiven):** – **Not configured (missing ...)**

   Under the rows it says **This is login number 1 for you@example.com.**
6. Click **Sign out**, then **Sign in with Google** again. The login number goes up to 2.
7. On a product, click **Add to cart**. Add one or two more. Click **Cart** in the header (or the **Your cart** bar at the bottom of the screen) to open **Your cart**, and use **+** and **−** to change amounts.
8. Click **Place order**. The panel now says **Order XXXXXXXX saved to:** (the first 8 characters of the order id), with one row per database.
9. Click **My orders** in the header. Your order is there, with its full id on the **Order id** line under it and the line **Orders read from Firebase Firestore.**

## What just happened

The browser never talked to a database. It sent your Google ID token to `/api/login` and `/api/orders`. The API checked the token, took prices from its own catalog (never from the browser), and wrote to every database that is set up. The results panel shows what each database answered.

## ✅ Check

* `/api/health` shows Firebase `"ok"`.
* You signed in, and the panel shows **Saved** for **Firebase Firestore**.
* You placed an order, and it shows under **My orders**.
* Bonus: in the Firebase console, **Firestore Database > Data** now has `users`, `products` and `orders` collections.

## If it fails

* **`Missing script: "dev"`:** you are in the wrong folder. `cd` into the project folder (`brewhaven`).
* **Vite says `Port 5173 is in use, trying another one`:** another `npm run dev` is still running. Close it, or use the port Vite prints (still `localhost`).
* **A striped notice says `Sign in is not set up yet`:** a `VITE_FIREBASE_...` value is missing. Fill it in, save, restart `npm run dev`.
* **"This domain is not allowed to sign in yet."** locally: you opened `127.0.0.1`. Use `http://localhost:5173`.
* **"Your browser blocked the sign in popup."**: allow popups for `localhost` (icon at the right of the address bar) and click again.
* **"Your session has expired. Sign in again."** right after signing in: `FIREBASE_PROJECT_ID` and `VITE_FIREBASE_PROJECT_ID` are different. Make them match and restart.
* **Firebase row says `Could not reach Firebase Firestore`:** stop the server, run `npm run check`, read the hint, fix, restart.
* **You changed `.env` and nothing changed:** restart `npm run dev`.
* More: [08-troubleshooting.md](08-troubleshooting.md).

Next: [03-cockroachdb.md](03-cockroachdb.md)
