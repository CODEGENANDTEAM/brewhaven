# 04. MySQL on Aiven: the third database

**Goal:** a free MySQL service on Aiven, its Service URI in `.env` as `MYSQL_DATABASE_URL`, its CA certificate in `MYSQL_CA_CERT`, and all three databases working.

**What is Aiven?** A company that runs open source databases for you. Its **Free** plan includes one small MySQL service with no credit card. Offers change, so check the current page ([aiven.io/free-mysql-database](https://aiven.io/free-mysql-database)).

Two things to know about the free plan:

* **You cannot choose the cloud or region.** Aiven assigns it. That is fine; calls may just be a little slower.
* **Idle free services are powered off.** Your data is kept, and you can power it back on at any time (part E).

## A. Create the service

1. Sign up at [console.aiven.io](https://console.aiven.io). Aiven creates an organization and a project for you.
2. You land on a **create service** screen (or open **Services > Create service**). **Careful: it is preselected on PostgreSQL.** Click the **MySQL** tile.
3. Choose the **Free** plan (it may be a tab or a **Service tier** option). The plan shows as something like `free-1-1gb`.
4. The cloud and region are filled in for you. You cannot change them on the free plan. Leave them.
5. Service name: for example `brew-haven-mysql`. Click **Create free service** (or **Create service**).
6. The status shows **Rebuilding**. **Wait until it says Running** with a green dot (a few minutes). Until then its host name does not exist yet, and connecting fails with `ENOTFOUND`.

## B. Copy the Service URI

7. Open the service. On **Overview**, find **Connection information** (or click **Quick connect**).
8. Next to **Service URI**, click the **eye** icon to show the password, then the **copy** icon.
9. Paste it into `.env` on one line. It looks like this (**fake**):

   ```
   MYSQL_DATABASE_URL=mysql://avnadmin:AVNS_xxxxxxxxxxxx@brew-haven-mysql-yourname.c.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
   ```

   It must start with `mysql://` and contain the real password (not `****`).

## C. Add the CA certificate (recommended)

Without it the connection is still encrypted, but the server does not check **who** it is talking to. The certificate is not secret.

10. On **Overview**, next to **CA certificate**, click the download icon. You get `ca.pem` (in **Downloads**).
11. Turn it into one line. In the terminal, inside the project folder (change the path to where `ca.pem` is):

    ```bash
    node -e "console.log(JSON.stringify(require('fs').readFileSync('C:/Users/you/Downloads/ca.pem', 'utf8')))"
    ```

    On a Mac the path is like `/Users/you/Downloads/ca.pem`.

12. Copy the whole output, quotes included, and paste it after `MYSQL_CA_CERT=`:

    ```
    MYSQL_CA_CERT="-----BEGIN CERTIFICATE-----\nMIIEQTCCAqmgAwIBAgIUfake...\n-----END CERTIFICATE-----\n"
    ```

13. Save `.env`. Stop `npm run dev` if it is running.

## D. Test it

14. Run:

    ```bash
    npm run check
    ```

    You want `3 of 3 databases working`. The first run creates the MySQL tables and copies the 8 products in.

15. Run `npm run dev`. [http://localhost:5173/api/health](http://localhost:5173/api/health) shows all three `"ok"`. Place an order: the panel shows three **Saved** rows.

## E. Power it back on after it idles

Aiven emails you before it powers off an idle free service.

1. [console.aiven.io](https://console.aiven.io) > **Services**. A sleeping service shows **Powered off**.
2. Open it and click **Power on** (it may be under **Actions** or the three dots menu).
3. Wait for **Running**. Host, port and password stay the same. Nothing in `.env` changes.

## F. Look at the data

* The service page has **Quick connect** with ready made snippets for many tools.
* Or use MySQL Workbench, DBeaver, or VS Code's **SQLTools** extension with its MySQL driver: host, port, user `avnadmin`, password, database `defaultdb`, SSL **on**.

```sql
SELECT uid, email, login_count, last_login_at FROM users;

SELECT o.id, o.created_at, o.total, i.product_name, i.quantity, i.unit_price
FROM orders o
JOIN order_items i ON i.order_id = o.id
ORDER BY o.created_at DESC;
```

## ✅ Check

* The service shows **Running**.
* `npm run check` ends with `3 of 3 databases working`.
* A new order shows **Saved** for all three databases.

## If it fails

* **`ENOTFOUND` / `getaddrinfo`:** the service is still **Rebuilding**. Wait for **Running**, then run the check again. If it is Running, copy the Service URI again.
* **`ECONNREFUSED` or `ETIMEDOUT`:** the service is **Powered off**. Power it on (part E). Also check the port in the URL.
* **`Access denied`:** the password in the URL is wrong or still hidden as `****`. Use the eye icon, copy again.
* **Certificate error after adding `MYSQL_CA_CERT`:** the value was cut short. Run the one-liner again and paste the whole output, quotes included. Or leave it empty for now.
* **You made a PostgreSQL service by mistake:** its URI starts with `postgres://`. Delete it and create a **MySQL** one.
* More: [08-troubleshooting.md](08-troubleshooting.md).

Next: [05-compare-databases.md](05-compare-databases.md)
