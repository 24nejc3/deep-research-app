// ═══════════════════════════════════════════════════════
// STATE & CONFIGURATION
// ═══════════════════════════════════════════════════════
let sessionId = null;
let state = {
  topic: "",
  researchBrief: "",
  currentPhase: 0,
  currentStep: "0.1",
  responses: {},       // step -> { model: text }
  selectedFactors: [], // [{ name, comment }]
  desiredOutput: "",   // User's specifically requested output format
  additionalClarification: "", // Any extra initial context
  clarifyingQuestions: [], // [{ question, answer }]
  runningModels: {},      // { model: true } when researching
  tokenUsage: {
    claude: { in: 0, out: 0 },
    chatgpt: { in: 0, out: 0 },
    gemini: { in: 0, out: 0 }
  },
};

const PHASES = [
  { id: 0, label: "Phase 0", sub: "Define Research", steps: ["0.1", "0.2", "0.3"] },
  { id: 1, label: "Phase 1", sub: "Parallel Exploration", steps: ["1.1", "1.2"] },
  { id: 2, label: "Phase 2", sub: "Synthesis", steps: ["2.1"] },
  { id: 3, label: "Phase 3", sub: "Pipeline Deep Dive", steps: ["3.1", "3.2", "3.3", "3.4", "3.5"] },
  { id: 4, label: "Phase 4", sub: "Final Assembly", steps: ["4.1"] },
];

// Pricing per 1M tokens (April 2026 Estimations)
const PRICING = {
  claude: { in: 3.00, out: 15.00, name: "Claude Sonnet 4-6" },
  chatgpt: { in: 5.00, out: 15.00, name: "GPT-5" },
  gemini: { in: 0.10, out: 0.40, name: "Gemini 2.5 Flash" }
};

// ─── Persistence ───
function savePersistent() {
  localStorage.setItem("researchData", JSON.stringify(state));
}

function loadPersistent() {
  const data = localStorage.getItem("researchData");
  if (data) {
    const parsed = JSON.parse(data);
    Object.assign(state, parsed);

    // Safety: Sanitize tokenUsage if it's in the old number format
    const models = ["claude", "chatgpt", "gemini"];
    models.forEach(m => {
      if (typeof state.tokenUsage[m] !== 'object' || state.tokenUsage[m] === null) {
        state.tokenUsage[m] = { in: 0, out: 0 };
      }
    });

    console.log("State loaded from local storage");
  }
}
