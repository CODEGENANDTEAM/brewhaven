// Vercel turns every file in api/ into a URL: this file answers GET and POST /api/orders.
import { handle } from "../server/runtime.js";

export const GET = handle;
export const POST = handle;

// The browser asks "may I?" with an OPTIONS request before a cross site call.
export const OPTIONS = handle;
