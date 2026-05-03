// ═══════════════════════════════════════════════════════
// UI RENDERING & DOM HELPERS
// ═══════════════════════════════════════════════════════

const MODEL_LINKS = {
  claude: "https://claude.ai",
  chatgpt: "https://chatgpt.com",
  gemini: "https://gemini.google.com",
  perplexity: "https://perplexity.ai",
  grok: "https://x.com/i/grok"
};

function updateTokenDisplay() {
  const body = document.getElementById("usageBody");
  let totalIn = 0;
  let totalOut = 0;

  const models = ["claude", "chatgpt", "gemini"];
  const names = {
    claude: "Claude Sonnet 4-6",
    chatgpt: "GPT-5",
    gemini: "Gemini 2.5 Flash"
  };

  body.innerHTML = models.map(m => {
    const raw = state.tokenUsage[m];
    // Handle migration from old number format if needed
    const usage = (typeof raw === 'object' && raw !== null) ? raw : { in: 0, out: 0 };

    totalIn += (usage.in || 0);
    totalOut += (usage.out || 0);

    return `
      <tr>
        <td><span class="token-dot" style="background:var(--${m})"></span> ${names[m]}</td>
        <td>${(usage.in || 0).toLocaleString()}</td>
        <td>${(usage.out || 0).toLocaleString()}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("totalIn").textContent = totalIn.toLocaleString();
  document.getElementById("totalOut").textContent = totalOut.toLocaleString();
}

function trackTokens(result, model) {
  if (result?.tokens) {
    // Ensure the model's usage is an object
    if (typeof state.tokenUsage[model] !== 'object' || state.tokenUsage[model] === null) {
      state.tokenUsage[model] = { in: 0, out: 0 };
    }

    state.tokenUsage[model].in = (state.tokenUsage[model].in || 0) + (result.tokens.input || 0);
    state.tokenUsage[model].out = (state.tokenUsage[model].out || 0) + (result.tokens.output || 0);

    savePersistent();
    updateTokenDisplay();
  }
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ═══════════════════════════════════════════════════════
// RENDER SIDEBAR
// ═══════════════════════════════════════════════════════
function renderSidebar() {
  const nav = document.getElementById("phaseNav");
  const currentPhaseIdx = PHASES.findIndex(p => p.steps.includes(state.currentStep));

  nav.innerHTML = PHASES.map((phase, i) => {
    const isActive = i === currentPhaseIdx;
    const isCompleted = i < currentPhaseIdx;
    let cls = "phase-item clickable"; // All are clickable now
    if (isActive) cls += " active";
    if (isCompleted) cls += " completed";

    return `<div class="${cls}" onclick="navigateToPhase(${i})">
      <div class="phase-dot"></div>
      <div>
        <div class="phase-label">${phase.label}</div>
        <div class="phase-sub">${phase.sub}</div>
      </div>
    </div>`;
  }).join("");
}

function navigateToPhase(idx) {
  const phase = PHASES[idx];
  if (phase) {
    state.currentStep = phase.steps[0];
    state.currentPhase = phase.id;
    renderStep();
    renderSidebar();
  }
}

// ═══════════════════════════════════════════════════════
// RENDER STEPS
// ═══════════════════════════════════════════════════════
function renderStep() {
  const main = document.getElementById("mainContent");
  const step = state.currentStep;
  const renderers = {
    "0.1": renderStep01,
    "0.2": renderStep02,
    "0.3": renderStep03,
    "1.1": renderStep11,
    "1.2": renderStep12,
    "2.1": renderStep21,
    "3.1": renderStep31,
    "3.2": renderStep32,
    "3.3": renderStep33,
    "3.4": renderStep34,
    "3.5": renderStep35,
    "4.1": renderStep41,
    "4.2": renderStep42,
  };

  const renderer = renderers[step];
  if (renderer) {
    main.innerHTML = renderPipelineSteps() + renderer();
    renderSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function renderPipelineSteps() {
  const currentPhaseIdx = PHASES.findIndex(p => p.steps.includes(state.currentStep));
  const phase = PHASES[currentPhaseIdx];
  if (!phase) return '';

  const stepLabels = {
    "0.1": "Clarification", "0.2": "Factor expansion", "0.3": "Brief",
    "1.1": "Multi-Model Research", "1.2": "Review",
    "2.1": "Consolidation",
    "3.1": "Pipeline 1", "3.2": "Pipeline 2", "3.3": "Pipeline 3", "3.4": "Pipeline 4", "3.5": "Pipeline 5",
    "4.1": "Final Draft"
  };

  return `
    <div class="pipeline-steps-container">
      <div class="pipeline-track">
        ${phase.steps.map((s, idx) => {
    const isActive = s === state.currentStep;
    const isCompleted = state.responses[s] || (s === "0.1" && (state.responses["0.1_refined"] || state.responses["0.1_clarification"]));
    let cls = "pipeline-node";
    if (isActive) cls += " active";
    if (isCompleted) cls += " completed";

    let html = `
            <div class="${cls}" onclick="advanceTo('${s}')">
              <div class="pipeline-node-dot"></div>
              <div class="pipeline-node-label">${stepLabels[s] || 'Step ' + s}</div>
              <div class="pipeline-node-sub">Step ${s}</div>
            </div>
          `;

    // Add connector IF not last
    if (idx < phase.steps.length - 1) {
      const nextStep = phase.steps[idx + 1];
      // Connector is green only if NEXT step is already reached or current is done and we are ahead
      const connectorCompleted = isCompleted;
      html += `<div class="pipeline-connector ${connectorCompleted ? 'completed' : ''}"></div>`;
    }

    return html;
  }).join('')}
      </div>
    </div>
  `;
}

// ── Step 0.1: Topic Clarification ──
function parseQuestions(text) {
  if (!text) return [];
  const blocks = [];
  const lines = text.split('\n');
  let currentBlock = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    // Matches: 1. or **1. or - 1. or 1) etc.
    const isQuestionStart = /^(\*\*|\*|- )?\d+[\.\)]/.test(trimmed);

    if (isQuestionStart) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { question: trimmed, answer: "" };
    } else if (currentBlock) {
      // Clean up horizontal rules and other separators (e.g., ---, ***, ___)
      const isSeparator = /^(\s*[-*_]){3,}\s*$/.test(line);
      if (!isSeparator) {
        currentBlock.question += '\n' + line;
      }
    }
  });
  if (currentBlock) blocks.push(currentBlock);

  if (blocks.length === 0 && text.trim().length > 0) {
    return [{ question: text, answer: "" }];
  }
  return blocks;
}

function updateClarifyingAnswer(idx, val) {
  state.clarifyingQuestions[idx].answer = val;
  savePersistent();
}

function renderStep01() {
  const existing = state.responses["0.1_clarification"] || "";
  if (existing && (!state.clarifyingQuestions || state.clarifyingQuestions.length === 0)) {
    state.clarifyingQuestions = parseQuestions(existing);
  }

  return `
    <div class="step-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="step-tag">Step ${state.currentStep}</div>
        <div class="step-title">Topic Clarification</div>
      </div>
      <div class="step-desc">Enter your research topic. Claude will ask clarifying questions to sharpen your scope.</div>
    </div>

    <div class="card">
      <div class="card-label"><span class="model-badge badge-claude">CLAUDE</span> Automated</div>
      <div style="margin-bottom:16px">
        <label style="font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; display:block; margin-bottom:8px">What's your research topic and what's the purpose of this research?</label>
        <input type="text" id="topicInput" placeholder="Enter your research topic and goal in one sentence..."
          value="${state.topic}" />
      </div>
      
      <div style="margin-bottom:16px">
        <label style="font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; display:block; margin-bottom:8px">What is your desired output? (What do you want to see?)</label>
        <textarea id="outputInput" rows="2" placeholder="Example: A competitive landscape table, a list of 10 actionable strategies, a technical feasibility report..." 
          onchange="state.desiredOutput = this.value; savePersistent()">${state.desiredOutput || ""}</textarea>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; display:block; margin-bottom:8px">Anything else you would like to clarify?</label>
        <textarea id="additionalInput" rows="2" placeholder="Example: Focus only on European markets, consider eco-friendly options only, include historical data from 2020..." 
          onchange="state.additionalClarification = this.value; savePersistent()">${state.additionalClarification || ""}</textarea>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="runStep01()">Get Clarifying Questions</button>
      </div>
    </div>

    ${existing ? `
    <div class="card">
      <div class="card-label">Claude's Clarifying Questions</div>
      <div class="manual-callout" style="background:rgba(214,61,86,0.05); border-color:rgba(214,61,86,0.1); margin-top:0; margin-bottom:20px">
        <p style="font-size:12px; color:var(--text2); line-height:1.5;">
          <strong>Precision Guidance:</strong> Answering these questions helps the orchestrator define the exact boundaries of your research.
        </p>
      </div>
      <div class="questions-flow" style="display: flex; flex-direction: column; gap: 24px;">
        ${state.clarifyingQuestions.map((q, idx) => `
          <div class="question-block" style="background:var(--bg2); padding:20px; border-radius:12px; border:1px solid var(--border)">
            <div class="question-text" style="font-size:14px; color:var(--text); margin-bottom:16px; line-height:1.7">
              ${marked.parse(q.question)}
            </div>
            <textarea 
              placeholder="Type your answer to this question..." 
              style="width:100%; min-height:80px; background:var(--bg); border:1px solid rgba(255,255,255,0.1); padding:12px; font-size:13px"
              oninput="updateClarifyingAnswer(${idx}, this.value)"
            >${q.answer || ""}</textarea>
          </div>
        `).join("")}
      </div>
      
      <div class="btn-row" style="margin-top:20px">
        <button class="btn btn-primary" onclick="submitAnswers01()">Submit All Answers & Refine Question</button>
      </div>
    </div>

    ${state.responses["0.1_refined"] ? `
    <div class="card">
      <div class="card-label">Refined Research Question</div>
      <div class="response-area" style="font-size:15px; font-weight:500; color:var(--accent); line-height:1.6">${state.responses["0.1_refined"]}</div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="advanceTo('0.2')">Continue to Factor Expansion →</button>
      </div>
    </div>` : ""}
    ` : ""}
  `;
}

// ── Step 0.2: Factor Expansion ──
function parseFactors(text) {
  const factors = [];
  // Revised global regex to find factors anywhere in the text
  // Pattern: [CATEGORY] Factor Name (RELEVANCE) — explanation
  const regex = /\[(.[^\]]*?)\]\s*(.*?)\s*\((HIGH|MEDIUM|LOW)\)\s*[—\-:]\s*(.*)/gi;

  let match;
  while ((match = regex.exec(text)) !== null) {
    factors.push({
      category: match[1].trim(),
      name: match[2].trim().replace(/\*/g, ''), // remove potential bolding
      relevance: match[3].trim().toUpperCase(),
      desc: match[4].trim()
    });
  }

  // Secondary fallback for simpler bulleted lists if the primary fails
  if (factors.length === 0) {
    const backupRegex = /[-*]\s*(.*?):\s*(.*)/g;
    while ((match = backupRegex.exec(text)) !== null) {
      factors.push({ name: match[1].trim(), desc: match[2].trim() });
    }
  }

  return factors;
}

function toggleFactorSelection(name) {
  const idx = state.selectedFactors.findIndex(f => f.name === name);
  if (idx > -1) {
    state.selectedFactors.splice(idx, 1);
  } else {
    state.selectedFactors.push({ name, comment: "" });
  }
  savePersistent();
  renderStep();
}

function selectAllFactors() {
  const existing = state.responses["0.2_factors"] || "";
  const parsed = parseFactors(existing);
  parsed.forEach(f => {
    if (!state.selectedFactors.some(sf => sf.name === f.name)) {
      state.selectedFactors.push({ name: f.name, comment: "" });
    }
  });
  savePersistent();
  renderStep();
}

function deselectAllFactors() {
  state.selectedFactors = [];
  savePersistent();
  renderStep();
}

function updateFactorComment(name, comment) {
  const factor = state.selectedFactors.find(f => f.name === name);
  if (factor) factor.comment = comment;
  savePersistent();
}

function renderStep02() {
  const existing = state.responses["0.2_factors"] || "";
  const parsed = parseFactors(existing);

  // Group factors by category
  const grouped = {};
  parsed.forEach(f => {
    const cat = f.category || "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  });

  return `
    <div class="step-header">
      <div class="step-tag">Phase 0 — Define</div>
      <div class="step-title">Factor Expansion</div>
      <div class="step-desc">Claude identifies critical dimensions for your research. Grouped by category.</div>
    </div>

    <div class="card">
      <div class="card-label">
        <span class="model-badge badge-claude">CLAUDE</span> 
        Automated Analysis — Suggested Factors
        
        ${existing ? `
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="btn btn-small btn-secondary" onclick="selectAllFactors()">Select All</button>
            <button class="btn btn-small btn-secondary" onclick="deselectAllFactors()">Deselect All</button>
          </div>
        ` : ''}
      </div>
      
      ${!existing ? `
        <button class="btn btn-primary" onclick="runFactorExpansion()">Identify Additional Factors</button>
      ` : `
        <div class="factor-explorer">
          ${Object.keys(grouped).map(cat => `
            <div class="factor-category-group" style="margin-bottom:24px">
              <h4 style="font-size:12px; color:var(--text3); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:4px">
                ${cat}
              </h4>
              <div class="factor-grid">
                ${grouped[cat].map(f => {
    const selection = state.selectedFactors.find(sf => sf.name === f.name);
    const isSelected = !!selection;
    return `
                    <div class="factor-tick ${isSelected ? 'active' : ''}">
                      <div class="factor-tick-top" onclick="toggleFactorSelection('${f.name.replace(/'/g, "\\'")}')">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleFactorSelection('${f.name.replace(/'/g, "\\\\'")}')" style="cursor:pointer">
                        <div class="factor-tick-info">
                          <div class="factor-tick-name">${f.name} <span class="badge-${f.relevance?.toLowerCase() || 'low'}">${f.relevance || ''}</span></div>
                          <div class="factor-tick-desc">${f.desc || ''}</div>
                        </div>
                      </div>
                      
                      ${isSelected ? `
                        <div class="factor-comment-zone" style="margin-top:12px; width:100%; border-top:1px solid var(--border); padding-top:12px">
                          <textarea 
                            placeholder="Add your research focus for this factor (Optional)..." 
                            style="width:100%; min-height:60px; font-size:12px"
                            oninput="updateFactorComment('${f.name.replace(/'/g, "\\'")}', this.value)"
                          >${selection.comment || ''}</textarea>
                        </div>
                      ` : ''}
                    </div>
                  `;
  }).join("")}
              </div>
            </div>
          `).join("")}
          ${parsed.length === 0 ? '<p style="color:var(--text3); font-size:12px">No specific factors detected for ticking.</p>' : ''}
        </div>

        <div style="margin-top:32px; border-top:1px solid var(--border); padding-top:20px; display:flex; justify-content:center">
          <button class="btn btn-primary btn-large" style="padding:16px 40px; font-size:15px" onclick="advanceTo('0.3')" ${state.selectedFactors.length === 0 ? 'disabled' : ''}>
            Generate Research Brief →
          </button>
        </div>
      `}
    </div>
  `;
}

// ── Step 0.3: Research Brief ──
function renderStep03() {
  const existing = state.responses["0.3_brief"] || "";
  return `
    <div class="step-header">
      <div class="step-tag">Phase 0 — Define</div>
      <div class="step-title">Research Brief</div>
      <div class="step-desc">Generate the master brief that will feed all subsequent phases.</div>
    </div>

    <div class="card">
      <div class="card-label"><span class="model-badge badge-claude">CLAUDE</span> Automated</div>
      ${!existing ? `
        <button class="btn btn-primary" onclick="runStep03()">Generate Research Brief</button>
      ` : `
        <textarea class="prompt-display" id="briefEdit" rows="16">${existing}</textarea>
        <div class="btn-row">
          <button class="btn btn-secondary" onclick="saveBrief()">Save Edits</button>
          <button class="btn btn-primary" onclick="advanceTo('1.1')">Continue to Parallel Exploration →</button>
        </div>
      `}
    </div>
  `;
}

// ── Step 1.1: Parallel Exploration ──
function renderStep11() {
  const models = ["claude", "chatgpt", "gemini", "perplexity", "grok"];
  const results = state.responses["1.1"] || {};

  return `
    <div class="step-header">
      <div class="step-tag">Phase 1 — Parallel Deep Exploration</div>
      <div class="step-title">Multi-Model Deep Research</div>
      <div class="step-desc">Conduct parallel <strong>Deep Research</strong> across all 5 models. Each model provides a unique perspective and deep-reasoning check.</div>
    </div>

    <div class="card" style="position:relative">
      <button class="btn btn-secondary btn-small" style="position:absolute; top:12px; right:12px; z-index:10" onclick="copyPrompt('parallelPrompt')">📋 Copy Prompt</button>
      <div class="card-label"><span class="model-badge badge-all">ALL MODELS</span> Parallel Prompt</div>
      <textarea class="prompt-display" id="parallelPrompt" rows="10">${PROMPTS["1.1_parallel"].user(state.researchBrief)}</textarea>
      <div class="btn-row" style="flex-wrap:wrap; gap:8px">
        <button class="btn btn-primary" onclick="runParallel()" id="btnParallel">Run All (API Models)</button>
        <button class="btn btn-secondary" onclick="runSingleParallel('claude')">Run Claude Only</button>
        <button class="btn btn-secondary" onclick="runSingleParallel('chatgpt')">Run ChatGPT Only</button>
        <button class="btn btn-secondary" onclick="runSingleParallel('gemini')">Run Gemini Only</button>
      </div>
      <div class="btn-row" style="margin-top:12px">
        <label class="deep-toggle">
          <input type="checkbox" id="deepResearchMaster" onchange="syncDeepToggles(this.checked)" checked>
          <span>Deep Research (All API Master)</span>
        </label>
      </div>
    </div>

    <div class="manual-callout">
      <h4>Manual Steps Required</h4>
      <p>💡 <em>Tip: Toggle "Deep Research" or "Pro" on the models' web interfaces for best results.</em></p>
      <p>Copy the prompt above and paste it into <strong>Perplexity</strong> and <strong>Grok</strong>. Add the model-specific booster from below. Then paste their responses back here.</p>
    </div>

    <div class="parallel-grid">
      ${models.map(m => {
    const isAuto = ["claude", "chatgpt", "gemini"].includes(m);
    const hasResult = results[m];
    const booster = PROMPTS["1.1_boosters"][m] || "";
    return `
          <div class="card">
            <div class="card-label">
              <span class="model-badge badge-${m}">${m.toUpperCase()}</span> 
              <a href="${MODEL_LINKS[m]}" target="_blank" class="model-link" title="Open ${m} website">↗</a>
              ${isAuto ? `
                <label class="deep-toggle-mini" title="Enable Deep Research for this model">
                  <input type="checkbox" class="deep-check" id="deep_${m}" checked>
                  DR
                </label>
              ` : `<span style="font-size:10px; color:var(--text3); margin-left:auto">Manual</span>`}
            </div>
            <div style="margin-bottom:8px">
              ${isAuto ? '<span class="status-dot ' + (hasResult ? "status-done" : "status-pending") + '"></span>'
        : '<span class="status-dot status-manual"></span> Manual'}
            </div>
            ${booster ? `
              <div class="booster-container">
                <span class="booster-label">Booster (activates unique capability of this model)</span>
                <div class="booster-tooltip">${booster.trim()}</div>
                <div class="booster-preview">${booster.trim().slice(0, 60)}...</div>
              </div>
            ` : ""}
            ${hasResult ? `
              <div class="response-area" style="position:relative; margin-bottom:12px">
                <button class="btn btn-small btn-secondary" style="position:absolute; top:8px; right:8px; opacity:0.6" onclick="runSingleParallel('${m}')">Rerun API</button>
                ${marked.parse(results[m])}
              </div>
            ` : (isAuto ? `
              <div style="margin-bottom:12px; min-height:80px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(255,255,255,0.02); border-radius:8px">
                ${state.runningModels[m] ? `
                  <div class="spinner" style="margin-bottom:10px"></div>
                  <div style="color:var(--accent); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em">Model is Researching...</div>
                ` : `
                  <div style="color:var(--text3); font-size:12px; margin-bottom:10px">Waiting for API research...</div>
                  <button class="btn btn-small btn-primary" onclick="runSingleParallel('${m}')">Run ${m.toUpperCase()} API</button>
                `}
              </div>
            ` : "")}
            
            <div class="manual-entry-zone" style="border-top: 1px solid var(--border); padding-top:12px">
              <textarea id="manual_${m}" rows="6" placeholder="Run prompt or paste model response here...">${results[m] || ""}</textarea>
              <button class="btn btn-small btn-secondary" onclick="saveManual('${m}')" style="margin-top:8px">Save Response</button>
            </div>
          </div>`;
  }).join("")}
    </div>

    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-primary" onclick="advanceTo('2.1')" ${Object.keys(results).length < 3 ? "disabled" : ""}>
        Continue to Synthesis →
      </button>
      <span style="font-size:12px;color:var(--text3);align-self:center">Need at least 3 model responses to continue</span>
    </div>
  `;
}

// ── Step 1.2: Review parallel results (optional) ──
function renderStep12() {
  return renderStep11(); // Same view, just review
}

// ── Step 2.1: Synthesis ──
function renderStep21() {
  const existing = state.responses["2.1_synthesis"] || "";
  return `
    <div class="step-header">
      <div class="step-tag">Phase 2 — Synthesis</div>
      <div class="step-title">Combine & Consolidate</div>
      <div class="step-desc">Claude combines all parallel responses into a single non-redundant synthesis.</div>
    </div>

    <div class="card">
      <div class="card-label"><span class="model-badge badge-claude">CLAUDE</span> Synthesis</div>
      ${state.runningModels['synthesis'] ? `
        <div style="min-height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed var(--border)">
          <div class="spinner" style="margin-bottom:12px"></div>
          <div style="color:var(--accent); font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em">Consolidating all models...</div>
          <div style="color:var(--text3); font-size:11px; margin-top:8px">Claude is merging parallel insights into a final synthesis.</div>
        </div>
      ` : (!existing ? `
        <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Run automated synthesis or paste your own.</p>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="runSynthesis()">Run API Synthesis</button>
        </div>
        <div style="margin-top:16px">
          <div class="card-label">Paste Manual Synthesis</div>
          <textarea id="synthesisManual" rows="10" placeholder="Paste synthesis here..."></textarea>
          <button class="btn btn-secondary btn-small" onclick="saveManualSynthesis()" style="margin-top:8px">Save Manual</button>
        </div>
      ` : `
        <textarea class="prompt-display" id="synthesisEdit" rows="35">${existing}</textarea>
        <div class="btn-row">
          <button class="btn btn-secondary" onclick="saveSynthesis()">Save Edits</button>
          <button class="btn btn-primary" onclick="advanceTo('3.1')">Continue to Pipeline →</button>
          <button class="btn btn-secondary" onclick="exportMarkdown('2.1')">Export as Markdown</button>
        </div>
      `)}
    </div>

    ${existing ? `
    <div class="card" style="border-color:var(--warning)">
      <div class="card-label" style="color:var(--warning)">CHECKPOINT</div>
      <p style="font-size:13px;color:var(--text2)">If this synthesis adequately answers your research question, you can stop here. Only continue to Phase 3 if you need deeper analysis, a decision framework, or actionable output.</p>
    </div>` : ""}
  `;
}

// ── Pipeline Steps (3.1 - 3.5) ──
function renderPipelineStep(stepId, config) {
  const existing = state.responses[`${stepId}_result`] || "";
  const prevStep = getPreviousPipelineOutput(stepId);
  const isManual = !["claude", "chatgpt", "gemini"].includes(config.model);
  const pipelineSteps = ["3.1", "3.2", "3.3", "3.4", "3.5"];
  const stepIdx = pipelineSteps.indexOf(stepId);

  return `
    <div class="step-header">
      <div class="step-tag">Phase 3 — Pipeline</div>
      <div class="step-title">Step ${stepId}: ${config.label}</div>
      <div class="step-desc">
        <span class="model-badge badge-${config.model}">${config.model.toUpperCase()}</span>
        ${isManual ? " — Manual paste required" : " — Automated via API"}
      </div>
    </div>

    <div class="pipeline-steps">
      ${pipelineSteps.map((s, i) => `
        <div class="pipeline-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""} clickable" 
             onclick="advanceTo('${s}')" 
             title="Go to Step ${s}">
        </div>
      `).join("")}
    </div>

    ${isManual ? `
    <div class="manual-callout">
      <h4>Manual Step — ${config.model.toUpperCase()}</h4>
      <p>Copy the prompt below and paste it into ${config.model}. Then paste the response back here.</p>
    </div>` : ""}

    <div class="card">
      <div class="card-label">Prompt for ${config.model.toUpperCase()}</div>
      <textarea class="prompt-display" id="pipelinePrompt_${stepId}" rows="12">${config.user(prevStep, state.researchBrief)}</textarea>
      <div class="btn-row">
        ${!isManual ? `
          <button class="btn btn-primary" onclick="runPipelineStep('${stepId}', '${config.model}')" ${!prevStep ? "disabled" : ""}>
            Run API Call
          </button>
        ` : ""}
        <button class="btn btn-secondary" onclick="copyPrompt('pipelinePrompt_${stepId}')">Copy Prompt for Manual Use</button>
      </div>
    </div>

    ${!existing ? `
    <div class="card">
      <div class="card-label">Paste ${config.model.toUpperCase()} Response ${!isManual ? "(Manual Override)" : ""}</div>
      <textarea id="manualPipeline_${stepId}" rows="10" placeholder="Paste response here..."></textarea>
      <button class="btn btn-secondary btn-small" onclick="savePipelineManual('${stepId}')" style="margin-top:8px">Save Manual Response</button>
    </div>` : ""}

    ${existing ? `
    <div class="card">
      <div class="card-label">Result</div>
      <textarea class="prompt-display" id="pipelineResult_${stepId}" rows="16">${existing}</textarea>
      <div class="btn-row">
        <button class="btn btn-secondary" onclick="savePipelineEdit('${stepId}')">Save Edits</button>
        ${getNextStep(stepId) ? `<button class="btn btn-primary" onclick="advanceTo('${getNextStep(stepId)}')">Continue →</button>` : ""}
      </div>
    </div>` : ""}
  `;
}

function getPreviousPipelineOutput(stepId) {
  const map = {
    "3.1": state.responses["2.1_synthesis"],
    "3.2": state.responses["3.1_result"] || state.responses["2.1_synthesis"],
    "3.3": state.responses["3.2_result"],
    "3.4": state.responses["3.3_result"],
    "3.5": state.responses["3.4_result"],
  };
  return map[stepId] || "";
}

function getNextStep(stepId) {
  const steps = ["3.1", "3.2", "3.3", "3.4", "3.5", "4.1"];
  const idx = steps.indexOf(stepId);
  return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;
}

function renderStep31() { return renderPipelineStep("3.1", PROMPTS["3.1"]); }
function renderStep32() { return renderPipelineStep("3.2", PROMPTS["3.2"]); }
function renderStep33() { return renderPipelineStep("3.3", PROMPTS["3.3"]); }
function renderStep34() { return renderPipelineStep("3.4", PROMPTS["3.4"]); }
function renderStep35() { return renderPipelineStep("3.5", PROMPTS["3.5"]); }

function renderStep42() {
  const existing = state.responses["4.2_polished"] || "";
  const source = state.responses["4.1_final"] || "";

  return `
    <div class="step-header">
      <div class="step-tag">Phase 4 — Presentation</div>
      <div class="step-title">Visual Polish</div>
      <div class="step-desc">Gemini improves the layout, formatting, and visual structure of your report for executive presentation.</div>
    </div>

    <div class="card">
      <div class="card-label">
        <span class="model-badge badge-gemini">GEMINI</span> Visual Design Agent
      </div>
      
      ${!existing ? `
        <div class="manual-callout" style="background:rgba(129,140,248,0.08); border-color:rgba(129,140,248,0.2)">
          <p style="color:var(--gemini); font-weight:600">Executive Formatting Mode</p>
          <p style="font-size:12px; color:var(--text2)">Gemini will add tables, professional spacing, and better headers without changing your content's meaning.</p>
        </div>
        <button class="btn btn-primary" onclick="runGeminiPolish()" ${!source ? 'disabled' : ''} style="background:var(--gemini)">Polish Report Design</button>
        ${!source ? '<p style="font-size:11px; color:var(--accent); margin-top:8px">Please complete Step 4.1 first.</p>' : ''}
      ` : `
        <textarea class="prompt-display" id="polishedEdit" rows="30">${existing}</textarea>
        <div class="btn-row">
          <button class="btn btn-secondary" onclick="savePolished()">Save Edits</button>
          <button class="btn btn-accent" onclick="exportMarkdown('4.2_polished')" style="background:var(--success)">Export PDF (Polished)</button>
          <button class="btn btn-accent" onclick="exportWordPolished()" style="background:#2b5797">Export Word</button>
        </div>
      `}
    </div>
  `;
}

function renderStep41() {
  const raw = state.responses["4.1_final"] || "";
  const polished = state.responses["4.2_polished"] || "";
  const currentText = polished || raw;

  return `
    <div class="step-header">
      <div class="step-tag">Phase 4 — Final</div>
      <div class="step-title">Final Assembly & Presentation</div>
      <div class="step-desc">Merge all pipeline insights and apply a professional visual polish for leadership.</div>
    </div>

    <div class="card">
      <div class="card-label">
        <span class="model-badge badge-all">${polished ? 'REFINE' : 'BUILD'}</span> 
        ${polished ? 'Executive Polished Document' : 'Final Report Content'}
      </div>
      
      ${!raw ? `
        <div class="btn-row">
          <button class="btn btn-primary" onclick="runFinal()">Assemble Full Report</button>
        </div>
      ` : `
        <textarea class="prompt-display" id="finalEdit" rows="24" onchange="saveFinalCombined()">${currentText}</textarea>
        
        <div style="margin-top:24px; padding-top:20px; border-top:1px solid var(--border)">
          <div style="display:flex; flex-direction:column; gap:16px">
            ${!polished ? `
              <div>
                <button class="btn btn-primary" style="background:var(--gemini)" onclick="runGeminiPolish()">
                  Polish Design with Gemini ✨
                </button>
              </div>
            ` : ''}
            
            <div style="display:flex; flex-direction:column; gap:8px">
              <p style="font-size:11px; color:var(--text3); font-weight:600; text-transform:uppercase; letter-spacing:0.05em">
                Export Options
              </p>
              <div class="btn-row" style="margin-top:0">
                <button class="btn btn-primary" onclick="exportPDF()" style="background:var(--success)">
                  Export PDF (Gemini Polished)
                </button>
                <button class="btn btn-primary" onclick="exportWord()" style="background:#2b5797">
                  Export Word (Gemini Polished)
                </button>
                <button class="btn btn-secondary" onclick="exportMarkdown('4.1_final')">
                  Markdown
                </button>
                <button class="btn btn-secondary" onclick="exportAll()">JSON</button>
              </div>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

function copyPrompt(id) {
  const el = document.getElementById(id);
  navigator.clipboard.writeText(el.value || el.textContent);
  toast("Copied to clipboard");
}
