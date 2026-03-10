require("dotenv").config();
const express    = require("express");
const http       = require("http");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const { WebSocketServer } = require("ws");

const { seedCardTypes }  = require("./src/config/seed");
const { authMiddleware } = require("./src/middleware/auth");
const { errorHandler }   = require("./src/middleware/errorHandler");
const { wsHandler }      = require("./src/services/websocket");

// ─── In-memory store (swap for PostgreSQL via pg in production) ─────────────
global.store = {
  users:         new Map(),
  listings:      new Map(),
  orders:        new Map(),
  escrow:        new Map(),
  conversations: new Map(),
  messages:      new Map(),
  cardTypes:     new Map(),
};
seedCardTypes(global.store.cardTypes);

// ─── App & HTTP server ───────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── WebSocket server ────────────────────────────────────────────────────────
const wss  = new WebSocketServer({ server, path: "/ws" });
global.wss = wss;
wsHandler(wss);

// ─── Global middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use("/api",      rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Too many requests, slow down." } }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 20,  message: { error: "Too many auth attempts." } }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./src/routes/auth"));
app.use("/api/cards",    require("./src/routes/cards"));
app.use("/api/listings", authMiddleware, require("./src/routes/listings"));
app.use("/api/trades",   authMiddleware, require("./src/routes/trades"));
app.use("/api/wallet",   authMiddleware, require("./src/routes/wallet"));
app.use("/api/chat",     authMiddleware, require("./src/routes/chat"));

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({
  status:  "ok",
  uptime:  process.uptime(),
  memory:  process.memoryUsage(),
  timestamp: new Date().toISOString(),
}));

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════╗");
  console.log("║        FlexSwap Backend            ║");
  console.log("╠════════════════════════════════════╣");
  console.log(`║  API  →  http://localhost:${PORT}     ║`);
  console.log(`║  WS   →  ws://localhost:${PORT}/ws   ║`);
  console.log("╚════════════════════════════════════╝\n");
});

module.exports = { app, server };
