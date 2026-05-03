// ═══════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════
async function apiCall(model, systemPrompt, userPrompt, deepResearch = false) {
  try {
    const res = await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, model, systemPrompt, userPrompt, deepResearch }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Server error (${res.status})` };
    }
    return await res.json();
  } catch (err) {
    console.error("apiCall failed:", err);
    return { success: false, error: err.message };
  }
}

async function apiParallel(systemPrompt, userPrompt, deepResearch = false) {
  const res = await fetch("/api/parallel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, systemPrompt, userPrompt, deepResearch }),
  });
  return res.json();
}

async function createSession() {
  const res = await fetch("/api/session", { method: "POST" });
  const data = await res.json();
  sessionId = data.id;
}

// ═══════════════════════════════════════════════════════
// STEP ACTION HANDLERS
// ═══════════════════════════════════════════════════════

async function runStep01() {
  const topic = document.getElementById("topicInput").value.trim();
  const output = document.getElementById("outputInput").value.trim();
  const additional = document.getElementById("additionalInput").value.trim();

  if (!topic) {
    toast("Please enter a research topic first.");
    return;
  }

  state.topic = topic;
  state.desiredOutput = output;
  state.additionalClarification = additional;
  savePersistent();

  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Asking Claude...';

  const p = PROMPTS["0.1"];
  const result = await apiCall("claude", p.system, p.user(topic, output, additional));
  trackTokens(result, "claude");

  if (result.success) {
    state.responses["0.1_clarification"] = result.text;
    state.clarifyingQuestions = parseQuestions(result.text);
  } else {
    state.responses["0.1_clarification"] = `Error: ${result.error}`;
  }
  savePersistent();
  renderStep();
}

async function submitAnswers01() {
  const combinedAnswers = state.clarifyingQuestions
    .map((q, i) => `Q${i + 1}: ${q.question}\nAnswer: ${q.answer || "N/A"}`)
    .join("\n\n");

  if (!combinedAnswers) {
    toast("Please provide at least one answer.");
    return;
  }

  state.responses["0.1_answers"] = combinedAnswers;

  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Refining...';

  const result = await apiCall("claude",
    "You are a research methodology expert. Based on the user's answers, restate their research question in a precise, researchable form.",
    `Original topic: ${state.topic}\n\nClarifying questions and answers:\n${state.responses["0.1_clarification"]}\n\nUser's answers:\n${combinedAnswers}\n\nNow restate the research question in a precise, researchable form. Be specific and actionable.`
  );
  trackTokens(result, "claude");

  if (result.success) {
    state.responses["0.1_refined"] = result.text;
    state.researchBrief = result.text;
    savePersistent();
  } else {
    toast("Refinement failed: " + result.error);
  }
  renderStep();
}

async function runFactorExpansion() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Expanding factors...';

  const p = PROMPTS["0.2"];
  const result = await apiCall("claude", p.system, p.user(state.researchBrief));
  trackTokens(result, "claude");

  if (result.success) {
    state.responses["0.2_factors"] = result.text;
  }
  renderStep();
}

async function runStep03() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating brief...';

  const question = state.responses["0.1_refined"] || state.topic;
  const factors = state.selectedFactors;
  const p = PROMPTS["0.3"];
  const result = await apiCall("claude", p.system, p.user(question, factors, state.desiredOutput));
  trackTokens(result, "claude");

  if (result.success) {
    state.responses["0.3_brief"] = result.text;
    state.researchBrief = result.text;
  }
  renderStep();
}

function saveBrief() {
  const text = document.getElementById("briefEdit").value;
  state.responses["0.3_brief"] = text;
  state.researchBrief = text;
  savePersistent();
  toast("Brief saved");
}

// ── Parallel Exploration ──
async function runParallel() {
  const btn = document.getElementById("btnParallel");
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Researching...';

  const prompt = document.getElementById("parallelPrompt").value;
  const models = ["claude", "chatgpt", "gemini"];

  if (!state.responses["1.1"]) state.responses["1.1"] = {};

  // Run in parallel but handle them individually so UI updates as they finish
  const promises = models.map(async (m) => {
    state.runningModels[m] = true;
    renderStep();

    try {
      const isDeep = document.getElementById(`deep_${m}`)?.checked || false;
      const result = await apiCall(m, PROMPTS["1.1_parallel"].system, prompt + (PROMPTS["1.1_boosters"][m] || ""), isDeep);

      trackTokens(result, m);
      if (result.success) {
        if (!result.text) {
          state.responses["1.1"][m] = `[Error: Model returned an empty response. Check if the prompt is too long or if the model failed to generate.]`;
        } else {
          state.responses["1.1"][m] = result.text;
        }
      } else {
        state.responses["1.1"][m] = `[Error: ${result.error || "Unknown API error"}]`;
      }
    } catch (err) {
      console.error(`Research error for ${m}:`, err);
      state.responses["1.1"][m] = `[Exception: ${err.message}]`;
    } finally {
      state.runningModels[m] = false;
      savePersistent();
      renderStep(); // Refresh UI as each result comes in
    }
  });

  await Promise.allSettled(promises);

  btn.disabled = false;
  btn.innerHTML = oldText;
  toast("Parallel research phase updated!");
}

