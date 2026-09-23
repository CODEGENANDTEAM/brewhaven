// One Netlify function serves all of /api, using the same code as the Vercel files in api/.
import { handle } from "../../server/runtime.js";

export default (request) => handle(request);

// Tells Netlify to send every /api/... request to this function.
export const config = { path: "/api/*" };
