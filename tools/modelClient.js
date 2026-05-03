/**
 * Model Client — Deterministic Tool
 * 
 * Unified interface for calling AI models (Claude, ChatGPT, Gemini).
 * Extracted from server.js per B.L.A.S.T. Layer 3 (Tools).
 * 
 * See: architecture/model_sop.md for call specifications.
 */

require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ─── SDK Clients ───
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Model Defaults (overridden by .env) ───
const MODELS = {
  claude: process.env.CLAUDE_MODEL || "claude-opus-4-6",
  chatgpt: process.env.CHATGPT_MODEL || "gpt-5.4",
  gemini: process.env.GEMINI_MODEL || "gemini-3.1-pro-preview",
};

/**
 * Call an AI model with the given prompts.
 * 
 * @param {string} model - "claude" | "chatgpt" | "gemini"
 * @param {string} systemPrompt - System-level instruction
 * @param {string} userPrompt - User-level content
 * @param {boolean} deepResearch - Enable extended reasoning mode
 * @returns {Promise<Object>} Result with { success, text, model, tokens, ms } or { success, error, ms }
 */
async function callModel(model, systemPrompt, userPrompt, deepResearch = false) {
  const start = Date.now();

  try {
    if (model === "claude") {
      const params = {
        model: MODELS.claude,
        max_tokens: deepResearch ? 20000 : 16384,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      };
      if (deepResearch && MODELS.claude.includes("3-7")) {
        // Claude 3.7+ thinking configuration
        params.thinking = { type: "enabled", budget_tokens: 12000 };
        params.max_tokens = 16384; 
      }
      const res = await anthropic.messages.create(params);
      const text = res.content.map((b) => b.text || "").join("\n");
      return {
        success: true,
        text,
        model: MODELS.claude,
        tokens: { input: res.usage?.input_tokens, output: res.usage?.output_tokens },
        ms: Date.now() - start,
      };
    }

    if (model === "chatgpt") {
      const params = {
        model: MODELS.chatgpt,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 16384,
      };
      if (deepResearch && (MODELS.chatgpt.startsWith("o1") || MODELS.chatgpt.startsWith("o3") || MODELS.chatgpt.startsWith("o5"))) {
        params.reasoning_effort = "high";
      }
      const res = await openai.chat.completions.create(params);
      return {
        success: true,
        text: res.choices[0].message.content,
        model: MODELS.chatgpt,
        tokens: { input: res.usage?.prompt_tokens, output: res.usage?.completion_tokens },
        ms: Date.now() - start,
      };
    }

    if (model === "gemini") {
      const config = { model: MODELS.gemini };
      const gemModel = genAI.getGenerativeModel(config);
      const res = await gemModel.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const text = res.response.text();
      return {
        success: true,
        text,
        model: MODELS.gemini,
        tokens: {
          input: res.response.usageMetadata?.promptTokenCount,
          output: res.response.usageMetadata?.candidatesTokenCount,
        },
        ms: Date.now() - start,
      };
    }

    return { success: false, error: `Unknown model: ${model}` };
  } catch (err) {
    return { success: false, error: err.message, ms: Date.now() - start };
  }
}

module.exports = { callModel, MODELS };
