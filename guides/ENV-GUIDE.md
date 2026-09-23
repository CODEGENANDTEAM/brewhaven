# ENV-GUIDE: every variable in `.env`

This is the reference for `.env` in the project folder. One section per variable, in the same order as `.env.example`.

**All example values on this page are fake.** Never paste your real values into a chat, a screenshot, an issue or a commit.

## Quick table

| Variable | Secret? | Needed? | Where it comes from | Guide |
|---|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | No, public | Yes | Firebase web app config: `apiKey` | [01](01-firebase.md) |
| `VITE_FIREBASE_AUTH_DOMAIN` | No, public | Yes | Firebase web app config: `authDomain` | [01](01-firebase.md) |
| `VITE_FIREBASE_PROJECT_ID` | No, public | Yes | Firebase web app config: `projectId` | [01](01-firebase.md) |
| `VITE_FIREBASE_APP_ID` | No, public | Yes | Firebase web app config: `appId` | [01](01-firebase.md) |
| `FIREBASE_PROJECT_ID` | No | **Always required** | Same as `projectId` | [01](01-firebase.md) |
| `FIREBASE_CLIENT_EMAIL` | Not on its own | For Firestore | Service account key: `client_email` | [01](01-firebase.md) |
| `FIREBASE_PRIVATE_KEY` | **YES** | For Firestore | Service account key: `private_key` | [01](01-firebase.md) |
| `COCKROACH_DATABASE_URL` | **YES** (has password) | For CockroachDB | Cluster > **Connect** > **General connection string** | [03](03-cockroachdb.md) |
| `COCKROACH_CA_CERT` | No | Usually empty | Only if certificate errors | [03](03-cockroachdb.md) |
| `MYSQL_DATABASE_URL` | **YES** (has password) | For MySQL | Aiven service > **Overview** > **Service URI** | [04](04-aiven-mysql.md) |
| `MYSQL_CA_CERT` | No | Recommended | Aiven service > **Overview** > **CA certificate** | [04](04-aiven-mysql.md) |
| `PRIMARY_DB` | No | Optional | You choose | this page |
| `ALLOWED_ORIGINS` | No | Optional, leave empty | You write it | this page |

**Rules that apply to all of them**

* One variable per line: `NAME=value`. No spaces around `=`.
* Only values with `\n` in them (the private key and certificates) go in double quotes.
* A database whose variable is empty is **not configured**: the app skips it and keeps working with the others.
* **Anything starting with `VITE_` is sent to every visitor's browser.** Never put `VITE_` in front of a secret.
* After any change: restart `npm run dev` locally, or **redeploy** on Vercel or Netlify.
* To verify: run `npm run check`, then open `/api/health`.

---

## Firebase web app (public)

Where: Firebase console > gear icon next to **Project Overview** > **Project settings** > **General** > **Your apps** > your web app > **SDK setup and configuration** > **Config**. You see `const firebaseConfig = { ... }`.

These four reach the browser. That is fine and by design: the browser only uses them to open Google sign in. The server checks every sign in token.

### `VITE_FIREBASE_API_KEY`

* **What:** identifies your Firebase project to Google's sign in service. Not a password.
* **Secret:** no, public.
* **Get it:** `apiKey` in the config.
* **Format:** `VITE_FIREBASE_API_KEY=AIzaSyFAKEexampleKEYnotREAL123`
* **Common mistakes:** copying the quotes or the trailing comma from the snippet. Copy only the text between the quotes.
* **Verify:** the striped **Sign in is not set up yet.** notice disappears after a restart.

### `VITE_FIREBASE_AUTH_DOMAIN`

* **What:** the domain that hosts the Google sign in popup.
* **Secret:** no, public.
* **Get it:** `authDomain` in the config.
* **Format:** `VITE_FIREBASE_AUTH_DOMAIN=brew-haven-1a2b3.firebaseapp.com`
* **Common mistakes:** adding `https://`. It is just the domain.
* **Verify:** **Sign in with Google** opens a popup.

### `VITE_FIREBASE_PROJECT_ID`

* **What:** your Firebase project ID, for the browser.
* **Secret:** no, public.
* **Get it:** `projectId` in the config (also on **Project settings** > **General** > **Project ID**).
* **Format:** `VITE_FIREBASE_PROJECT_ID=brew-haven-1a2b3`
* **Common mistakes:** using the project **name** (`brew-haven`) instead of the **ID** (`brew-haven-1a2b3`).
* **Verify:** must equal `FIREBASE_PROJECT_ID`, or the API says "Your session has expired. Sign in again."

### `VITE_FIREBASE_APP_ID`

* **What:** the ID of the web app you registered.
* **Secret:** no, public.
* **Get it:** `appId` in the config.
* **Format:** `VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456`
* **Common mistakes:** copying `messagingSenderId` or `measurementId` instead. The app ID contains `:web:`.
* **Verify:** sign in works.