async function runSingleParallel(model) {
  const deepResearch = document.getElementById(`deep_${model}`)?.checked || false;
  const prompt = document.getElementById("parallelPrompt").value;
  const booster = PROMPTS["1.1_boosters"][model] || "";

  state.runningModels[model] = true;
  renderStep();

  try {
    toast(`Calling ${model} ${deepResearch ? '(DR)' : ''}...`);
    const result = await apiCall(model, PROMPTS["1.1_parallel"].system, prompt + booster, deepResearch);

    if (!state.responses["1.1"]) state.responses["1.1"] = {};

    if (result.success) {
      if (!result.text) {
        state.responses["1.1"][model] = `[Error: Model returned an empty response.]`;
        toast(`${model} returned no content.`);
      } else {
        state.responses["1.1"][model] = result.text;
        trackTokens(result, model);
        toast(`${model} complete!`);
      }
    } else {
      state.responses["1.1"][model] = `[Error: ${result.error || "Unknown API error"}]`;
      toast(`${model} failed.`);
    }
  } catch (err) {
    console.error(`Single research error for ${model}:`, err);
    state.responses["1.1"][model] = `[Exception: ${err.message}]`;
    toast(`${model} crashed.`);
  } finally {
    state.runningModels[model] = false;
    savePersistent();
    renderStep();
  }
}

function saveManual(model) {
  const text = document.getElementById(`manual_${model}`).value.trim();
  if (!text) return;
  if (!state.responses["1.1"]) state.responses["1.1"] = {};
  state.responses["1.1"][model] = text;
  savePersistent();
  renderStep();
  toast(`${model} response saved`);
}

// ── Synthesis ──
async function runSynthesis() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Synthesizing...';

  state.runningModels['synthesis'] = true;
  renderStep();

  const p = PROMPTS["2.1"];
  const result = await apiCall("claude", p.system, p.user(state.researchBrief, state.responses["1.1"] || {}));

  state.runningModels['synthesis'] = false;
  trackTokens(result, "claude");

  if (result.success) {
    state.responses["2.1_synthesis"] = result.text;
  } else {
    toast("Synthesis failed: " + result.error);
  }
  renderStep();
}

function saveSynthesis() {
  state.responses["2.1_synthesis"] = document.getElementById("synthesisEdit").value;
  savePersistent();
  toast("Synthesis saved");
}

function saveManualSynthesis() {
  const text = document.getElementById("synthesisManual").value.trim();
  if (!text) return;
  state.responses["2.1_synthesis"] = text;
  savePersistent();
  renderStep();
}

