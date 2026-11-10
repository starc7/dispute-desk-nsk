// The server has two jobs:
// 1. Keep the Claude API key secret and pass AI requests to Claude.
// 2. In production, serve the built screens (the dist folder).
import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "200kb" }));
app.set("trust proxy", 1); // so req.ip is the visitor's IP behind a host's proxy

const PORT = Number(process.env.PORT) || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const LIMIT = Number(process.env.RATE_LIMIT_PER_10_MIN) || 40;

// Simple in-memory rate limit, so a public link can't drain your API credit.
const hits = new Map();
function rateLimited(ip) {
  const windowMs = 10 * 60 * 1000;
  const nowMs = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => nowMs - t < windowMs);
  recent.push(nowMs);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

// The screens call this on load to know whether live AI is available.
app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: MODEL, aiConfigured: Boolean(API_KEY) });
});

// The only AI endpoint. The browser sends a system prompt and a user message.
// The server adds the secret key and calls Claude's Messages API.
app.post("/api/claude", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not set on the server" });
  if (rateLimited(req.ip)) return res.status(429).json({ error: "Too many AI requests. Try again in a few minutes." });

  const { system, user } = req.body || {};
  if (typeof system !== "string" || typeof user !== "string" || system.length > 8000 || user.length > 20000) {
    return res.status(400).json({ error: "Request must include short 'system' and 'user' strings" });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || `Claude API returned ${upstream.status}` });
    }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    res.json({ text, usage: data.usage, model: data.model });
  } catch (err) {
    res.status(502).json({ error: `Could not reach the Claude API: ${err.message}` });
  }
});

// Serve the built screens if they exist (after `npm run build`).
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Dispute Desk server on http://localhost:${PORT}`);
  console.log(API_KEY ? `Live AI on, model: ${MODEL}` : "No ANTHROPIC_API_KEY found. The app will run in offline mode.");
});
