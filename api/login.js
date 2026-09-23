// Vercel turns every file in api/ into a URL: this file answers POST /api/login.
import { handle } from "../server/runtime.js";

export const POST = handle;

// The browser asks "may I?" with an OPTIONS request before a cross site call.
export const OPTIONS = handle;
