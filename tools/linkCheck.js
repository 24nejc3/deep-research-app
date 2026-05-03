/**
 * Link Check — B.L.A.S.T. Phase 2 (Link) Verification Tool
 * 
 * Tests all API connections and .env credentials before starting research.
 * Run standalone: `node tools/linkCheck.js`
 * Or import and call from server startup.
 * 
 * See: architecture/model_sop.md for expected behavior.
 */

require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Run a minimal heartbeat check on a single model.
 * @param {string} model - "claude" | "chatgpt" | "gemini"
 * @returns {Promise<Object>} { model, ok, ms, error? }
 */
async function checkModel(model) {
  const start = Date.now();
  
  try {
    if (model === "claude") {
      if (!process.env.ANTHROPIC_API_KEY) {
        return { model, ok: false, error: "ANTHROPIC_API_KEY not set", ms: 0 };
      }
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const modelId = process.env.CLAUDE_MODEL || "claude-opus-4-6";
      await anthropic.messages.create({
        model: modelId,
        max_tokens: 10,
        messages: [{ role: "user", content: "Say OK." }],
      });
      return { model, ok: true, modelId, ms: Date.now() - start };
    }

    if (model === "chatgpt") {
      if (!process.env.OPENAI_API_KEY) {
        return { model, ok: false, error: "OPENAI_API_KEY not set", ms: 0 };
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const modelId = process.env.CHATGPT_MODEL || "gpt-5.4";
      const params = {
        model: modelId,
        messages: [{ role: "user", content: "Say OK." }],
        max_completion_tokens: 10,
      };
      await openai.chat.completions.create(params);
      return { model, ok: true, modelId, ms: Date.now() - start };
    }

    if (model === "gemini") {
      if (!process.env.GEMINI_API_KEY) {
        return { model, ok: false, error: "GEMINI_API_KEY not set", ms: 0 };
      }
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const modelId = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";
      const gemModel = genAI.getGenerativeModel({ model: modelId });
      await gemModel.generateContent("Say OK.");
      return { model, ok: true, modelId, ms: Date.now() - start };
    }

    return { model, ok: false, error: `Unknown model: ${model}` };
  } catch (err) {
    return { model, ok: false, error: err.message, ms: Date.now() - start };
  }
}

/**
 * Check all configured model connections.
 * @returns {Promise<Object>} { allOk, results: [...] }
 */
async function checkAllModels() {
  const results = await Promise.allSettled([
    checkModel("claude"),
    checkModel("chatgpt"),
    checkModel("gemini"),
  ]);

  const parsed = results.map((r) =>
    r.status === "fulfilled" ? r.value : { model: "unknown", ok: false, error: r.reason?.message }
  );

  return {
    allOk: parsed.every((r) => r.ok),
    results: parsed,
  };
}

// ─── Standalone execution ───
if (require.main === module) {
  (async () => {
    console.log("\n  🔗 B.L.A.S.T. Link Check — Verifying API Connections\n");

    const { allOk, results } = await checkAllModels();

    results.forEach((r) => {
      const status = r.ok ? "✅" : "❌";
      const detail = r.ok ? `${r.modelId} (${r.ms}ms)` : r.error;
      console.log(`  ${status} ${r.model.padEnd(10)} ${detail}`);
    });

    console.log(`\n  ${allOk ? "✅ All connections OK" : "⚠️  Some connections failed"}\n`);
    process.exit(allOk ? 0 : 1);
  })();
}

module.exports = { checkModel, checkAllModels };
