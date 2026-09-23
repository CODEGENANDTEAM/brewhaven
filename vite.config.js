// Vite settings for the Brew Haven website.
//
// In production, Vercel or Netlify run the files in api/ (or netlify/functions/)
// as serverless functions. On your laptop, `npm run dev` starts Vite, and the
// small plugin below sends /api/... requests to that same API code, so the
// website and the API share one address: http://localhost:5173

import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function localApi() {
  return {
    name: "brew-haven-local-api",

    // configureServer only runs for `npm run dev`, never for `npm run build`.
    configureServer(server) {
      // Load every value from .env (the "" means all names, not only VITE_ ones)
      // so the server code can read COCKROACH_DATABASE_URL, MYSQL_DATABASE_URL and so on.
      // Values that are already set in your terminal win over .env.
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const [name, value] of Object.entries(env)) {
        if (process.env[name] === undefined) process.env[name] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || "").split("?")[0];
        if (pathname !== "/api" && !pathname.startsWith("/api/")) return next();

        // Import the server code only when an API request arrives.
        // The browser bundle never includes it, so secrets stay on the server.
        try {
          const adapterUrl = pathToFileURL(path.resolve("server/node-adapter.js")).href;
          const { handleNodeRequest } = await import(adapterUrl);
          await handleNodeRequest(req, res);
        } catch (error) {
          next(error); // Vite shows the error in the terminal
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  server: {
    port: 5173,
  },
  build: {
    // The Firebase SDK alone is about 700 kB, so we raise the size warning
    // a little. The file is compressed to about 250 kB when it is downloaded.
    chunkSizeWarningLimit: 1000,
  },
});
