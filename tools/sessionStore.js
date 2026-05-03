/**
 * Session Store — Deterministic Tool
 * 
 * In-memory session management for research workflows.
 * Extracted from server.js per B.L.A.S.T. Layer 3 (Tools).
 * 
 * Future: Swap for SQLite/file-based persistence without touching routes.
 */

const { v4: uuidv4 } = require("uuid");

// ─── In-memory session store ───
const sessions = new Map();

/**
 * Create a new research session.
 * @returns {Object} The newly created session
 */
function createSession() {
  const id = uuidv4();
  const session = {
    id,
    createdAt: new Date().toISOString(),
    topic: "",
    researchBrief: "",
    currentPhase: 0,
    currentStep: "0.1",
    phases: {
      0: { clarification: null, factors: null, brief: null },
      1: { parallel: {}, boosters: {} },
      2: { synthesis: null },
      3: { pipeline: {} },
      4: { final: null },
    },
    tokenUsage: { claude: 0, chatgpt: 0, gemini: 0, perplexity: 0, grok: 0 },
  };
  sessions.set(id, session);
  return session;
}

/**
 * Get a session by ID.
 * @param {string} id - Session UUID
 * @returns {Object|null} Session or null if not found
 */
function getSession(id) {
  return sessions.get(id) || null;
}

/**
 * Update allowed fields on a session.
 * Only explicitly whitelisted fields can be changed (no mass assignment).
 * 
 * @param {string} id - Session UUID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated session or null if not found
 */
function updateSession(id, updates) {
  const session = sessions.get(id);
  if (!session) return null;

  const allowedFields = ["topic", "researchBrief", "currentPhase", "currentStep"];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      session[field] = updates[field];
    }
  });

  return session;
}

/**
 * Track token usage for a model on a session.
 * @param {string} id - Session UUID
 * @param {string} model - Model key (claude, chatgpt, gemini)
 * @param {Object} tokens - { input, output }
 */
function trackTokens(id, model, tokens) {
  const session = sessions.get(id);
  if (session && tokens) {
    session.tokenUsage[model] =
      (session.tokenUsage[model] || 0) + (tokens.input || 0) + (tokens.output || 0);
  }
}

/**
 * Save a manual paste response to a session.
 * @param {string} id - Session UUID
 * @param {string} model - Model key
 * @param {string} text - Pasted response text
 * @param {number} phase - Phase number
 * @param {string} step - Step ID (e.g., "3.1")
 */
function saveManualResponse(id, model, text, phase, step) {
  const session = sessions.get(id);
  if (!session) return null;

  if (phase === 1) {
    session.phases[1].parallel[model] = text;
  } else if (phase === 3) {
    session.phases[3].pipeline[step] = { model, text };
  }

  return session;
}

/**
 * List all sessions (summary only).
 * @returns {Array} Array of session summaries
 */
function listSessions() {
  return [...sessions.values()].map((s) => ({
    id: s.id,
    topic: s.topic,
    currentPhase: s.currentPhase,
    currentStep: s.currentStep,
    createdAt: s.createdAt,
  }));
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  trackTokens,
  saveManualResponse,
  listSessions,
};
