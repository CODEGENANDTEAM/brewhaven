// MySQL adapter, made for Aiven's free MySQL (MySQL 8).
// MYSQL_DATABASE_URL is the Aiven "Service URI", it looks like:
//   mysql://avnadmin:password@host.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED

import mysql from "mysql2/promise";

export const id = "mysql";
export const label = "MySQL (Aiven)";
export const requiredEnv = ["MYSQL_DATABASE_URL"];

// Every table ends with InnoDB + utf8mb4. InnoDB gives us transactions and
// foreign keys. utf8mb4 is MySQL's "real" UTF-8: the older utf8 cannot store
// emoji, and our products have an emoji column.
const TABLE_OPTIONS = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

// Aiven requires a primary key on every table. order_items has no id of its
// own, so its primary key is the pair (order_id, product_id).
const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(128) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NULL,
    name VARCHAR(255) NULL,
    photo_url VARCHAR(1024) NULL,
    login_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    position INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price INT NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    category VARCHAR(40) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_uid VARCHAR(128) NOT NULL,
    total INT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'placed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_user_created (user_uid, created_at),
    FOREIGN KEY (user_uid) REFERENCES users (uid)
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS order_items (
    order_id CHAR(36) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    unit_price INT NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  ) ${TABLE_OPTIONS}`,
];

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    emoji: row.emoji,
    category: row.category,
  };
}

function toUser(row) {
  return {
    uid: row.uid,
    email: row.email ?? null,
    name: row.name ?? null,
    photoUrl: row.photo_url ?? null,
    loginCount: Number(row.login_count),
    createdAt: toIso(row.created_at),
    lastLoginAt: toIso(row.last_login_at),
  };
}

function toItem(row) {
  return {
    productId: row.product_id,
    name: row.product_name,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
  };
}

function toOrder(row, items) {
  return {
    id: row.id,
    userUid: row.user_uid,
    total: Number(row.total),
    currency: row.currency,
    status: row.status,
    createdAt: toIso(row.created_at),
    items,
  };
}

function sslOptions(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;
  const ca = process.env.MYSQL_CA_CERT;
  if (ca) return { ca: ca.replace(/\\n/g, "\n") };
  // WORKSHOP SHORTCUT: the connection is still encrypted, but we do not check
  // who is on the other end. The proper fix is to set MYSQL_CA_CERT to the CA
  // certificate from the Aiven console, which turns full checking on.
  return { rejectUnauthorized: false };
}

function makePool() {
  let url;
  try {
    url = new URL(process.env.MYSQL_DATABASE_URL);
  } catch {
    // Never echo the value: it contains the password.
    throw new Error("MYSQL_DATABASE_URL is not a valid mysql:// URL.");
  }

  // Creating a pool does not connect yet. It connects on the first query.
  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || "defaultdb",
    connectionLimit: 2, // serverless functions should keep few connections open
    timezone: "Z", // read and write dates as UTC
    charset: "utf8mb4", // so emoji survive the trip to and from the server
    ssl: sslOptions(url.hostname),
  });

  // Make MySQL itself use UTC too, so CURRENT_TIMESTAMP matches the timezone setting above.
  pool.on("connection", (connection) => {
    // This is the plain (callback style) connection, so we pass a callback:
    // without one, a failure here would be an unhandled "error" event.
    connection.query("SET time_zone = '+00:00'", (error) => {
      if (error) console.error("Could not set the MySQL time zone:", error.message);
    });
  });

  return pool;
}

export function createDb() {
  // The pool is made on first use, so importing this file (or a bad URL)
  // never crashes the app: problems show up as this database's error instead.
  let pool = null;
  function getPool() {
    if (!pool) pool = makePool();
    return pool;
  }

  return {
    // Safe to run many times: tables are only created if missing, and products
    // are upserted by id so price or name edits in the catalog reach the DB.
    async init(products) {
      const db = getPool();
      for (const sql of CREATE_TABLES) await db.query(sql);
      if (!products || products.length === 0) return;

      // One multi-row INSERT. "VALUES ?" with an array of arrays expands to
      // (..), (..), (..) and every value is still escaped by mysql2.
      // "AS new" names the incoming row (MySQL 8.0.19+), so "new.name" means
      // "the name we tried to insert".
      const rows = products.map((p) => [
        p.id, p.position, p.name, p.description, p.price, p.emoji, p.category,
      ]);
      await db.query(
        `INSERT INTO products (id, position, name, description, price, emoji, category)
         VALUES ? AS new
         ON DUPLICATE KEY UPDATE
           position = new.position,
           name = new.name,
           description = new.description,
           price = new.price,
           emoji = new.emoji,
           category = new.category,
           updated_at = CURRENT_TIMESTAMP`,
        [rows]
      );
    },

    async ping() {
      await getPool().query("SELECT 1");
    },

    async upsertUser({ uid, email, name, photoUrl }) {
      const db = getPool();
      // First login inserts (login_count defaults to 1). Later logins hit the
      // duplicate key, so we bump the counter and refresh the profile instead.
      // The ? placeholders keep user input out of the SQL text (no SQL injection).
      await db.query(
        `INSERT INTO users (uid, email, name, photo_url, login_count)
         VALUES (?, ?, ?, ?, 1) AS new
         ON DUPLICATE KEY UPDATE
           email = new.email,
           name = new.name,
           photo_url = new.photo_url,
           login_count = users.login_count + 1,
           last_login_at = CURRENT_TIMESTAMP`,
        [uid, email ?? null, name ?? null, photoUrl ?? null]
      );
      const [rows] = await db.query("SELECT * FROM users WHERE uid = ?", [uid]);
      return toUser(rows[0]);
    },

    async listProducts() {
      const [rows] = await getPool().query("SELECT * FROM products ORDER BY position");
      return rows.map(toProduct);
    },

    async createOrder({ id: orderId, user, items, total, currency }) {
      // A transaction needs one dedicated connection: every statement below
      // must run on the same connection, then all commit (or none do).
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();

        // The order points at users.uid, so the user row must exist. IGNORE
        // means "skip if already there", so login_count is left untouched.
        await connection.query(
          "INSERT IGNORE INTO users (uid, email, name, login_count) VALUES (?, ?, ?, 1)",
          [user.uid, user.email ?? null, user.name ?? null]
        );

        await connection.query(
          "INSERT INTO orders (id, user_uid, total, currency, status) VALUES (?, ?, ?, ?, 'placed')",
          [orderId, user.uid, total, currency]
        );

        if (items.length > 0) {
          const rows = items.map((item) => [
            orderId, item.productId, item.name, item.unitPrice, item.quantity,
          ]);
          await connection.query(
            "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES ?",
            [rows]
          );
        }

        // Read the row back so createdAt is the time the database recorded.
        const [orderRows] = await connection.query("SELECT * FROM orders WHERE id = ?", [orderId]);

        await connection.commit();
        return toOrder(orderRows[0], items.map((item) => ({
          productId: item.productId,
          name: item.name,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        })));
      } catch (error) {
        await connection.rollback().catch(() => {}); // undo any half-written order
        throw error;
      } finally {
        connection.release(); // hand the connection back to the pool
      }
    },

    async listOrdersForUser(uid) {
      const db = getPool();
      // Two simple queries instead of a JOIN: first the orders, then all their
      // items at once, grouped in JavaScript.
      const [orderRows] = await db.query(
        "SELECT * FROM orders WHERE user_uid = ? ORDER BY created_at DESC, id DESC",
        [uid]
      );
      if (orderRows.length === 0) return [];

      // "IN (?)" with an array expands to IN ('a', 'b', ...), each value escaped.
      const [itemRows] = await db.query(
        "SELECT * FROM order_items WHERE order_id IN (?) ORDER BY product_name",
        [orderRows.map((row) => row.id)]
      );

      const itemsByOrder = new Map();
      for (const row of itemRows) {
        if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, []);
        itemsByOrder.get(row.order_id).push(toItem(row));
      }
      return orderRows.map((row) => toOrder(row, itemsByOrder.get(row.id) || []));
    },
  };
}
