# 06. Go live on Vercel

**Goal:** Brew Haven running at `https://something.vercel.app`, with `/api/health` showing all three databases `"ok"`, and Google sign in working there.

## A. Put the code in your own GitHub

Vercel deploys from a GitHub repo you own. The repo you cloned belongs to your instructor, so make your own copy. Pick **one** option.

**Option 1: Use this template (no terminal needed).** Open the repo page on GitHub (the link your instructor shared). If you see a green **Use this template** button, click it, then **Create a new repository**. Pick a name (for example `brewhaven`), Public or Private, and click **Create repository**. Vercel reads from your GitHub copy, so it does not matter that your laptop's clone still points at the instructor's repo.

**Option 2: Fork (no terminal needed).** No template button? Click **Fork** on the repo page, then **Create fork**. You now have your own copy under your GitHub username.

**Option 3: Push your clone to a new empty repo.**

1. On [github.com](https://github.com), click **+** (top right) > **New repository**.
2. Name: for example `brewhaven`. Public or Private both work. **Do not** tick **Add a README**, `.gitignore` or license. Click **Create repository**. Copy the repo's address (it ends in `.git`).
3. In the terminal, inside the project folder (`brewhaven`), make sure `.env` is **not** listed:

   ```bash
   git status
   ```

4. Point your clone at your new repo and push. Replace `<your-repo-url>` with the address you copied:

   ```bash
   git remote set-url origin <your-repo-url>
   git push -u origin main
   ```

   If Git asks you to sign in, a browser window opens. Sign in to GitHub there.

## B. Import into Vercel

5. Sign in at [vercel.com](https://vercel.com) with **Continue with GitHub**. The free **Hobby** plan is enough.
6. Click **Add New...**, then **Project**.
7. Under **Import Git Repository**, find your repo (for example `brewhaven`) and click **Import**. (Not listed? Click the link to adjust GitHub App permissions and allow the repo.)
8. **Project Name:** for example `brew-haven`.
9. **Root Directory:** leave it as it is: empty, or `./` (the repo root). The app sits at the top of the repo, so there is nothing to choose.
10. **Framework Preset:** **Vite** (detected). Build command `npm run build`, output `dist`. Leave them.

## C. Environment variables

11. Open **Environment Variables**.
12. In VS Code, open `.env` in the project folder, select all (`Ctrl + A`), copy, and paste into the first **Key** box. Vercel splits it into one row per variable.
13. Check the rows:
    * All four `VITE_FIREBASE_...` values are there. (They are baked into the site at build time.)
    * `FIREBASE_PRIVATE_KEY`: the value should start with `-----BEGIN PRIVATE KEY-----`. If you see a `"` at the start and end, delete both quotes. Both `\n` and real line breaks are fine.
    * Delete any row whose value is empty (like `ALLOWED_ORIGINS` or `PRIMARY_DB` if you left them blank).
14. Click **Deploy** and wait for the confetti.

## D. Allow Google sign in on your domain

15. Copy your domain from the project page, for example `brew-haven.vercel.app`.
16. Firebase console > **Authentication** > **Settings** > **Authorized domains** > **Add domain**. Paste the domain **without** `https://` and click **Add**.

## E. Verify

17. Open `https://YOUR-DOMAIN/api/health`. Every database should say `"ok"`.
18. Open `https://YOUR-DOMAIN`, sign in, and place an order. The panel shows three **Saved** rows.

## Changing a variable later

1. Project > **Settings** > **Environment Variables**. Edit and save.
2. **Deployments** > the three dots on the latest deployment > **Redeploy**.

**Variables only take effect after a redeploy.** Every `git push` to `main` also deploys again.

## ✅ Check

* `https://YOUR-DOMAIN/api/health` shows `"status": "ok"` and three `"ok"` databases.
* You can sign in on the live site, and a live order appears under **My orders** for all three databases.
* `.env` is not in your GitHub repo (search the repo for `.env`: only `.env.example` exists).

## If it fails

* **404 for the whole site, or the build cannot find `package.json`:** Root Directory is wrong. **Settings** > **Build and Deployment** > **Root Directory** must be empty (or `./`, the repo root, where `package.json` is). Clear it, save, then redeploy.
* **The page lists missing `VITE_` variables:** they were not set when it was built. Add them and **Redeploy**.
* **A database shows `not_configured`:** its variable is missing on Vercel. Add it, redeploy.
* **Firestore `error`, logs mention `PEM` or "private key":** fix `FIREBASE_PRIVATE_KEY` (step 13), redeploy.
* **"This domain is not allowed to sign in yet.":** add the exact domain in Authorized domains (step 16). Preview URLs (long names with random letters) need adding too, or use the main domain.
* **Logs:** project > **Logs** (runtime), **Deployments** (build).
* More: [08-troubleshooting.md](08-troubleshooting.md). Every variable: [ENV-GUIDE.md](ENV-GUIDE.md#paste-into-vercel-or-netlify).

Next (optional): [07-deploy-netlify.md](07-deploy-netlify.md)
