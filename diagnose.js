require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testClaude(modelName) {
  try {
    const res = await anthropic.messages.create({
      model: modelName,
      max_tokens: 50,
      messages: [{ role: "user", content: "Say hello in one word." }],
    });
    console.log("  OK Claude [" + modelName + "] tokens:" + res.usage?.input_tokens + "+" + res.usage?.output_tokens);
    return true;
  } catch (err) {
    console.log("  FAIL Claude [" + modelName + "] " + (err.status || "") + " " + (err.message || "").slice(0, 80));
    return false;
  }
}

async function testOpenAI(modelName) {
  try {
    const params = {
      model: modelName,
      messages: [{ role: "user", content: "Say hello in one word." }],
    };
    if (!modelName.startsWith("o")) {
      params.messages.unshift({ role: "system", content: "Be brief." });
      params.max_completion_tokens = 50;
    } else {
      params.max_completion_tokens = 200;
    }
    const res = await openai.chat.completions.create(params);
    console.log("  OK OpenAI [" + modelName + "] tokens:" + res.usage?.prompt_tokens + "+" + res.usage?.completion_tokens);
    return true;
  } catch (err) {
    console.log("  FAIL OpenAI [" + modelName + "] " + (err.status || "") + " " + (err.message || "").slice(0, 80));
    return false;
  }
}

async function testGemini(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const res = await model.generateContent("Say hello in one word.");
    const text = res.response.text();
    console.log("  OK Gemini [" + modelName + "] response: " + text.trim().slice(0, 30));
    return true;
  } catch (err) {
    console.log("  FAIL Gemini [" + modelName + "] " + (err.message || "").slice(0, 80));
    return false;
  }
}

async function main() {
  console.log("DIAGNOSING API MODEL AVAILABILITY");
  
  console.log("\n--- ANTHROPIC (Claude) ---");
  const claudeModels = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-latest",
    "claude-3-haiku-20240307",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
  ];
  for (const m of claudeModels) await testClaude(m);

  console.log("\n--- OPENAI (ChatGPT) ---");
  const openaiModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "o3-mini",
    "o1-mini",
    "o1",
  ];
  for (const m of openaiModels) await testOpenAI(m);

  console.log("\n--- GOOGLE (Gemini) ---");
  const geminiModels = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];
  for (const m of geminiModels) await testGemini(m);

  console.log("\nDiagnosis complete.");
}

main();
