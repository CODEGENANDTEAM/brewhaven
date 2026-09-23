# 01. Firebase: Google sign in and the first database

**Goal:** a Firebase project with Google sign in and a Firestore database, and 7 values in your `.env`.

Firebase does two jobs here: **Google sign in** for everyone, and **Firestore**, the first of the three databases.

## A. Create the project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it, for example `brew-haven`. Firebase shows the **project ID** under the name, like `brew-haven-1a2b3`. Note it down.
4. Switch off Google Analytics and the AI assistant (not needed). Click **Create project**, then **Continue**.

## B. Switch on Google sign in

5. In the left menu open **Build > Authentication** (newer layouts may put it under **Security**). Click **Get started**.
6. Open the **Sign-in method** tab, click **Google**, switch **Enable** on.
7. Pick your email as the **Project support email** and click **Save**.

## C. Create the Firestore database

8. Open **Build > Firestore Database** and click **Create database**.
9. If it asks for an edition, choose **Standard**.
10. **Location:** choose **nam5 (United States)**. This can never be changed later.
11. Choose **Start in production mode** and click **Create**.
12. When it is ready, open the **Rules** tab. Delete everything in the editor, paste this, and click **Publish**:

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

## D. Register the web app (4 public values + the project ID)

13. Click the gear icon next to **Project Overview**, then **Project settings**.
14. On the **General** tab, scroll to **Your apps** and click the web icon **`</>`**.
15. Nickname: `brew-haven-web`. Leave **Firebase Hosting** unticked. Click **Register app**.
16. Firebase shows `const firebaseConfig = { ... }`. Copy these into `.env` (no quotes needed):

    | In the snippet | In `.env` |
    |---|---|
    | `apiKey` | `VITE_FIREBASE_API_KEY` |
    | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
    | `projectId` | `VITE_FIREBASE_PROJECT_ID` **and** `FIREBASE_PROJECT_ID` |
    | `appId` | `VITE_FIREBASE_APP_ID` |

    Example with **fake** values:

    ```
    VITE_FIREBASE_API_KEY=AIzaSyFAKEexampleKEYnotREAL123
    VITE_FIREBASE_AUTH_DOMAIN=brew-haven-1a2b3.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=brew-haven-1a2b3
    VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
    FIREBASE_PROJECT_ID=brew-haven-1a2b3
    ```

17. **Save `.env`** now. The next step reads `FIREBASE_PROJECT_ID` from it.

## E. Service account key (a secret: lets the server write to Firestore)

18. **Project settings**, **Service accounts** tab. Make sure **Node.js** is selected. Click **Generate new private key**, then **Generate key**. A `.json` file downloads to your **Downloads** folder.
19. In the terminal, inside the project folder (`brewhaven`), run:

    ```bash
    npm run setup:firebase -- --delete
    ```

    It finds the newest key file for your project in **Downloads**, writes `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` into `.env` in the right format, and deletes the `.json`. It never prints the key.

    Key saved somewhere else? `npm run setup:firebase -- C:\path\to\key.json --delete`

20. Check the output. You should see `✓ Saved FIREBASE_CLIENT_EMAIL ...` and `✓ Deleted the downloaded key file.`

## F. Test it

21. Run:

    ```bash
    npm run check
    ```

    Firebase should say `ok: 8 products`. CockroachDB and MySQL say `not set up` for now. That is expected.

## ✅ Check

* **Authentication > Sign-in method** shows Google as **Enabled**.
* Firestore **Rules** shows `allow read, write: if false;`.
* `.env` has all 4 `VITE_FIREBASE_...` values, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
* `npm run check` shows a `✓` line for **Firebase Firestore** with `ok: 8 products`.
* The key `.json` is gone from Downloads.

## If it fails

* **`No service account file ... found in Downloads`:** `FIREBASE_PROJECT_ID` in `.env` is empty, wrong, or not saved; or the key went to another folder. Pass the path as shown in step 19.
* **`That key is for project "x", but FIREBASE_PROJECT_ID ... is "y"`:** you downloaded the key from another Firebase project. Use the right project.
* **Output says `Now delete that .json file`:** the `--delete` flag did not arrive (it can happen in PowerShell). Run `node tools/import-firebase-key.mjs --delete`, or delete the file by hand and empty the recycle bin.
* **`No .env here`:** you are not in the project folder (`brewhaven`), or you skipped `copy .env.example .env`.
* **Check says `NOT_FOUND` / "Firestore is not created yet":** finish part C.
* **Check mentions `DECODER`, `PEM` or "private key":** run `npm run setup:firebase` again with a fresh key.
* Every variable explained: [ENV-GUIDE.md](ENV-GUIDE.md). More fixes: [08-troubleshooting.md](08-troubleshooting.md).

Next: [02-run-locally.md](02-run-locally.md)