---

## Server only

These are read by the API and never sent to the browser.

### `FIREBASE_PROJECT_ID`

* **What:** the project the server trusts sign in tokens from. **Always required**, even if you skip Firestore.
* **Secret:** no.
* **Get it:** same value as `VITE_FIREBASE_PROJECT_ID`.
* **Format:** `FIREBASE_PROJECT_ID=brew-haven-1a2b3`
* **Common mistakes:** leaving it empty (every API call fails naming it), or a different project from the `VITE_` one.
* **Verify:** `npm run check` prints it on the first line. `/api/health` answers.

### `FIREBASE_CLIENT_EMAIL`

* **What:** the service account the server uses to write to Firestore.
* **Secret:** not on its own, but it belongs with the private key.
* **Get it:** **Project settings** > **Service accounts** > **Generate new private key** > **Generate key**. Then run `npm run setup:firebase -- --delete`, which fills this and the next one in for you. By hand: `client_email` in the downloaded JSON.
* **Format:** `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc12@brew-haven-1a2b3.iam.gserviceaccount.com`
* **Common mistakes:** a key from a different Firebase project.
* **Verify:** `npm run check` shows Firebase Firestore `ok: 8 products`.

### `FIREBASE_PRIVATE_KEY`

* **What:** the password of the service account. With it, anyone can read and write your Firestore.
* **Secret:** **YES.**
* **Get it:** `private_key` in the same JSON. Easiest: `npm run setup:firebase -- --delete` (writes it in the right format, never prints it, deletes the JSON).
* **Format:** one line, in double quotes, line breaks written as `\n`:

  ```
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANFAKEFAKEFAKEnotarealkey...\n-----END PRIVATE KEY-----\n"
  ```

* **Common mistakes:** missing quotes; deleting or changing a `\n`; copying only part of it; leaving the JSON file in the repo folder or in Downloads.
* **Verify:** `npm run check`. A `DECODER`, `PEM` or "private key" error means it is malformed: run `npm run setup:firebase` again.

### `COCKROACH_DATABASE_URL`

* **What:** how to reach your CockroachDB cluster, including user and password. Starts with `postgresql://` (CockroachDB speaks PostgreSQL).
* **Secret:** **YES** (it contains the password).
* **Get it:** CockroachDB Cloud > your cluster > **Connect** > pick your **SQL user** and database **`defaultdb`** > **General connection string** > copy.
* **Format:**

  ```
  COCKROACH_DATABASE_URL=postgresql://brewadmin:AbCdEf123456@brew-haven-1234.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
  ```

* **Common mistakes:** `<ENTER-SQL-USER-PASSWORD>` left in place of the password; password symbols like `@ # / ? !` not URL encoded (`@` is `%40`, `!` is `%21`); the string split over two lines; adding quotes.
* **Verify:** `npm run check` shows CockroachDB `ok: 8 products`.

### `COCKROACH_CA_CERT`

* **What:** the certificate of the cluster's certificate authority, to check the server is really your cluster.
* **Secret:** no.
* **Needed:** usually **no. Leave it empty.** Node already trusts CockroachDB Cloud's certificate. Fill it in only if the logs say `self-signed certificate in certificate chain` or `unable to get local issuer certificate`.
* **Get it:** cluster > **Connect** > **CockroachDB Client** > run the certificate download command it shows (it saves `root.crt`). Then print it as one line:

  ```bash
  node -e "console.log(JSON.stringify(require('fs').readFileSync('C:/path/to/root.crt', 'utf8')))"
  ```

* **Format:** `COCKROACH_CA_CERT="-----BEGIN CERTIFICATE-----\nMIIFFAKEexample...\n-----END CERTIFICATE-----\n"`
* **Common mistakes:** pasting it with real line breaks in `.env` (use the one-liner output).
* **Verify:** `npm run check`.

### `MYSQL_DATABASE_URL`

