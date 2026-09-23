# 00. Start here

**Goal:** get the Brew Haven code onto your laptop, installed, with an empty `.env` file ready to fill in.

## What we build today

**Brew Haven** is a small coffee shop website. You sign in with Google, add coffees to a cart and place an order.

The twist: every sign in and every order is saved to **three databases at the same time**:

| Database | Kind | Where it runs |
|---|---|---|
| Firebase Firestore | Document database (NoSQL) | Google Cloud |
| CockroachDB | Distributed SQL, speaks PostgreSQL | CockroachDB Cloud |
| MySQL | Classic SQL | Aiven |

A **Database** switch in the header picks which one the page reads from. A **Save to** switch picks whether a write goes to all of them or only one. By the end you will have the site live on the internet.

## What is in this repo

The whole project is one app. The folder you clone **is** the app: `package.json`, `.env.example` and this `guides/` folder are all at the top level.

| Folder or file | What it holds |
|---|---|
| `src/` | The React app (the pages you see) and `src/database/`, one small adapter file per database |
| `server/` | Shared server code: the product catalog, the API rules and the fan-out to every database |
| `api/` | The API as Vercel functions |
| `netlify/functions/` and `netlify.toml` | The same API as a Netlify function, plus Netlify's build settings |
| `tools/` | Helpers: `npm run setup:firebase` (key file to `.env`) and `npm run check` (test every database) |
| `test/` | Tests with fake databases (`npm test`) |
| `guides/` | These step by step guides |
| `.env.example` | The list of settings you copy to `.env` and fill in |
| `README.md` | The long, detailed version of every guide |

## What you need

* **Node.js 22.12 or newer.** Check with `node -v`. Get it from [nodejs.org](https://nodejs.org) (the LTS version).
* **Git.** Check with `git --version`. Get it from [git-scm.com](https://git-scm.com).
* **A GitHub account** (free), for deploying.
* **A Google account**, for Firebase and to sign in to the shop.
* **VS Code** (or any code editor), to edit `.env`.

All the cloud services have free tiers. Offers change, so check the current page when you sign up.

## Steps

1. Open a terminal. On Windows, use **PowerShell** or **Git Bash**. On Mac, use **Terminal**.
2. Go to a folder where you keep projects, for example:

   ```bash
   cd Desktop
   ```

3. Clone the repo. `<repo-url>` is the link your instructor shares:

   ```bash
   git clone <repo-url>
   ```

4. Go into the project folder. Everything today happens inside **`brewhaven`**:

   ```bash
   cd brewhaven
   ```

5. Install the packages (takes a minute):

   ```bash
   npm install
   ```

6. Create your own `.env` from the example.

   Windows PowerShell:

   ```powershell
   copy .env.example .env
   ```

   Mac, Linux or Git Bash:

   ```bash
   cp .env.example .env
   ```

7. Open the folder in VS Code: `code .` (or **File > Open Folder** and pick the `brewhaven` folder). Open `.env`. It has empty values for now. You fill them in guide by guide.

## The golden rule for secrets

**Nothing secret ever goes into GitHub.** Not in code, not in a commit, not "just for a minute". Bots scan GitHub for keys all day, and a pushed key stays in the history even after you delete it.

* Secrets live in **`.env`** on your laptop and in the **Vercel or Netlify** settings. Nowhere else.
* `.env` is already listed in `.gitignore`, so Git ignores it. Keep it that way.
* Never put `VITE_` in front of a secret. Anything starting with `VITE_` is sent to every visitor's browser.
* Do not paste keys into chat, screenshots or slides.

[ENV-GUIDE.md](ENV-GUIDE.md) explains every variable: what it is, whether it is secret, and where to click to get it.

## The guides, in order

| # | Guide | About |
|---|---|---|
| 00 | this page | 10 min |
| 01 | [Firebase](01-firebase.md): Google sign in and Firestore | 20 min |
| 02 | [Run it locally](02-run-locally.md) | 10 min |
| 03 | [CockroachDB](03-cockroachdb.md) | 15 min |
| 04 | [MySQL on Aiven](04-aiven-mysql.md) | 15 min |
| 05 | [Compare the databases](05-compare-databases.md) | 15 min |
| 06 | [Deploy on Vercel](06-deploy-vercel.md) | 15 min |
| 07 | [Deploy on Netlify](07-deploy-netlify.md) (optional, or instead of 06) | 15 min |
| 08 | [Troubleshooting](08-troubleshooting.md) | when stuck |

Want the deep version of any step? The long guide is the [README](../README.md) at the top of the project.

## ✅ Check

* `node -v` prints `v22.12.0` or higher.
* Your terminal is inside the project folder, `brewhaven` (run `ls` or `dir` and you see `package.json` and `.env.example`).
* `npm install` finished without red `ERR!` lines.
* A file called `.env` exists next to `.env.example`.
* Bonus: `npm test` passes. The tests use fake databases, so they need no accounts yet.

## If it fails

* **`node` is not recognized / version too old:** install Node 22 LTS from nodejs.org, then **close and reopen** the terminal.
* **`npm install` says `Could not read package.json`:** you are in the wrong folder. `cd` into the project folder, `brewhaven` (the one with `package.json`).
* **`copy` or `cp` not found:** you used the command for the other shell. Try the other one, or copy the file in VS Code (right click `.env.example` > **Copy**, **Paste**, rename to `.env`).
* **`git clone` asks for a password:** check the address with your instructor. A public repo does not need one.
* More fixes: [08-troubleshooting.md](08-troubleshooting.md).

Next: [01-firebase.md](01-firebase.md)
