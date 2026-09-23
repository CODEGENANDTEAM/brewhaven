# 03. CockroachDB: the second database

**Goal:** a free CockroachDB cluster, its connection string in `.env` as `COCKROACH_DATABASE_URL`, and your orders visible in its SQL tables.

## What is CockroachDB? (2 minute version)

* It is a **distributed SQL** database. Your data is copied across several machines, so it keeps working when one fails.
* It speaks the **PostgreSQL** protocol. The app talks to it with the normal Postgres driver (`pg`), and connection strings start with `postgresql://`.
* It is **not MySQL**. MySQL is the third database (guide 04), a different product with a slightly different SQL dialect.
* A **SQL user** is a user **inside your CockroachDB cluster** (like `brewadmin`). It is not your CockroachDB website login and not a Google account.

**Price:** CockroachDB Cloud has a free monthly allowance on the **Basic** plan, and this app uses a tiny part of it. Offers change, so check the current page when you sign up.

## A. Create the cluster

1. Sign up at [cockroachlabs.cloud](https://cockroachlabs.cloud) (Google or GitHub sign up is fine).
2. Click **Create cluster**.
3. Choose the **Basic** plan.
4. **Cloud provider:** **AWS**. **Region:** **us-east-1 (N. Virginia)**. (A region cannot be removed later.)
5. **Capacity:** if asked, keep the free option or set a **spend limit of $0**, so you can never be charged.
6. **Cluster name:** for example `brew-haven` (6 to 20 characters: lowercase letters, numbers, dashes). Click **Create cluster** and wait until it is ready.

## B. Create a SQL user

7. Open the cluster and click **Connect** (top right). If you have no SQL user yet, click **Create user** (or go to **Security > SQL Users > Add user**).
8. Username: `brewadmin`. Click **Generate & save password**.
9. **Copy the password now.** It is shown **only once**. Keep it in a password manager, not in a file in the repo.

## C. Copy the connection string

10. Still in **Connect**: pick your **SQL user**, database **`defaultdb`**, and under **Select option / Language** choose **General connection string**.
11. Copy it and paste it into `.env` on one line. It looks like this (**fake**):

    ```
    COCKROACH_DATABASE_URL=postgresql://brewadmin:AbCdEf123456@brew-haven-1234.j77.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
    ```

    * No quotes and no spaces.
    * If the dialog shows `<ENTER-SQL-USER-PASSWORD>` instead of the password, replace it with the password from step 9.
    * **Special characters:** if the password has symbols like `@ # / ? ! :`, they must be URL encoded (`@` becomes `%40`, `!` becomes `%21`). Generated passwords normally have none.
    * Leave `COCKROACH_CA_CERT` **empty**. Node already trusts the cluster's certificate.

12. Save `.env`. Stop `npm run dev` if it is running (`Ctrl + C`).

## D. Test it

13. Run:

    ```bash
    npm run check
    ```

    CockroachDB should say `ok: 8 products`. The first run also **creates the tables** (`users`, `products`, `orders`, `order_items`) and copies the 8 products in. There is no schema to paste.

14. Run `npm run dev`, open [http://localhost:5173](http://localhost:5173), sign in again and place a new order. The results panel now shows **Saved** for **Firebase Firestore** and **CockroachDB**.

## E. Look at the data

15. In the CockroachDB console, open your cluster. Use **SQL Shell** if your cluster menu has one. (Or run `cockroach sql --url "<your connection string>"` from a terminal; the **Connect** dialog, option **CockroachDB Client**, shows how to install it.)
16. Try:

    ```sql
    SELECT uid, email, login_count, last_login_at FROM users;

    SELECT id, total, status, created_at FROM orders ORDER BY created_at DESC;

    SELECT o.id, o.created_at, o.total, i.product_name, i.quantity, i.unit_price
    FROM orders o
    JOIN order_items i ON i.order_id = o.id
    ORDER BY o.created_at DESC;
    ```

    Prices are in **paise** (100 paise = 1 rupee), so `45000` means ₹450.

Orders you placed **before** adding CockroachDB are not in it. Nothing copies old data across. That is your first taste of **drift** (guide 05).

## ✅ Check

* The cluster shows as ready in a US East region.
* `npm run check` shows a `✓` line for **CockroachDB** with `ok: 8 products`.
* A new order shows **Saved** for CockroachDB, and the JOIN query returns its items.

## If it fails

* **`password authentication failed`:** wrong password, `<ENTER-SQL-USER-PASSWORD>` still in the URL, or special characters not encoded. Set a new password in **SQL Users** and copy a fresh string.
* **`ENOTFOUND` / `getaddrinfo`:** the host part of the URL is cut off or mistyped. Copy it again, all on one line.
* **`self-signed certificate` or `unable to get local issuer certificate`:** set `COCKROACH_CA_CERT` (see [ENV-GUIDE.md](ENV-GUIDE.md#cockroach_ca_cert)).
* **`database "..." does not exist`:** the end of the URL must be `/defaultdb`.
* **Check is fine but the site still says not set up:** restart `npm run dev`.
* More: [08-troubleshooting.md](08-troubleshooting.md).

Next: [04-aiven-mysql.md](04-aiven-mysql.md)
