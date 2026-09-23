# 07. Go live on Netlify

**Goal:** Brew Haven running at `https://something.netlify.app`, with `/api/health` showing all three databases `"ok"`, and Google sign in working there.

You can do this instead of Vercel, or as well as Vercel. Both can run from the same GitHub repo.

> **⚠️ Do not drag the `dist` folder (or any folder) onto Netlify.**
> Netlify Drop and manual drag and drop publish static files only. The API (`netlify/functions/api.mjs`, `server/`, `src/database/`) is not deployed, so every `/api/...` call is 404 and every database light is grey. Only a Git import (below) or the CLI ([section F](#f-alternative-deploy-with-the-netlify-cli)) deploys the API.

**Node version:** `netlify.toml` (at the top of the project) already sets `NODE_VERSION = "22"`. firebase-admin needs Node 22.12+, and Netlify runs functions on the build's Node version. Do not remove it.

## A. Put the code in your own GitHub

Already did this in [06-deploy-vercel.md](06-deploy-vercel.md#a-put-the-code-in-your-own-github)? Skip to B.

**Option 1: Use this template or fork (no terminal needed).** Open the repo page on GitHub (the link your instructor shared). Click **Use this template** > **Create a new repository** if you see it, otherwise **Fork** > **Create fork**. Either way you get your own copy.

**Option 2: Push your clone to a new empty repo.**

1. On GitHub: **+** > **New repository**, name it (for example `brewhaven`), **no** README, `.gitignore` or license. **Create repository**, and copy its address (ends in `.git`).
2. In the terminal, inside the project folder (`brewhaven`), check `.env` is not listed, then push. Replace `<your-repo-url>` with the address you copied:

   ```bash
   git status
   git remote set-url origin <your-repo-url>
   git push -u origin main
   ```

## B. Import into Netlify

3. Sign in at [app.netlify.com](https://app.netlify.com) with GitHub.
4. Click **Add new project** (older screens: **Add new site**), then **Import an existing project**.
5. Choose **GitHub**, authorize Netlify if asked, and pick your repo (for example `brewhaven`).
6. **Base directory:** leave it **empty** (the repo root). The app and its `netlify.toml` sit at the top of the repo.
7. Leave the rest as Netlify fills it in from `netlify.toml`: build command `npm run build`, publish directory `dist`, functions in `netlify/functions`. The API function serves `/api/*` on its own.

## C. Environment variables

8. Click **Add environment variables**, then **Import from a .env file**.
9. In VS Code, open `.env` in the project folder, select all, copy, and paste it into the box. Click **Import variables**.
10. Check `FIREBASE_PRIVATE_KEY` in the list: it should start with `-----BEGIN PRIVATE KEY-----`, with **no** double quote around it. Both `\n` and real line breaks work. Every variable's scope must include **Functions** (the default, **All scopes**, does).
11. Click **Deploy** (the button says something like **Deploy brewhaven**) and wait.

**Size limit:** Netlify allows about **4 KB for all variables together**. This app fits. Do not add variables it does not use, and leave optional ones (like `COCKROACH_CA_CERT`) empty if you do not need them.

## D. Allow Google sign in on your domain

12. Copy your domain, for example `brew-haven-abc123.netlify.app`. To rename it: **Project configuration** > **Change project name** (older screens: Site configuration).
13. Firebase console > **Authentication** > **Settings** > **Authorized domains** > **Add domain**. Paste it **without** `https://` and click **Add**. Renamed the site? Add the new name.

## E. Verify

14. Open `https://YOUR-DOMAIN/api/health`. Every database should say `"ok"`.
15. Open `https://YOUR-DOMAIN`, sign in, place an order. Three **Saved** rows.

## Changing a variable later

1. **Project configuration** > **Environment variables**. Edit.
2. **Deploys** > **Trigger deploy** > **Deploy project** (or **Deploy site**).

Functions only see new values after a new deploy.

## F. Alternative: deploy with the Netlify CLI

No GitHub? Deploy from your laptop instead. Run these inside the project folder (`brewhaven`):

```bash
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --build --prod
```

* `login` opens the browser once. `link` connects this folder to your Netlify project (create one if asked).
* The deploy output must list the function **`api`**. No `api` in the list means no `/api`.
* Add the variables as in C (**Project configuration** > **Environment variables**), plus one more: `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x`. It must be set there (or with the CLI), not in `netlify.toml`, and not in `.env`. Then run the deploy command again.

## ✅ Check

* `https://YOUR-DOMAIN/api/health` shows three `"ok"` databases.
* You can sign in on the live site.
* An order placed on the live site appears in all three databases (switch **Database** under **My orders**).

## If it fails

* **Build cannot find `package.json`, or the whole site is 404:** Base directory is wrong. **Project configuration** > **Build & deploy** > **Build settings** > **Base directory** must be empty (the repo root), so Netlify finds `package.json` and `netlify.toml` there. Clear it, save, then trigger a deploy.
* **Site loads but `/api/health` is 404, all database lights grey:** deployed by dragging `dist` (or a folder) onto Netlify, so there are no functions. Use Git import (base directory empty), or the CLI (F).
* **Every `/api` call is 502, body says `require() of ES Module ... jose ... from ... jwks-rsa ... not supported`:** functions run on Node older than 22.12. Check `netlify.toml` still has `NODE_VERSION = "22"`. CLI deploys: also add `AWS_LAMBDA_JS_RUNTIME` = `nodejs22.x` (F). Then redeploy.
* **Deploy fails mentioning environment variables being too large:** remove unused or empty optional variables (see the size limit above).
* **A database shows `not_configured`:** its variable is missing. Add it, trigger a deploy.
* **"This domain is not allowed to sign in yet.":** add the exact domain (step 13).
* **Logs:** **Logs & metrics** > **Functions** (runtime), **Deploys** (build).
* More: [08-troubleshooting.md](08-troubleshooting.md). Every variable: [ENV-GUIDE.md](ENV-GUIDE.md#paste-into-vercel-or-netlify).
