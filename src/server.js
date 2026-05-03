/**
 * Deep Research Workflow — Express Server
 * 
 * B.L.A.S.T. Layer 2 (Navigation/Decision Making)
 * This server acts as the router — it calls Tools in the right order
 * based on incoming API requests. It does not contain business logic itself.
 * 
 * Architecture: see architecture/api_routes.md
 * Tools: see tools/modelClient.js, tools/sessionStore.js
 */

require("dotenv").config();
const express = require("express");
const path = require("path");

// ─── Layer 3: Tools ───
const { callModel, MODELS } = require("../tools/modelClient");
const {
  createSession,
  getSession,
  updateSession,
  trackTokens,
  saveManualResponse,
  listSessions,
} = require("../tools/sessionStore");

const session = require("express-session");

const app = express();
app.use(express.json({ limit: "5mb" }));

// ─── Session middleware (for login) ───
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
  }
}));

// ─── Auth middleware ───
function requireAuth(req, res, next) {
  // Always allow login-related routes
  if (req.path === "/login" || req.path === "/login.html" || 
      req.path === "/api/login" || req.path === "/api/logout") {
    return next();
  }
  
  // Check if authenticated
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  // API routes return 401 JSON
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Everything else redirects to login
  return res.redirect("/login");
}

// Apply auth check to ALL requests
app.use(requireAuth);

// Login page route (serves the standalone login.html)
app.get("/login", (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

// Login API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.APP_USERNAME || "admin";
  const validPass = process.env.APP_PASSWORD || "admin";

  if (username === validUser && password === validPass) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Invalid credentials" });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Static files (ONLY served to authenticated users, since requireAuth runs first)
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════
// API ROUTES (Layer 2: Navigation)
// ═══════════════════════════════════════════

// Create new research session
app.post("/api/session", (req, res) => {
  const session = createSession();
  res.json({ id: session.id });
});

// Get session
app.get("/api/session/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// Update session state (safely — uses whitelisted fields in sessionStore)
app.patch("/api/session/:id", (req, res) => {
  const session = updateSession(req.params.id, req.body);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// ─── Call a model (automated) ───
app.post("/api/call", async (req, res) => {
  const { sessionId, model, systemPrompt, userPrompt, deepResearch } = req.body;
  console.log(`\n  🤖 [API CALL] Model: ${model}, DeepResearch: ${deepResearch}, Session: ${sessionId?.slice(0, 8)}`);
  
  if (!sessionId) {
    console.error("  ❌ [API ERROR] No sessionId provided!");
    return res.status(400).json({ success: false, error: "No sessionId provided" });
  }

  try {
    const result = await callModel(model, systemPrompt, userPrompt, deepResearch);
    
    if (result.success) {
      console.log(`  ✅ [API SUCCESS] ${model} responded in ${result.ms}ms (${(result.tokens?.input + result.tokens?.output).toLocaleString()} tokens)`);
    } else {
      console.error(`  ❌ [API ERROR] ${model}: ${result.error}`);
    }

    // Track tokens via sessionStore tool
    if (result.tokens) {
      trackTokens(sessionId, model, result.tokens);
    }

    res.json(result);
  } catch (err) {
    console.error(`  💥 [SERVER CRASH] Unhandled error in /api/call: ${err.stack}`);
    res.status(500).json({ success: false, error: "Internal server error: " + err.message });
  }
});

// ─── Parallel call (all 3 API models at once) ───
app.post("/api/parallel", async (req, res) => {
  const { sessionId, systemPrompt, userPrompt } = req.body;

  console.log(`\n  ⚡ [PARALLEL CALL] Starting Claude, ChatGPT, and Gemini for session: ${sessionId.slice(0, 8)}...`);

  const results = await Promise.allSettled([
    callModel("claude", systemPrompt, userPrompt),
    callModel("chatgpt", systemPrompt, userPrompt),
    callModel("gemini", systemPrompt, userPrompt),
  ]);

  const output = {
    claude: results[0].status === "fulfilled" ? results[0].value : { success: false, error: results[0].reason?.message },
    chatgpt: results[1].status === "fulfilled" ? results[1].value : { success: false, error: results[1].reason?.message },
    gemini: results[2].status === "fulfilled" ? results[2].value : { success: false, error: results[2].reason?.message },
  };

  // Track tokens for each model
  for (const [model, result] of Object.entries(output)) {
    if (result.tokens) {
      trackTokens(sessionId, model, result.tokens);
    }
  }

  console.log("  ✅ [PARALLEL SUCCESS] All models responded.");
  res.json(output);
});

// ─── Save manual paste (Perplexity/Grok) ───
app.post("/api/manual", (req, res) => {
  const { sessionId, model, text, phase, step } = req.body;
  const session = saveManualResponse(sessionId, model, text, phase, step);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ success: true });
});

// ─── Export session as JSON ───
app.get("/api/export/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.setHeader("Content-Disposition", `attachment; filename=research-${session.id.slice(0, 8)}.json`);
  res.json(session);
});

// ─── List all sessions ───
app.get("/api/sessions", (req, res) => {
  res.json(listSessions());
});

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`\n  🔬 Deep Research Workflow running at http://localhost:${PORT}\n`);
  console.log(`  Models configured:`);
  console.log(`    Claude:  ${MODELS.claude} ${process.env.ANTHROPIC_API_KEY ? "✓" : "✗ missing key"}`);
  console.log(`    ChatGPT: ${MODELS.chatgpt} ${process.env.OPENAI_API_KEY ? "✓" : "✗ missing key"}`);
  console.log(`    Gemini:  ${MODELS.gemini} ${process.env.GEMINI_API_KEY ? "✓" : "✗ missing key"}`);
  console.log(`    Perplexity: manual paste`);
  console.log(`    Grok: manual paste\n`);
});

// Increase timeout for long-running deep research calls (10 minutes)
server.timeout = 600000;
server.keepAliveTimeout = 610000;
server.headersTimeout = 620000;
