import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDatabase } from "./server/db";
import { startCronSyncEngine } from "./server/syncEngine";
import { apiRouter } from "./server/routes";
import { rateLimiter } from "./server/cache";

const app = express();
const PORT = 3000;

// Base parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limits to API endpoints
app.use("/api", rateLimiter);
app.use("/v1", rateLimiter);

// Mount Modular Express Router
app.use("/", apiRouter);

// Initialize persistent state schema structure & starts background schedulers
initDatabase();
startCronSyncEngine();

// --- INTEGRATING VITE INTERFACE MIDDLEWARES OR PRODUCTION STATICS ROUTER ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Woo SaaS Backend Server] Listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
