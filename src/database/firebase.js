// Firestore adapter. One of three database adapters; they all follow the same
// contract (see README.md), so the server can write to every database at once.
//
// Uses the Firebase Admin SDK, which skips security rules. That is fine because
// this code only runs on the server, where we check the user ourselves.
//
// Collections (Firestore creates them on the first write, no tables needed):
//   users/{uid}         { email, name, photoUrl, loginCount, createdAt, lastLoginAt }
//   products/{id}       { position, name, description, price, emoji, category, updatedAt }
//   orders/{orderId}    { userUid, userEmail, total, currency, status, items: [...], createdAt }
//
// Firestore has no joins, so each order keeps a copy of its items inside it.

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "../../server/firebase-admin.js";

export const id = "firebase";
export const label = "Firebase Firestore";
export const requiredEnv = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];

// Firestore stores dates as Timestamp objects; the API sends ISO strings.
function toIso(timestamp) {
  return timestamp && typeof timestamp.toDate === "function" ? timestamp.toDate().toISOString() : null;
}

function toProduct(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    price: Number(data.price),
    emoji: data.emoji,
    category: data.category,
  };
}

function toUser(doc) {
  const data = doc.data();
  return {
    uid: doc.id,
    email: data.email ?? null,
    name: data.name ?? null,
    photoUrl: data.photoUrl ?? null,
    loginCount: Number(data.loginCount),
    createdAt: toIso(data.createdAt),
    lastLoginAt: toIso(data.lastLoginAt),
  };
}

function toOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    userUid: data.userUid,
    total: Number(data.total),
    currency: data.currency,
    status: data.status,
    createdAt: toIso(data.createdAt),
    items: (data.items || []).map((item) => ({
      productId: item.productId,
      name: item.name,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    })),
  };
}

export function createDb() {
  // Connect lazily, on first use, so importing this file never touches the network.
  let firestore = null;
  const store = () => (firestore ??= getFirestore(getAdminApp()));
  const users = () => store().collection("users");
  const products = () => store().collection("products");
  const orders = () => store().collection("orders");

  return {
    // Write every catalog product, using its slug as the document id.
    // merge: true makes this safe to run again and again: a price change in the
    // catalog simply overwrites the old price.
    async init(catalogProducts) {
      const batch = store().batch();
      for (const product of catalogProducts) {
        batch.set(
          products().doc(product.id),
          {
            position: product.position,
            name: product.name,
            description: product.description,
            price: product.price,
            emoji: product.emoji,
            category: product.category,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      await batch.commit();
    },

    // Cheapest possible round trip: read at most one document.
    async ping() {
      await products().limit(1).get();
    },

    async upsertUser({ uid, email, name, photoUrl }) {
      const ref = users().doc(uid);
      // A transaction reads and then writes as one step, so two logins at the
      // same moment cannot both think the user is new.
      await store().runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const profile = { email: email ?? null, name: name ?? null, photoUrl: photoUrl ?? null };
        if (!snapshot.exists) {
          tx.set(ref, {
            ...profile,
            loginCount: 1,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
          });
        } else {
          tx.update(ref, {
            ...profile,
            // increment() adds on the server, so we never overwrite a newer count.
            loginCount: FieldValue.increment(1),
            lastLoginAt: FieldValue.serverTimestamp(),
          });
        }
      });
      // Read it back so the server timestamps are filled in.
      return toUser(await ref.get());
    },

    async listProducts() {
      const snapshot = await products().orderBy("position").get();
      return snapshot.docs.map(toProduct);
    },

    async createOrder({ id: orderId, user, items, total, currency }) {
      const userRef = users().doc(user.uid);
      const orderRef = orders().doc(orderId);

      // One transaction: the user and the order are saved together or not at all.
      // Firestore wants all reads before any writes inside a transaction.
      await store().runTransaction(async (tx) => {
        const [userSnap, orderSnap] = await Promise.all([tx.get(userRef), tx.get(orderRef)]);
        if (orderSnap.exists) {
          throw new Error("An order with this id already exists.");
        }

        // Normally the user logged in first, but make sure the document exists.
        // We do not bump loginCount here: placing an order is not a login.
        if (!userSnap.exists) {
          tx.create(userRef, {
            email: user.email ?? null,
            name: user.name ?? null,
            photoUrl: null,
            loginCount: 1,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
          });
        }

        // create() (not set()) fails if the id is taken, so an order is never overwritten.
        tx.create(orderRef, {
          userUid: user.uid,
          userEmail: user.email ?? null,
          total,
          currency,
          status: "placed",
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      return toOrder(await orderRef.get());
    },

    async listOrdersForUser(uid) {
      // We sort in code instead of with orderBy, so Firestore does not ask for a composite index.
      const snapshot = await orders().where("userUid", "==", uid).get();
      return snapshot.docs
        .map(toOrder)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    },
  };
}
