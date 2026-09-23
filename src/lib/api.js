// Small helpers for talking to our API.
//
// The API runs on the SAME domain as the website (serverless functions, or
// the Vite dev proxy), so we use relative paths like "/api/products".

import { getIdToken } from "./firebase.js";

// Sends one request and returns the parsed JSON.
// options.auth: true adds the Firebase ID token so the server knows who we are.
// If the server answers with { error: "..." } we throw that message.
// When the answer also has `results` (one entry per database, sent with a 503
// when no database saved the data), we keep them on the error as err.results
// so the page can still show which database failed and why.
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${await getIdToken()}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only throws when the request never reached a server.
    throw new Error("Could not reach the server. Check your internet connection and try again.");
  }

  // Some errors (like a host's own 404 page) are not JSON, so parse carefully.
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : `The server answered with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    if (data && Array.isArray(data.results)) error.results = data.results;
    throw error;
  }
  return data;
}

// Adds "?name=<value>" only when there is a value, e.g. "?from=mysql" or "?to=mysql".
function withParam(path, name, value) {
  return value ? `${path}?${name}=${encodeURIComponent(value)}` : path;
}

// { status, primary, databases: [{ id, label, state, error?, missingEnv? }] }
export function getHealth() {
  return request("/api/health");
}

// { source, products } where source is a database id or "catalog".
// from: the database to read from, or empty for the server's primary one.
// Each product is { id, name, description, price, emoji, category }, price in paise.
export function getProducts(from) {
  return request(withParam("/api/products", "from", from));
}

// Saves the signed in user to every database, or only to `to` when given.
// { user, results: [{ id, label, state, error?, missingEnv?, data?: User }] }
export function login({ to } = {}) {
  return request(withParam("/api/login", "to", to), { method: "POST", auth: true });
}

// items: [{ productId, quantity }]. The server looks up the prices itself.
// to: save only to this database; leave it out to save to every database.
// { order, results } where results has one entry per database it wrote to.
export function placeOrder(items, { to } = {}) {
  return request(withParam("/api/orders", "to", to), { method: "POST", auth: true, body: { items } });
}

// { source, orders } for the signed in user, newest first.
// from: the database to read from, or empty for the server's primary one.
export function getMyOrders(from) {
  return request(withParam("/api/orders", "from", from), { auth: true });
}