// ── Pipeline ──
async function runPipelineStep(stepId, model) {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Running ${model}...`;

  const prompt = document.getElementById(`pipelinePrompt_${stepId}`).value;
  const config = PROMPTS[stepId];
  const result = await apiCall(model, config.system, prompt);
  trackTokens(result, model);

  if (result.success) {
    state.responses[`${stepId}_result`] = result.text;
  } else {
    state.responses[`${stepId}_result`] = `[Error: ${result.error}]`;
  }
  renderStep();
}

function savePipelineManual(stepId) {
  const text = document.getElementById(`manualPipeline_${stepId}`).value.trim();
  if (!text) return;
  state.responses[`${stepId}_result`] = text;
  savePersistent();
  renderStep();
  toast("Response saved");
}

function savePipelineEdit(stepId) {
  state.responses[`${stepId}_result`] = document.getElementById(`pipelineResult_${stepId}`).value;
  savePersistent();
  toast("Edits saved");
}

// ── Final Assembly ──
async function runGeminiPolish() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Refinement in progress (Multimodal Design logic)...';

  const source = state.responses["4.1_final"];
  const p = PROMPTS["4.2"];

  // Explicitly use Gemini 1.5 or 2.0 via your apiCall
  const result = await apiCall("gemini", p.system, p.user(source));
  trackTokens(result, "gemini");

  if (result.success) {
    state.responses["4.2_polished"] = result.text;
  }
  renderStep();
}

function savePolished() {
  state.responses["4.2_polished"] = document.getElementById("polishedEdit").value;
  savePersistent();
  toast("Polished version saved");
}

function exportWordPolished() {
  const text = state.responses["4.2_polished"];
  if (!text) return;
  // Use existing word export logic but with polished text
  state.responses["4.1_final"] = text; // temporary swap or I can refactor exportWord to take a key
  exportWord();
}

function saveFinalCombined() {
  const val = document.getElementById("finalEdit").value;
  if (state.responses["4.2_polished"]) {
    state.responses["4.2_polished"] = val;
  } else {
    state.responses["4.1_final"] = val;
  }
  savePersistent();
}

async function runFinal() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Assembling final document...';

  const allOutputs = ["2.1_synthesis", "3.1_result", "3.2_result", "3.3_result", "3.4_result", "3.5_result"]
    .filter(k => state.responses[k])
    .map(k => `--- ${k.replace("_result", "").replace("_synthesis", "")} ---\n${state.responses[k]}`)
    .join("\n\n");

  const p = PROMPTS["4.1"];
  const result = await apiCall("claude", p.system, p.user(state.researchBrief, allOutputs));
  trackTokens(result, "claude");

  if (result.success) {
    state.responses["4.1_final"] = result.text;
  }
  renderStep();
}

function saveFinal() {
  state.responses["4.1_final"] = document.getElementById("finalEdit").value;
  savePersistent();
  toast("Final document saved");
}

function saveManualFinal() {
  const text = document.getElementById("finalManual").value.trim();
  if (!text) return;
  state.responses["4.1_final"] = text;
  savePersistent();
  renderStep();
}

// ═══════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════
function exportMarkdown(key) {
  let text = "";
  if (key === "final") {
    text = state.responses["4.1_final"];
  } else if (key === "2.1") {
    text = state.responses["2.1_synthesis"];
  } else {
    text = state.responses[`${key}_result`] || state.responses[`${key}_synthesis`];
  }

  if (!text) {
    toast("Nothing to export!");
    return;
  }

  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `research-${key}-${Date.now()}.md`;
  a.click();
}

function exportAll() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `research-session-${Date.now()}.json`;
  a.click();
}

function exportPDF() {
  const text = state.responses["4.2_polished"] || state.responses["4.1_final"];
  if (!text) {
    toast("Nothing to export!");
    return;
  }

  toast("Generating PDF Report...");

  const element = document.createElement("div");
  element.style.padding = "40px";
  element.style.background = "#ffffff";
  element.style.color = "#1a1a1a";
  element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const styledHTML = `
    <style>
      ul, ol { margin-bottom: 20px; }
      li { margin-bottom: 8px; }
      code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
      blockquote { border-left: 4px solid #d63d56; padding-left: 16px; color: #666; font-style: italic; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
      th { background-color: #f8f9fa; }
    </style>
    <div style="text-align: right; font-size: 10px; color: #999; margin-bottom: 20px;">
      Deep Research Workflow Report | ${new Date().toLocaleDateString()}
    </div>
    ${marked.parse(text)}
  `;

  element.innerHTML = styledHTML;

  const opt = {
    margin: [1, 1],
    filename: `research-report-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

function exportWord() {
  const text = state.responses["4.1_final"];
  if (!text) {
    toast("No final document to export!");
    return;
  }

  toast("Generating Word document...");

  const content = marked.parse(text);

  // Professional Word Template Header
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Research Report</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #121212; }
      h1 { color: #d63d56; font-size: 24pt; border-bottom: 2px solid #eee; margin-top: 12pt; }
      h2 { color: #2d3436; font-size: 18pt; margin-top: 18pt; border-bottom: 1px solid #eee; }
      p { margin-bottom: 12pt; }
      table { border-collapse: collapse; width: 100%; border: 1px solid #ddd; }
      th, td { border: 1px solid #ddd; padding: 8pt; text-align: left; }
      th { background-color: #f2f2f2; font-weight: bold; }
    </style>
    </head><body>
  `;
  const footer = "</body></html>";

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], { type: 'application/msword' });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `research-report-${Date.now()}.doc`;
  a.click();
}

// ═══════════════════════════════════════════════════════
// NAVIGATION & INIT
// ═══════════════════════════════════════════════════════
function advanceTo(step) {
  state.currentStep = step;
  const phase = PHASES.find(p => p.steps.includes(step));
  if (phase) state.currentPhase = phase.id;
  savePersistent();
  renderStep();
  window.scrollTo(0, 0);
}

async function init() {
  loadPersistent();
  await createSession();
  renderStep();
  renderSidebar();
  updateTokenDisplay(); // Populate cost table
}

function clearSessionData() {
  resetResearch();
}

function resetResearch() {
  if (!confirm("⚠️ Reset all research data?\n\nThis will clear:\n• Topic & clarifying questions\n• All model responses\n• Synthesis & pipeline results\n• Final report\n• Token tracking\n\nThis cannot be undone.")) return;

  // Reset state to initial values
  state.topic = "";
  state.researchBrief = "";
  state.currentPhase = 0;
  state.currentStep = "0.1";
  state.responses = {};
  state.selectedFactors = [];
  state.desiredOutput = "";
  state.additionalClarification = "";
  state.clarifyingQuestions = [];
  state.runningModels = {};
  state.tokenUsage = {
    claude: { in: 0, out: 0 },
    chatgpt: { in: 0, out: 0 },
    gemini: { in: 0, out: 0 }
  };

  // Clear persistence
  localStorage.removeItem("researchData");
  savePersistent();

  // Re-render everything
  renderStep();
  renderSidebar();
  updateTokenDisplay();
  toast("Research reset — ready for a new investigation.");
}

async function handleLogout() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (e) {
    // ignore
  }
  window.location.href = "/login";
}

function syncDeepToggles(val) {
  document.querySelectorAll(".deep-check").forEach(el => el.checked = val);
}

// ─── Boot ───
init();
