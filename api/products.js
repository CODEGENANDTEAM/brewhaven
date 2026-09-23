// Vercel turns every file in api/ into a URL: this file answers /api/products.
import { handle } from "../server/runtime.js";

export const GET = handle;

// The browser asks "may I?" with an OPTIONS request before a cross site call.
export const OPTIONS = handle;