* **What:** how to reach your Aiven MySQL service, including user `avnadmin` and its password.
* **Secret:** **YES** (it contains the password).
* **Get it:** [console.aiven.io](https://console.aiven.io) > **Services** > your MySQL service > **Overview** > **Connection information** > **Service URI**. Click the **eye** icon, then **copy**.
* **Format:**

  ```
  MYSQL_DATABASE_URL=mysql://avnadmin:AVNS_xxxxxxxxxxxx@brew-haven-mysql-yourname.c.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
  ```

* **Common mistakes:** the password copied as `****`; a **PostgreSQL** service's URI (`postgres://...`) because the create screen was left on PostgreSQL; testing before the service is **Running** (`ENOTFOUND`).
* **Verify:** `npm run check` shows MySQL (Aiven) `ok: 8 products`. `ECONNREFUSED` or a timeout later usually means the free service was powered off: **Power on**.

### `MYSQL_CA_CERT`

* **What:** Aiven's CA certificate. With it, the server checks it is really talking to your service. Without it the connection is still encrypted, but not checked (a workshop shortcut).
* **Secret:** no. **Recommended.**
* **Get it:** service **Overview** > **CA certificate** > download `ca.pem`. Then:

  ```bash
  node -e "console.log(JSON.stringify(require('fs').readFileSync('C:/Users/you/Downloads/ca.pem', 'utf8')))"
  ```

  Paste the whole output, quotes included.
* **Format:** `MYSQL_CA_CERT="-----BEGIN CERTIFICATE-----\nMIIEQTCCFAKEexample...\n-----END CERTIFICATE-----\n"`
* **Common mistakes:** cutting the output short; forgetting the quotes.
* **Verify:** `npm run check` still shows MySQL `ok`.

### `PRIMARY_DB`

* **What:** which database the **Database** switch starts on, and which one is read when a request has no `?from=`. Writes always go to every configured database (unless **Save to: Only**).
* **Secret:** no. **Optional.**
* **Values:** `firebase` (the default when empty), `cockroachdb` or `mysql`.
* **Format:** `PRIMARY_DB=cockroachdb`
* **Common mistakes:** `cockroach` or `MySQL`. Anything else gives "PRIMARY_DB must be one of: firebase, cockroachdb, mysql".
* **Verify:** `npm run check` prints it on the second line; `/api/health` shows `"primary"`.

### `ALLOWED_ORIGINS`

* **What:** which **other** websites may call this API from a browser (CORS). The shop and its API share one address, so the shop never needs it.
* **Secret:** no. **Optional: leave it empty today.** Empty means any website may call the API, which is fine here because the API trusts the Firebase ID token, not cookies.
* **Format (if you ever need it):** a comma separated list, no spaces, no trailing slash: `ALLOWED_ORIGINS=https://brew-haven.vercel.app,http://localhost:5500`
* **Verify:** only matters for other sites calling this API.

---

## Paste into Vercel or Netlify

Hosts do not read your `.env` file. You copy its contents into their settings.

1. Open `.env` (in the project folder) in VS Code, select all, copy.
2. **Vercel:** during import, **Environment Variables** > paste into the first **Key** box. Vercel splits it into rows. Later: **Settings** > **Environment Variables**.
3. **Netlify:** during import, **Add environment variables** > **Import from a .env file** > paste. Later: **Project configuration** > **Environment variables**.
4. Check `FIREBASE_PRIVATE_KEY`: the value starts with `-----BEGIN PRIVATE KEY-----`. If it starts with a `"`, remove the quotes at both ends. `\n` or real line breaks both work.
5. Delete rows with empty values (for example `PRIMARY_DB`, `ALLOWED_ORIGINS`, `COCKROACH_CA_CERT`). Netlify allows about 4 KB for all variables together.
6. **Redeploy** after every change. `VITE_` values are baked in at build time, so they need a new build.
7. Verify: `https://YOUR-DOMAIN/api/health` shows every database `"ok"`.

On Netlify, every variable's scope must include **Functions** (the default **All scopes** does).

### AWS_LAMBDA_JS_RUNTIME

* **What:** the Node version Netlify functions run on. **Netlify only, and only for CLI deploys** (`npx netlify-cli deploy --build --prod`).
* **Not in `.env`.** Set it in the Netlify UI: **Project configuration** > **Environment variables**. It does not work in `netlify.toml`.
* **Value:** `nodejs22.x`. Then redeploy.
* **Why:** without Node 22.12+, every `/api` call is 502 with `require() of ES Module ... not supported` ([07](07-deploy-netlify.md#f-alternative-deploy-with-the-netlify-cli)).

---

## A full example `.env` (all values FAKE)

This is what a finished `.env` looks like. Do not copy these values: they will not work.

```
VITE_FIREBASE_API_KEY=AIzaSyFAKEexampleKEYnotREAL123
VITE_FIREBASE_AUTH_DOMAIN=brew-haven-1a2b3.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=brew-haven-1a2b3
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456

FIREBASE_PROJECT_ID=brew-haven-1a2b3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc12@brew-haven-1a2b3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANFAKEFAKEFAKEnotarealkey\nFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE\n-----END PRIVATE KEY-----\n"

COCKROACH_DATABASE_URL=postgresql://brewadmin:AbCdEf123456@brew-haven-1234.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
COCKROACH_CA_CERT=

MYSQL_DATABASE_URL=mysql://avnadmin:AVNS_xxxxxxxxxxxx@brew-haven-mysql-yourname.c.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
MYSQL_CA_CERT="-----BEGIN CERTIFICATE-----\nMIIEQTCCFAKEexample\nFAKEFAKEFAKEFAKEFAKEFAKE\n-----END CERTIFICATE-----\n"

PRIMARY_DB=
ALLOWED_ORIGINS=
```

Then run `npm run check`. You want `3 of 3 databases working`.
