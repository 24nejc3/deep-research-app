# Deep Research Workflow — Multi-Model Orchestrator

A local web app that walks you through a structured multi-model research process, automating API calls to Claude, ChatGPT, and Gemini while prompting you to manually use Perplexity and Grok.

## Quick Start

```bash
# 1. Clone/copy this directory
cd deep-research-app

# 2. Install dependencies
npm install

# 3. Set up API keys
cp .env.example .env
# Edit .env with your actual API keys

# 4. Run
npm start
# → Open http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser UI                     │
│  ┌──────────┐  ┌────────────────────────────┐   │
│  │ Sidebar   │  │ Step-by-step workflow       │   │
│  │ - Phases  │  │ - Auto-generated prompts    │   │
│  │ - Tokens  │  │ - Editable before sending   │   │
│  │ - Nav     │  │ - Response display/edit     │   │
│  └──────────┘  └────────────────────────────┘   │
└───────────────────────┬─────────────────────────┘
                        │ fetch()
                        ▼
┌─────────────────────────────────────────────────┐
│              Express Server (Node.js)            │
│                                                  │
│  POST /api/call      → single model call         │
│  POST /api/parallel  → 3 models simultaneously   │
│  POST /api/manual    → save Perplexity/Grok text │
│  POST /api/session   → create research session   │
│  GET  /api/export/:id → download session JSON     │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Anthropic │ │  OpenAI  │ │  Google  │         │
│  │   SDK     │ │   SDK    │ │ GenAI SDK│         │
│  └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────┘
```

## Workflow Phases

| Phase | What Happens | Automated? |
|-------|-------------|------------|
| **0 — Define** | Claude helps clarify your topic, expand factors, generate a research brief | ✅ Claude API |
| **1 — Explore** | Same prompt sent to all 5 models in parallel | ✅ 3 via API, 2 manual paste |
| **2 — Synthesize** | Claude combines all responses into one document | ✅ Claude API |
| **3 — Pipeline** | Sequential: Perplexity→Claude→Grok→ChatGPT→Gemini | ✅ 3 via API, 2 manual paste |
| **4 — Assemble** | Claude produces final research document | ✅ Claude API |

## Model Roles (April 2026)

| Model | Primary Role | Preferred Version | Access | Cost (1M Tokens) |
|-------|--------------|-------------------|--------|------------------|
| **Claude** | Deep reasoning, synthesis | `claude-opus-4-6` | API ✅ | $5 in / $25 out |
| **ChatGPT** | System design, action plans | `gpt-5.4` | API ✅ | ~$2.50 in / $15 out |
| **Gemini** | Design, polish, multimodal | `gemini-3.1-pro-preview`| API ✅ | $2 in / $12 out |
| **Perplexity**| Fact validation, citations | Manual | Manual 📋 | N/A |
| **Grok** | Contrarian views | Manual | Manual 📋 | N/A |


## Key Features

- **Editable prompts** — Every auto-generated prompt can be tweaked before sending
- **Token tracking** — See cumulative token usage per model in the sidebar
- **Checkpoints** — Stop early if parallel exploration is sufficient
- **Session export** — Download full session as JSON for archival
- **Pipeline visualization** — Progress bar shows where you are in the pipeline

## Configuration

### Models
The defaults are the strongest available models (April 2026). Override in `.env`:
```
# Strongest (default)
CLAUDE_MODEL=claude-opus-4-6
CHATGPT_MODEL=gpt-5.4
GEMINI_MODEL=gemini-3.1-pro-preview

# Cost-saving alternatives
CLAUDE_MODEL=claude-sonnet-4-6
CHATGPT_MODEL=gpt-5
GEMINI_MODEL=gemini-3.1-flash
```

### Persistence
Sessions are stored in-memory by default. For persistence across restarts, you can:

1. **File-based** — Add `fs.writeFileSync` to save sessions to disk
2. **SQLite** — Add `better-sqlite3` for a proper database
3. **Redis** — For multi-instance setups

## Extending

### Add a new pipeline configuration
Edit the `PROMPTS` object in `public/index.html` to change prompt templates.

### Add new models
1. Add SDK to `package.json`
2. Add a new case in `callModel()` in `server.js`
3. Add model color/badge CSS in `index.html`

### Add Perplexity API (when available)
When you get Perplexity API access, add it to `server.js`:
```javascript
// In callModel():
if (model === "perplexity") {
  // Perplexity uses OpenAI-compatible API
  const pplx = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });
  const res = await pplx.chat.completions.create({
    model: "sonar-pro",
    messages: [{ role: "user", content: userPrompt }],
  });
  return { success: true, text: res.choices[0].message.content };
}
```

## File Structure
```
deep-research-app/
├── gemini.md              # Project Map & State Tracking (Source of Truth)
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── architecture/          # Layer 1: SOPs — the "How To"
│   ├── research_workflow.md   # Full pipeline documentation
│   ├── model_sop.md           # Model call specifications
│   └── api_routes.md          # Express route documentation
├── tools/                 # Layer 3: Deterministic scripts — the "Engines"
│   ├── modelClient.js         # Unified AI model caller
│   ├── sessionStore.js        # Session CRUD operations
│   └── linkCheck.js           # API connection verifier
├── src/                   # Layer 2: Navigation — the "Router"
│   └── server.js              # Express server (routes only)
├── public/
│   ├── index.html             # Full SPA frontend
│   ├── css/
│   └── js/
└── .tmp/                  # Temporary workbench (ephemeral)
```

