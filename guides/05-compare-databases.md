# 05. Compare the three databases

**Goal:** use the **Database** and **Save to** switches to see the fan-out, create drift on purpose, and compare how Firestore and SQL store the same order.

You need all three databases working (guide 04 ended with `3 of 3 databases working`). Run `npm run dev` and open [http://localhost:5173](http://localhost:5173). Sign in.

## The two switches in the header

* **Database** decides where the **Shop** and **My orders** pages **read** from. A light next to each database shows its health.
* **Save to** decides where sign ins and orders are **written**:
  * **All databases** (the default): written to every database at the same time.
  * **Only &lt;picked database&gt;**: written to that one database only.

Both choices are remembered in your browser. The line under the page title says which database answered, for example **Products read from CockroachDB**.

## Exercise 1: one order, three copies

1. Set **Save to** to **All databases**.
2. Add two products to the cart and click **Place order**. Note the short id in **Order XXXXXXXX saved to:** and the three **Saved** rows.
3. Click **My orders**.
4. Switch **Database** to **Firebase Firestore**, then **CockroachDB**, then **MySQL (Aiven)**. Each time, read the line **Orders read from ...**.
5. Compare the full id on the order's **Order id** line. **It is the same in all three.** The server makes the id (a UUID) once and sends it to every database.

## Exercise 2: create drift on purpose

1. Set **Database** to **MySQL (Aiven)**.
2. Set **Save to** to **Only MySQL (Aiven)**.
3. Place an order. The panel shows **one** row: MySQL. The footer says **Logins and orders are being saved only to MySQL (Aiven)**.
4. Click **My orders**: the new order is there.
5. Switch **Database** to **CockroachDB**. The new order is **missing**. The databases have **drifted**: they no longer hold the same data.
6. **Set Save to back to All databases.**

Why this matters: writing to three databases is a **dual write** (here a triple write). There is no transaction across them. If one is down when you order, it misses that order, and nothing fixes it later. Real systems use an outbox table or change data capture. The results panel is honest about each write, so you can see it happen.

Also try (optional): with **Save to: All databases**, power off the Aiven service (or break the password in `MYSQL_DATABASE_URL` and restart). Place an order: two **Saved** rows and one error. The order still counts, because at least one database saved it. Fix it afterwards.

## Exercise 3: look at the raw data

Find your order id from **My orders**, then look for it in each console:

* **Firestore:** Firebase console > **Firestore Database** > **Data** > `orders` > the document with that id.
* **CockroachDB:** cluster > **SQL Shell** (see [03-cockroachdb.md](03-cockroachdb.md#e-look-at-the-data)).
* **MySQL:** Aiven **Quick connect** or a SQL tool (see [04-aiven-mysql.md](04-aiven-mysql.md#f-look-at-the-data)).

```sql
SELECT * FROM orders WHERE id = 'paste-the-full-order-id-here';
SELECT * FROM order_items WHERE order_id = 'paste-the-full-order-id-here';
```

## Side by side: a document versus tables

**Firestore** keeps one **document** per order, with the items **inside** it:

```
orders/3f2b9c1e-...   (the document id is the order id)
  userUid:   "abc123"
  userEmail: "you@example.com"
  total:     79800
  currency:  "INR"
  status:    "placed"
  items: [
    { productId: "brew-haven-mug", name: "Brew Haven Mug", unitPrice: 39900, quantity: 2 }
  ]
  createdAt: (timestamp)
```

**CockroachDB and MySQL** split it into **two tables** and join them when reading:

```
orders
id           user_uid  total  currency  status  created_at
3f2b9c1e-..  abc123    79800  INR       placed  2026-09-23 10:30:00

order_items
order_id     product_id      product_name    unit_price  quantity
3f2b9c1e-..  brew-haven-mug  Brew Haven Mug  39900       2
```

| | Firestore | CockroachDB / MySQL |
|---|---|---|
| Shape | Documents in collections | Rows in tables with a fixed schema |
| Order items | Embedded in the order | Own table, linked by `order_id` |
| Reading an order | One document read | Two queries or a `JOIN` |
| Tables created by | Nothing: created on first write | `init()` runs `CREATE TABLE IF NOT EXISTS` |
| Adapter file | `src/database/firebase.js` | `src/database/cockroachdb.js`, `src/database/mysql.js` |

Open two adapter files side by side in VS Code. They export the same six functions (`init`, `ping`, `upsertUser`, `listProducts`, `createOrder`, `listOrdersForUser`). The rest of the app only calls those, so it never knows which database is underneath.

## ✅ Check

* The same order id appears under **My orders** for all three databases.
* You made one order that exists only in MySQL.
* **Save to** is back on **All databases**.

## If it fails

* **The line says "... is not set up, so this is showing ... instead":** that database is not configured or did not answer, so reads fell back to another one. Run `npm run check`.
* **"Could not save your order: ... is not set up yet":** **Save to: Only** never falls back. Pick a working database, or save to all.
* **A database shows "(not set up)" in the switch:** its variable is empty in `.env`, or you did not restart `npm run dev`.
* More: [08-troubleshooting.md](08-troubleshooting.md).

Next: [06-deploy-vercel.md](06-deploy-vercel.md)
