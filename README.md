> **Attending the workshop? Start at [guides/00-start-here.md](guides/00-start-here.md).**

# Brew Haven

A small coffee shop web app that saves everything to **three databases at the same time**: Firebase Firestore, CockroachDB and MySQL (on Aiven). You sign in with Google, browse eight coffees and brewing gadgets, and place an order. Every sign in and every order is written to all three databases, and a **Database** switch in the header lets you read the data back from whichever one you pick (and, with **Save to**, write to just that one).

The point is to compare databases side by side. The shop, its screens and its rules are written once. The only thing that changes per database is one small file.

This guide goes from nothing to a live site, click by click. Go in order. Each part ends with a **Check:** so you know it worked before moving on.

Contents

1. [How it works](#1-how-it-works)
2. [The golden rule for secrets](#2-the-golden-rule-for-secrets)
3. [Firebase: sign in and the first database](#3-firebase-sign-in-and-the-first-database)
4. [CockroachDB Cloud: the second database](#4-cockroachdb-cloud-the-second-database)
5. [MySQL on Aiven: the third database](#5-mysql-on-aiven-the-third-database)
6. [Run it on your laptop](#6-run-it-on-your-laptop)
7. [Tests](#7-tests)
8. [Go live on Vercel or Netlify](#8-go-live-on-vercel-or-netlify)
9. [Troubleshooting](#9-troubleshooting)
10. [Project layout](#10-project-layout)

You need **Node 22.12 or newer** (`node -v` to check; get it from [nodejs.org](https://nodejs.org)) and a GitHub account.

---

## 1. How it works

```mermaid
flowchart LR
    B[Browser<br/>React app] -- Google sign in --> FA[Firebase Auth]
    B -- "fetch /api/... with ID token" --> API["/api functions<br/>(Vercel, Netlify or Vite locally)"]
    API --> H["server/handlers.js<br/>shared logic: checks, prices"]
    H --> F{"fan-out<br/>server/databases.js"}
    F --> A1[src/database/firebase.js]
    F --> A2[src/database/cockroachdb.js]
    F --> A3[src/database/mysql.js]
    A1 --> D1[(Firestore)]
    A2 --> D2[(CockroachDB Cloud)]
    A3 --> D3[(MySQL on Aiven)]
```

* The **browser** only talks to two things: Firebase Auth (for the Google sign in popup) and our own `/api`. It never talks to a database directly.
* The **API** checks your sign in token, checks the order (prices always come from `server/catalog.js`, never from the browser), and then hands the work to the databases.
* **Fan-out:** a write (sign in, new order) is sent to every configured database **at the same time**. A read comes from one database: the one you pick in the **Database** switch at the top of every page (it starts on `PRIMARY_DB`). Both the product list and **My orders** read from it, using `?from=` on the API.
* **Save to:** next to **Database**, **Save to** is **All databases** (the fan-out, the default) or **Only** the picked database. "Only" adds `?to=<id>` to `POST /api/login` and `POST /api/orders`, so the write goes to that one database and the results panel shows just that row. It is a handy way to create drift on purpose: save an order only to MySQL, then switch **Database** to CockroachDB and it is not there. Both choices are remembered in your browser.

### Same UI and logic, only the adapter differs

Each database has one **adapter** file in `src/database/`. All three export the same things:

| Export | What it is |
|---|---|
| `id`, `label` | `"firebase"` / `"Firebase Firestore"`, `"cockroachdb"` / `"CockroachDB"`, `"mysql"` / `"MySQL (Aiven)"` |
| `requiredEnv` | The environment variables it needs. If any is missing, the database is **not configured** and is skipped |
| `createDb()` | Returns an object with `init(products)`, `ping()`, `upsertUser(user)`, `listProducts()`, `createOrder(order)` and `listOrdersForUser(uid)` |

The rest of the app only calls those six functions, so it does not know or care which database is underneath. Open two adapters side by side to see the difference: SQL tables with a join for `order_items` in CockroachDB and MySQL, versus one Firestore document per order with the items embedded.

`init()` creates the tables if they are missing and copies the catalog into the `products` table. It runs by itself the first time the API starts, so there is **no schema to paste anywhere**.

Order ids are made by the server (`crypto.randomUUID()`), so **the same order has the same id in all three databases**.

### The dual write caveat

Writing to three databases "at the same time" is a **dual write** (here, a triple write). There is **no distributed transaction** across them. Inside each database the order and its items are saved together or not at all, but across databases nothing ties them together. If MySQL is powered off while you place an order, the order is saved in Firestore and CockroachDB and missing from MySQL, and nothing goes back to fix it later. The databases have **drifted**.

The app is honest about it: the results panel at the top of the page ("Saved your login to:" or "Order ... saved to:") shows, per database it wrote to, whether the write worked. An order counts as placed if at least one database saved it. Real systems solve this with things like an outbox table or change data capture. For learning, seeing the drift is the lesson.

---

## 2. The golden rule for secrets

**Nothing secret ever goes into GitHub.** Not in code, not in a commit message, not "just for a minute". Bots scan GitHub for keys all day, and a pushed key stays in the Git history even after you delete the file.

* **Secrets** let someone act as you: the Firebase private key and the two database URLs (they contain passwords). They live only in `.env` on your laptop and in the environment variables of Vercel or Netlify.
* **Public config** is sent to every visitor anyway. The four `VITE_FIREBASE_...` values are public by design.
* `.env` is listed in `.gitignore`. `.env.example` is safe to commit because it has no real values.
* **Only `VITE_` variables reach the browser.** Vite copies every variable whose name starts with `VITE_` into the JavaScript visitors download. **Never put `VITE_` in front of a secret.**

| Variable | Secret? | Where to get it |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | No, public | Firebase web app config (part 3) |
| `FIREBASE_PROJECT_ID` | No, **required** | Firebase Project settings (part 3) |
| `FIREBASE_CLIENT_EMAIL` | Not on its own | Service account JSON (part 3) |
| `FIREBASE_PRIVATE_KEY` | **Yes** | Service account JSON (part 3) |
| `COCKROACH_DATABASE_URL` | **Yes** | CockroachDB Connect dialog (part 4) |
| `COCKROACH_CA_CERT` | No, optional | Only if needed (part 4) |
| `MYSQL_DATABASE_URL` | **Yes** | Aiven Service URI (part 5) |
| `MYSQL_CA_CERT` | No, optional but recommended | Aiven CA certificate (part 5) |
| `PRIMARY_DB` | No, optional | You choose: `firebase` (default), `cockroachdb` or `mysql` |
| `ALLOWED_ORIGINS` | No, optional | You write it: a comma separated list of sites allowed to call the API. Leave empty |

**Check:** you know which of your values are secrets, and that they only ever go in `.env` or the host's settings.

---

## 3. Firebase: sign in and the first database

Firebase does two jobs here: **Google sign in** for everyone, and **Firestore**, the first of the three databases.

**Create the project**

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it, for example `brew-haven`. Firebase shows the **project ID** under the name (like `brew-haven-1a2b3`). Note it down.
4. Google Analytics and the AI assistant are not needed; switch them off. Click through to **Create project**, then **Continue**.

**Switch on Google sign in**

5. In the left menu, open **Build > Authentication** (it may be under **Security** in newer layouts) and click **Get started**.
6. Open the **Sign-in method** tab, click **Google**, switch **Enable** on.
7. Choose your email as the **Project support email** and click **Save**.

**Create the Firestore database**

8. Open **Build > Firestore Database** and click **Create database**.
9. If it asks for an edition, choose **Standard**.
10. For **Location**, choose **nam5 (United States)**. It can never be changed later, and it is close to where the free Vercel and Netlify functions run.
11. Choose **Start in production mode** and click **Create**.
12. When it is ready, open the **Rules** tab, delete everything in the editor, paste this, and click **Publish**:

    ```
    rules_version = '2';

    // Brew Haven: the browser never reads or writes Firestore directly.
    // Only the server does, with the service account, and the Admin SDK
    // ignores these rules. So everything is closed to the browser.
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if false;
        }
      }
    }
    ```

**Register the web app and copy 4 values**

13. Click the gear icon next to **Project Overview**, then **Project settings**.
14. On the **General** tab, scroll to **Your apps** and click the web icon `</>`.
15. Give it a nickname (for example `brew-haven-web`). Leave Firebase Hosting unticked. Click **Register app**.
16. Firebase shows `const firebaseConfig = { ... }`. Copy four values into `.env` (part 6):

    | In the snippet | In `.env` |
    |---|---|
    | `apiKey` | `VITE_FIREBASE_API_KEY` |
    | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
    | `projectId` | `VITE_FIREBASE_PROJECT_ID` **and** `FIREBASE_PROJECT_ID` |
    | `appId` | `VITE_FIREBASE_APP_ID` |

    You can always find them again in **Project settings > General > Your apps**.

**Service account key (so the server can write to Firestore)**

17. **Project settings**, **Service accounts** tab. Make sure **Node.js** is selected and click **Generate new private key**, then **Generate key**. A JSON file downloads.
18. The easy way: in the project folder run `npm run setup:firebase -- --delete`. It finds the newest key file for your project in **Downloads**, writes `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` into `.env` in the right format, and deletes the JSON file. It never prints the key. (Key somewhere else? `npm run setup:firebase -- C:\path\to\key.json --delete`.)
19. By hand instead: open the JSON in a text editor, copy `client_email` into `FIREBASE_CLIENT_EMAIL` and `private_key` into `FIREBASE_PRIVATE_KEY`, then **delete the JSON file** (and empty the recycle bin). Never leave it in the repo folder.

Then run `npm run check`. It connects to every database in `.env` and prints the real error with a hint if one fails. Run it again after each database you add (parts 4 and 5).

If you fill it in by hand: the private key is long and has line breaks written as `\n`. Keep every `\n` exactly as it is, and wrap the whole value in double quotes in `.env`:

```
FIREBASE_PROJECT_ID=brew-haven-1a2b3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc12@brew-haven-1a2b3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

On Vercel or Netlify you paste the value itself into the value box, with `\n` sequences or real line breaks; both work.

**Authorized domains.** Google sign in only works on domains Firebase knows. `localhost` is allowed out of the box. When you deploy (part 8) you add your live domain in **Authentication > Settings > Authorized domains**.

**Check:** Authentication shows Google as **Enabled**, the Firestore **Rules** tab shows `allow read, write: if false;`, you have the four web values, and the JSON file is deleted.

---

## 4. CockroachDB Cloud: the second database

**What it is:** CockroachDB is a **distributed SQL** database. Your data is copied across several machines, so it keeps working when one fails. It speaks the PostgreSQL protocol, so the adapter uses the ordinary `pg` driver.

**About the price.** At the time of writing (September 2026), CockroachDB Cloud gives every organization a **free monthly allowance on the Basic plan** (50 million request units and 10 GiB of storage across all Basic clusters), and one Basic cluster can be created without a card. New organizations also get **trial credits** (recently $400 for 30 days). This app uses a tiny fraction of the free allowance. Offers change, so check the current offer on the signup page.

**Create the cluster**

1. Sign up at [cockroachlabs.cloud](https://cockroachlabs.cloud) (Google or GitHub sign up is fine).
2. Click **Create cluster**.
3. Choose the **Basic** plan.
4. **Cloud provider:** AWS or GCP. **Region:** pick one in **US East**, for example AWS `us-east-1` (N. Virginia). You cannot remove a region later, so pick one.
5. **Capacity:** if asked, keep the free option or set a **spend limit of $0** so you can never be charged.
6. **Cluster name:** for example `brew-haven` (6 to 20 characters, lowercase letters, numbers and dashes). Click **Create cluster** and wait a few seconds until it is ready.

**Check:** the **Clusters** page lists your cluster as **Available** (or Ready), in a US East region.

**Create a SQL user**

7. Open the cluster and click **Connect** (top right). If you have no SQL user yet, the dialog offers to create one: click **Create user** (or go to **Security > SQL Users > Add user**).
8. Type a username, for example `brewadmin`, and click **Generate & save password**.
9. **Copy the password now.** It is shown **only once**. If you lose it, a cluster admin can set a new one on the **SQL Users** page.

**Get the connection string**

10. Still in the **Connect** dialog: choose your **SQL user**, the database **`defaultdb`**, and under **Select option / Language** pick **General connection string**.
11. Copy the string. It looks like:

    ```
    postgresql://brewadmin:AbCdEf123456@brew-haven-1234.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
    ```

12. Put it in `.env`:

    ```
    COCKROACH_DATABASE_URL=postgresql://brewadmin:AbCdEf123456@brew-haven-1234.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
    ```

    If the password has special characters like `!` or `@`, they must be URL encoded (`!` becomes `%21`). Generated passwords normally have none.

The tables (`users`, `products`, `orders`, `order_items`) and the eight products are created automatically the first time the API starts.

**CA certificate, only if needed.** CockroachDB Cloud's certificate is signed by Let's Encrypt, which Node already trusts, so `COCKROACH_CA_CERT` normally stays **empty**. Only if the logs say `self-signed certificate in certificate chain` or `unable to get local issuer certificate`:

1. In the **Connect** dialog, choose **CockroachDB Client** and run the certificate download command it shows. It saves a `root.crt` file.
2. Turn the file into one line with `\n` for line breaks. This prints it ready to paste, quotes included:

   ```bash
   node -e "console.log(JSON.stringify(require('fs').readFileSync('root.crt', 'utf8')))"
   ```

   (Use the full path to `root.crt` that the download command printed.)
3. Paste the output into `.env` as `COCKROACH_CA_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"`.

With it set, the server removes `sslmode` from the URL and checks the certificate itself.

**Look at the data**

* **In the browser:** the cluster page lists databases and tables under **Databases**. If your cluster menu has a **SQL Shell**, you can run queries there.
* **From a terminal:** in the Connect dialog choose **CockroachDB Client**, follow its steps to install `cockroach`, then:

  ```bash
  cockroach sql --url "postgresql://brewadmin:...@...cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full"
  ```

  Any PostgreSQL tool works too: `psql` with the same URL, DBeaver, or the VS Code "SQLTools" extension with its PostgreSQL driver.

Try these after you have signed in and placed an order:

```sql
SELECT uid, email, login_count, last_login_at FROM users;

SELECT o.id, o.created_at, o.total, i.product_name, i.quantity, i.unit_price
FROM orders o
JOIN order_items i ON i.order_id = o.id
ORDER BY o.created_at DESC;
```

Prices are in **paise** (1 rupee = 100 paise), so `45000` means Rs 450.

**Check:** you have `COCKROACH_DATABASE_URL` in `.env`, and the password is saved somewhere safe (a password manager), not in a file in the repo.

---

## 5. MySQL on Aiven: the third database

**What it is:** Aiven runs open source databases for you. Its **Free** tier includes one MySQL service (1 CPU, 1 GB RAM, 1 GB storage at the time of writing), with no credit card. Offers change, so check [aiven.io/free-mysql-database](https://aiven.io/free-mysql-database).

Two things to know about the free tier:

* **You cannot choose the cloud or region** on the free tier. Aiven picks it. That is fine for learning; the calls are just a little slower if it lands far from US East. (The paid tiers let you pick a US East region.)
* **Free services are powered off when idle.** Aiven may power a free service off if it gets no use in its first few hours, or later if it sits unused. It emails you first. Your data is kept, and you can **power it back on at any time** (see below).

**Create the service**

1. Sign up at [console.aiven.io](https://console.aiven.io). Aiven creates an organization and a project for you.
2. In your project, open **Services** and click **Create service**.
3. Choose **MySQL**.
4. Choose the **Free** tier (it may be a tab or a **Service tier** option). The plan shows as something like `free-1-1gb`.
5. Give the service a name, for example `brew-haven-mysql`, and click **Create free service** (or **Create service**).
6. The status shows **Rebuilding**. Wait until it says **Running** (a few minutes).

**Check:** the service shows **Running** with a green dot.

**Copy the Service URI**

7. Open the service. On the **Overview** page, find **Connection information** (or click **Quick connect**).
8. Copy the **Service URI**. Click the eye or copy icon; the password is part of it. It looks like:

   ```
   mysql://avnadmin:AVNS_xxxxxxxxxxxx@brew-haven-mysql-yourname.c.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
   ```

9. Put it in `.env`:

   ```
   MYSQL_DATABASE_URL=mysql://avnadmin:AVNS_xxxxxxxxxxxx@brew-haven-mysql-yourname.c.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
   ```

The tables and products are created automatically the first time the API starts.

**CA certificate (recommended).** The connection is always encrypted. But if `MYSQL_CA_CERT` is empty, the adapter uses `rejectUnauthorized: false`, which means it does not check **who** is on the other end. That is a **workshop shortcut**, marked as one in `src/database/mysql.js`. The proper fix:

1. On the service **Overview** page, next to **CA certificate**, click download to get `ca.pem`.
2. Turn it into one line:

   ```bash
   node -e "console.log(JSON.stringify(require('fs').readFileSync('ca.pem', 'utf8')))"
   ```

3. Paste the output into `.env`:

   ```
   MYSQL_CA_CERT="-----BEGIN CERTIFICATE-----\nMIIEQTCCAqmgAwIBAgIU...\n-----END CERTIFICATE-----\n"
   ```

   On Vercel or Netlify you can paste the certificate exactly as it is in the file, line breaks and all.

**Power it back on after it idles**

1. Go to [console.aiven.io](https://console.aiven.io), open **Services**. A sleeping service shows **Powered off**.
2. Open the service and click **Power on** (it may be in the **Actions** or three dots menu).
3. Wait for **Running**. The host, port and password stay the same, so nothing in `.env` or on Vercel/Netlify needs to change.

**Look at the data**

* **`mysql` command line** (comes with MySQL Server or MySQL Shell). The Overview page has the host, port, user and password:

  ```bash
  mysql --user avnadmin --password --host brew-haven-mysql-yourname.c.aivencloud.com --port 12345 --ssl-mode=REQUIRED defaultdb
  ```

* **A GUI:** MySQL Workbench, DBeaver, or a VS Code extension (for example "SQLTools" with its MySQL driver, or "MySQL" by Weijan Chen). Create a new MySQL connection with the same host, port, user `avnadmin`, password and database `defaultdb`, and turn SSL on (required).
* The Aiven service page has **Quick connect** with ready made snippets for many tools.

Try:

```sql
SELECT uid, email, login_count, last_login_at FROM users;

SELECT o.id, o.created_at, o.total, i.product_name, i.quantity, i.unit_price
FROM orders o
JOIN order_items i ON i.order_id = o.id
ORDER BY o.created_at DESC;
```

**Check:** you have `MYSQL_DATABASE_URL` in `.env` (and ideally `MYSQL_CA_CERT`), and the service is **Running**.

---

## 6. Run it on your laptop

Always open **`http://localhost`**, not `http://127.0.0.1`. Firebase allows sign in on `localhost` out of the box, but `127.0.0.1` is a different domain and sign in fails there.

**You can start with just Firebase.** Fill in the Firebase values, leave the CockroachDB and MySQL lines empty, and run the app. Those two show as **not configured** and are skipped. Add them later, restart, and they join in.

1. In a terminal, clone the repo (`<repo-url>` is the link your instructor shares), go into the project folder and install:

   ```bash
   git clone <repo-url>
   cd brewhaven
   npm install
   ```

2. Create `.env` from the example:

   ```bash
   # Mac or Linux, or Git Bash on Windows
   cp .env.example .env
   ```

   ```powershell
   # Windows PowerShell or Command Prompt
   copy .env.example .env
   ```

3. Open `.env` and fill in the values from parts 3, 4 and 5. Leave `ALLOWED_ORIGINS` empty.
4. Start it:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173/api/health](http://localhost:5173/api/health). With all three set up you should see something like:

   ```json
   {
     "status": "ok",
     "primary": "firebase",
     "databases": [
       { "id": "firebase", "label": "Firebase Firestore", "state": "ok" },
       { "id": "cockroachdb", "label": "CockroachDB", "state": "ok" },
       { "id": "mysql", "label": "MySQL (Aiven)", "state": "ok" }
     ]
   }
   ```

   A database you have not set up yet shows `"state": "not_configured"` with `missingEnv` naming the variables it wants. One that is set up but unreachable shows `"state": "error"` and a short hint (the real reason is printed in the terminal). See part 9.

   **Check:** every database you set up says `"ok"`.

6. Open [http://localhost:5173](http://localhost:5173). You should see the eight products, the **Database** and **Save to** switch in the header (a database that is not set up says "(not set up)"), and a strip at the bottom showing each database's health.
7. Click **Sign in with Google**. With **Save to: All databases**, the **Saved your login to:** panel shows one row per database, each marked **Saved** (or the error, or **Not configured**). Sign out and in again: `login_count` goes up in every database.
8. Add a few items to the cart and place an order. The **Order ... saved to:** panel shows the short order id and one result per database.
9. Switch **Database** in the header between Firebase, CockroachDB and MySQL, on the **Shop** and on **My orders**. The line under the title says which database answered. **Check:** the **same order id** appears in all three.

Want to see drift? Pick **MySQL (Aiven)** in **Database**, set **Save to** to **Only MySQL (Aiven)** and place an order: the panel shows only MySQL. Now switch **Database** to CockroachDB: that order is missing there. Set **Save to** back to **All databases** afterwards. (Drift also happens by accident: put a wrong password in `MYSQL_DATABASE_URL`, restart, and place an order. It is saved to two databases and MySQL shows an error. Put the right value back afterwards.)

If you pick a database that is not set up or is down, reads fall back to another one and the page tells you, for example "CockroachDB is not set up, so this is showing Firebase Firestore instead." Saving **only** to such a database fails with a clear message, because a write never falls back.

The same switches work straight on the API: `GET /api/products?from=mysql` reads from MySQL, and `POST /api/login?to=mysql` or `POST /api/orders?to=mysql` writes only to MySQL. Leave `to` out to write everywhere. An unknown name in `from` or `to` is a 400.

**`PRIMARY_DB`** picks which database the **Database** switch starts on (and which one is read when a request has no `?from=`): `firebase` (the default when empty), `cockroachdb` or `mysql`. If that database is down or not configured, reads fall back to the next working one. The products list even falls back to the built-in catalog, so the shop always renders. Writes go to every configured database (unless you chose **Save to: Only**), whatever `PRIMARY_DB` says.

Vite serves the React app, and a small plugin in `vite.config.js` sends every `/api/...` request to the same server code that Vercel and Netlify run. **Changed `.env`? Stop with `Ctrl + C` and run `npm run dev` again.**

---

## 7. Tests

```bash
npm test
```

The tests use `node --test` and **fake in-memory databases** (`test/fakes.js`), so they need **no internet, no `.env` and no accounts**. They check the API rules: validation, prices from the catalog, the fan-out to every database (or to one with `?to=`), "saved if at least one database worked", fallbacks when a database is down, and the error codes.

**Check:** every test passes.

---

## 8. Go live on Vercel or Netlify

**Regions:** free Vercel functions run in **US East** by default (`iad1`, Washington, D.C.) and Netlify functions run in **US East** too (`us-east-2`, Ohio). Every API call talks to all three databases, so keep them in US East where you can (Firestore `nam5`, CockroachDB `us-east-1`). Aiven's free tier picks its own region; that just adds a little delay.

**Before you start:** put the code in a GitHub repo **you own**. On the repo page (the link your instructor shared), click **Use this template** > **Create a new repository** if you see it, or **Fork** > **Create fork**. Or create a new empty repo on GitHub (no README, `.gitignore` or license) and push your clone to it from the project folder:

```bash
git status                               # .env must NOT be listed
git remote set-url origin <your-repo-url>
git push -u origin main
```

The app sits at the root of the repo, so leave the host's **Root Directory** (Vercel) or **Base directory** (Netlify) empty.

### Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub (the free Hobby plan is enough).
2. Click **Add New...**, then **Project**.
3. Find your repo under **Import Git Repository** and click **Import**. (Not listed? Click the link to adjust GitHub app permissions and allow the repo.)
4. **Project Name:** for example `brew-haven`.
5. **Root Directory:** leave it as it is: empty, or `./` (the repo root). The app is at the top of the repo.
6. **Framework Preset:** **Vite** (usually detected). Build command `npm run build`, output `dist`. Leave them as they are.
7. Open **Environment Variables**. Open your `.env` in the editor, select all, copy, and paste into the first **Key** box. Vercel splits it into separate variables. Check each one, especially the four `VITE_FIREBASE_...` values and `FIREBASE_PRIVATE_KEY`. Delete any row whose value is empty.
8. Click **Deploy** and wait.
9. Copy your domain, for example `brew-haven.vercel.app`.
10. **Allow sign in there:** Firebase console, **Authentication > Settings > Authorized domains > Add domain**. Paste the domain without `https://` and click **Add**.

**Check:** `https://YOUR-DOMAIN/api/health` shows `"status": "ok"` and each database `"ok"`. Then sign in on the site and place an order.

**Changing a variable later:** project **Settings > Environment Variables**, edit, save. Then **Deployments**, the three dots on the latest deployment, **Redeploy**. **Variables only take effect after a redeploy**, and `VITE_` values are baked into the JavaScript at build time, so they need a new build too.

Every push to `main` deploys again automatically.

### Netlify

1. Sign in at [app.netlify.com](https://app.netlify.com) with GitHub.
2. Click **Add new project** (older screens say **Add new site**), then **Import an existing project**.
3. Choose **GitHub**, authorize Netlify if asked, and pick your repo.
4. **Base directory:** leave it **empty** (the repo root). The rest comes from `netlify.toml` at the root of the repo: build command `npm run build`, publish directory `dist`, and functions in `netlify/functions`. The function itself claims `/api/*` (`config.path` in `netlify/functions/api.mjs`). Leave those fields as Netlify fills them in.
5. Click **Add environment variables**, then **Import from a .env file**, and paste the contents of your `.env`.
   Remove the double quotes around the `FIREBASE_PRIVATE_KEY` value, and keep each variable's scope including **Functions** (the default **All scopes** does).
6. Click **Deploy**. When it finishes, copy your domain, for example `brew-haven.netlify.app` (rename it under **Project configuration > Change project name**, older screens say Site configuration).
7. Add that domain to Firebase **Authentication > Settings > Authorized domains**.

**Check:** `https://YOUR-DOMAIN/api/health` shows every database `"ok"`, and an order placed on the live site appears in all three databases.

**Changing a variable later:** **Project configuration > Environment variables** (older screens: Site configuration). Edit, then **Deploys > Trigger deploy > Deploy project** (or Deploy site). Functions only see new values after a new deploy.

Netlify functions have a limit of about **4 KB for all environment variables together**. This app fits, but do not add variables it does not use, and leave optional ones empty rather than pasting a large certificate you do not need.

**Do not drag `dist` (or any folder) onto Netlify.** Drag and drop publishes static files only. The API (`netlify/functions/api.mjs`, `server/`, `src/database/`) is not deployed, so every `/api/...` call is 404 and every database light is grey. Use Git import (above) or the Netlify CLI from the project folder:

```bash
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --build --prod
```

The deploy output must list the function `api`. For CLI deploys also add `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x` in **Project configuration > Environment variables** (the UI, not `netlify.toml` or `.env`), then deploy again.

**Node 22:** `netlify.toml` sets `NODE_VERSION = "22"`. Netlify runs functions on the build's Node version, and firebase-admin needs Node 22.12+. Keep it.

---

## 9. Troubleshooting

Most problems show up in `/api/health` or in the database strip on the page. Start there, then read the logs.

| What you see | What it means | Fix |
|---|---|---|
| A database shows `not_configured` with `missingEnv` | Its variables are empty or missing | Fill them in `.env` (in the project folder, next to `.env.example`) and restart, or add them on the host and **redeploy** |
| A database shows `error`: "Could not reach MySQL (Aiven). Check MYSQL_DATABASE_URL and the function logs." (or CockroachDB, or Firestore) | The variables are there, but connecting or setting up failed | Read the real reason in the terminal or function logs. Copy the URL again. The other databases keep working meanwhile, and the failed one is retried on the next request |
| MySQL was fine yesterday and shows `error` today | Aiven **powered off** the idle free service | Aiven console, open the service, **Power on**, wait for Running (part 5). Nothing else changes |
| CockroachDB logs say `self-signed certificate in certificate chain` or `unable to get local issuer certificate` | The certificate cannot be checked | Put the cluster CA in `COCKROACH_CA_CERT` (part 4) |
| CockroachDB logs say `password authentication failed` | Wrong password, or special characters not URL encoded | Reset the password in **SQL Users** and paste a fresh connection string |
| Firestore shows `error`, logs mention "private key", "PEM" or "DECODER" | `FIREBASE_PRIVATE_KEY` was pasted badly | Paste `private_key` again, in double quotes in `.env`, keeping every `\n`. Check `FIREBASE_CLIENT_EMAIL` is from the same project |
| `/api/health` or sign in fails naming `FIREBASE_PROJECT_ID` | It is required, even if you use no Firestore | Set it to your Firebase project ID |
| Signed in, but the API says "Your session has expired. Sign in again." | `FIREBASE_PROJECT_ID` is a different project from `VITE_FIREBASE_PROJECT_ID` | Make them match, restart or redeploy |
| Sign in fails with `auth/unauthorized-domain` or "This domain is not allowed" | Firebase does not know this domain | Add the exact domain (no `https://`) in **Authentication > Settings > Authorized domains** |
| Sign in fails locally | You opened `127.0.0.1` | Use `http://localhost:5173` |
| The page lists missing `VITE_` variables | The build had no Firebase web config | Fill in the four `VITE_FIREBASE_...` values. Locally restart; hosted, **redeploy** |
| You changed a variable on Vercel or Netlify and nothing changed | Variables only apply to new deployments | Redeploy (part 8) |
| Vercel or Netlify shows a 404 for the whole site, or the build cannot find `package.json` | Wrong Root Directory (Vercel) / Base directory (Netlify) | Make sure it is empty (the repo root), so the host finds `package.json` and `netlify.toml` there, then redeploy |
| Netlify site loads but `/api/...` is 404, all database lights grey | `dist` (or a folder) was dragged onto Netlify: static files only, no functions | Use Git import or `npx netlify-cli deploy --build --prod` (part 8) |
| Netlify `/api/...` is 502, body says `require() of ES Module ... jose ... not supported` | Functions run on Node older than 22.12, which firebase-admin needs | Keep `NODE_VERSION = "22"` in `netlify.toml`. CLI deploys: also set `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x` in the Netlify UI. Redeploy |
| An order is in two databases but not the third | The third was down during the write: this is **drift** (part 1) | Expected with a dual write. Fix the database; new orders go everywhere again |
| `npm run dev` fails with `EADDRINUSE` | Port 5173 is busy | Stop the other `npm run dev`, or use the port Vite prints |

**Where to read the logs**

* **Your laptop:** the terminal running `npm run dev`.
* **Vercel:** the project, then **Logs**. Build problems are under **Deployments**.
* **Netlify:** the project, then **Logs & metrics > Functions**. Build problems are under **Deploys**.
* **The browser:** devtools (`F12`), **Network** tab, click a failed `/api/...` request to see its `{ "error": "..." }`.

---

## 10. Project layout

```
brewhaven/
├── api/                       Vercel functions, one file per route
│   ├── health.js              GET  /api/health
│   ├── products.js            GET  /api/products?from=
│   ├── login.js               POST /api/login?to=
│   └── orders.js              GET ?from= and POST ?to= /api/orders
├── netlify/functions/api.mjs  the same API as one Netlify function
├── tools/
│   ├── import-firebase-key.mjs  npm run setup:firebase: key JSON -> .env
│   └── check-dbs.mjs            npm run check: test every database in .env
├── server/                    shared server code (never sent to the browser)
│   ├── catalog.js             the 8 products and their prices (source of truth)
│   ├── databases.js           loads the 3 adapters, env checks, init, fan-out
│   ├── handlers.js            createApi(): every route, validation, fallbacks
│   ├── auth.js                checks the Firebase ID token
│   ├── firebase-admin.js      Firebase Admin SDK setup
│   ├── runtime.js             builds the API from real env and databases
│   └── node-adapter.js        lets the Vite dev server call the handlers
├── src/                       the React app
│   ├── database/              ONE FILE PER DATABASE: the only part that differs
│   │   ├── firebase.js        Firestore adapter
│   │   ├── cockroachdb.js     CockroachDB adapter (pg)
│   │   └── mysql.js           MySQL adapter (mysql2)
│   └── ...                    screens, sign in, cart, API calls
├── test/
│   ├── api.test.js            node --test, no internet
│   └── fakes.js               in-memory fake databases
├── .env.example               every variable, with where to find it
├── index.html
├── netlify.toml               Netlify build and functions settings
├── vite.config.js             Vite, plus the /api plugin for local dev
├── package.json
```

The adapters live in `src/database/` so they are easy to find next to the app, but they are **server code**: only the API imports them, never the browser.
