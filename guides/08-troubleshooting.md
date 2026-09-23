# 08. Troubleshooting

**Goal:** find your symptom, apply the fix, and get back to the guide you were on.

## First, look

Most problems show up in one of these. Start there.

1. **`npm run check`** (inside the project folder, with `npm run dev` stopped or in another terminal). It connects to every database in `.env` and prints the **real** error with a hint.
2. **`/api/health`**: `http://localhost:5173/api/health` locally, `https://YOUR-DOMAIN/api/health` live.
3. **Database health** at the bottom of the page (green OK, blinking red Error, hollow grey Not configured). Hover a red one to see its message.

## Where to read the logs

* **Your laptop:** the terminal running `npm run dev`.
* **Vercel:** the project > **Logs**. Build problems are under **Deployments**.
* **Netlify:** the project > **Logs & metrics** > **Functions**. Build problems are under **Deploys**.
* **The browser:** `F12` > **Network** tab > click a failed `/api/...` request to see its `{ "error": "..." }`.

## Setup and terminal

| What you see | What it means | Fix |
|---|---|---|
| `npm error Missing script: "dev"` (or `check`, `setup:firebase`) | You are in the wrong folder | `cd` into the project folder (`brewhaven`), where `package.json` is |
| `Could not read package.json` / `ENOENT` | Wrong folder | Same as above |
| `✗ No .env here. Run this from the project folder...` | No `.env` in this folder | `cd brewhaven` (the project folder), then `copy .env.example .env` (PowerShell) or `cp .env.example .env` |
| `Port 5173 is in use, trying another one...` or `EADDRINUSE` | Another `npm run dev` is still running | Close the other terminal (`Ctrl + C`), or use the port Vite prints (still with `localhost`) |
| `node` version errors, or `engines` warnings | Node is older than 22.12 | Install Node 22 LTS, reopen the terminal |
| `setup:firebase` says `Now delete that .json file` | `--delete` did not reach the script (PowerShell can drop it) | Run `node tools/import-firebase-key.mjs --delete`, or delete the file by hand |
| You changed `.env` and nothing changed | The server reads `.env` only at start | `Ctrl + C`, then `npm run dev` again |

## Databases

| What you see | What it means | Fix |
|---|---|---|
| A database shows `not_configured` with `missingEnv`, or **(not set up)** in the **Database** switch | Its variables are empty or missing | Fill them in `.env` in the project folder (next to `.env.example`) and restart, or add them on the host and **redeploy** |
| A database shows `error`: "Could not reach MySQL (Aiven). Check MYSQL_DATABASE_URL and the function logs." (or CockroachDB, or Firestore) | The variables are there, but connecting failed | Run `npm run check` for the real reason. Copy the URL again. The other databases keep working, and the failed one is retried on the next request |
| `ENOTFOUND` / `getaddrinfo` for MySQL right after creating it | The Aiven service is still **Rebuilding**; its host name does not exist yet | Wait for **Running**, then check again |
| `ENOTFOUND` at any other time | Host name in the URL is wrong or cut off, or you are offline | Copy the connection string again, all on one line |
| MySQL was fine yesterday, `error` or `ECONNREFUSED` / `ETIMEDOUT` today | Aiven **powered off** the idle free service | Aiven console > the service > **Power on**, wait for **Running**. Nothing else changes |
| `Access denied` (MySQL) | Password wrong or still hidden as `****` | Click the eye icon on **Service URI**, copy again |
| CockroachDB `password authentication failed` | Wrong password, `<ENTER-SQL-USER-PASSWORD>` left in, or special characters not URL encoded | Reset the password in **SQL Users**, paste a fresh connection string |
| CockroachDB `self-signed certificate in certificate chain` or `unable to get local issuer certificate` | The certificate cannot be checked | Put the cluster CA in `COCKROACH_CA_CERT` ([ENV-GUIDE](ENV-GUIDE.md#cockroach_ca_cert)) |
| Firestore `error`, logs mention "private key", "PEM" or "DECODER" | `FIREBASE_PRIVATE_KEY` was pasted badly | Run `npm run setup:firebase` again with a fresh key. Check `FIREBASE_CLIENT_EMAIL` is from the same project |
| Firestore `NOT_FOUND` / "Firestore is not created yet" | No Firestore database in this project | Firebase console > **Firestore Database** > **Create database** |
| `PRIMARY_DB must be one of: firebase, cockroachdb, mysql` | Typo in `PRIMARY_DB` | Fix it or leave it empty |
| An order is in two databases but not the third | The third was down during the write: **drift** | Expected with a dual write. Fix the database; new orders go everywhere again |

## Sign in

| What you see | What it means | Fix |
|---|---|---|
| `/api/health` or sign in fails naming `FIREBASE_PROJECT_ID` | It is required, even without Firestore | Set it to your Firebase project ID |
| "Your session has expired. Sign in again." right after signing in | `FIREBASE_PROJECT_ID` is a different project from `VITE_FIREBASE_PROJECT_ID` | Make them match, restart or redeploy |
| "This domain is not allowed to sign in yet." / `auth/unauthorized-domain` | Firebase does not know this domain | Add the exact domain (no `https://`) in **Authentication > Settings > Authorized domains** |
| Sign in fails locally | You opened `127.0.0.1` | Use `http://localhost:5173` |
| "Your browser blocked the sign in popup." | Popup blocker | Allow popups for the site, click again |
| **Sign in is not set up yet.** box, or the page lists missing `VITE_` variables | The Firebase web config is missing | Fill in the four `VITE_FIREBASE_...` values. Locally restart; hosted, **redeploy** |

## Hosting

| What you see | What it means | Fix |
|---|---|---|
| You changed a variable on Vercel or Netlify and nothing changed | Variables only apply to new deployments | Redeploy ([06](06-deploy-vercel.md), [07](07-deploy-netlify.md)) |
| 404 for the whole site, or the build cannot find `package.json` | Wrong Root Directory (Vercel) / Base directory (Netlify) | Make sure it is empty (the repo root), so the host finds `package.json` and `netlify.toml` there, then redeploy |
| Netlify site loads but `/api/...` is 404, all database lights grey | `dist` (or a folder) was dragged onto Netlify: static files only, no functions | Use Git import, or `npx netlify-cli deploy --build --prod` ([07](07-deploy-netlify.md#f-alternative-deploy-with-the-netlify-cli)) |
| Netlify `/api/...` is 502, body says `require() of ES Module ... jose ... not supported` | Functions run on Node older than 22.12, which firebase-admin needs | Keep `NODE_VERSION = "22"` in `netlify.toml`. CLI deploys: also set `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x` in the Netlify UI. Redeploy |

## ✅ Check

* `npm run check` ends with `3 of 3 databases working`.
* `/api/health` shows every database `"ok"`.

## If it still fails

* Read the exact error in the terminal or logs, not only the message on the page. The page hides details on purpose, so secrets never reach the browser.
* Compare your `.env` line by line with [ENV-GUIDE.md](ENV-GUIDE.md).
* The long reference: [README.md, part 9](../README.md#9-troubleshooting).
* Ask your instructor. Show the error, **never** your `.env` or keys.
