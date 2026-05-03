# Deep Research Workflow — Project Map

> **Source of Truth** for project state, data schemas, and behavioral rules.
> Updated: 2026-04-06

---

## 🎯 North Star

Build a local multi-model research orchestrator that walks users through a structured 5-phase research pipeline (Define → Explore → Synthesize → Pipeline → Assemble), automating API calls to Claude, ChatGPT, and Gemini while supporting manual paste for Perplexity and Grok.

## 🔗 Integrations

| Service       | Status       | Access Method | Key Location |
|---------------|-------------|---------------|--------------|
| Anthropic (Claude) | ✅ Connected | SDK `@anthropic-ai/sdk` | `.env` → `ANTHROPIC_API_KEY` |
| OpenAI (ChatGPT)   | ✅ Connected | SDK `openai`            | `.env` → `OPENAI_API_KEY`    |
| Google (Gemini)     | ✅ Connected | SDK `@google/generative-ai` | `.env` → `GEMINI_API_KEY` |
| Perplexity          | 📋 Manual   | User copy-paste         | N/A |
| Grok                | 📋 Manual   | User copy-paste         | N/A |

## 📊 Data Schema

### Session Object (Input → In-Memory)
```json
{
  "id": "uuid-v4",
  "createdAt": "ISO-8601",
  "topic": "string",
  "researchBrief": "string",
  "currentPhase": 0,
  "currentStep": "0.1",
  "phases": {
    "0": { "clarification": null, "factors": null, "brief": null },
    "1": { "parallel": {}, "boosters": {} },
    "2": { "synthesis": null },
    "3": { "pipeline": {} },
    "4": { "final": null }
  },
  "tokenUsage": { "claude": 0, "chatgpt": 0, "gemini": 0, "perplexity": 0, "grok": 0 }
}
```

### Model Call Result (Output)
```json
{
  "success": true,
  "text": "string — model response",
  "model": "string — model identifier",
  "tokens": { "input": 0, "output": 0 },
  "ms": 0
}
```

### Error Result
```json
{
  "success": false,
  "error": "string — error message",
  "ms": 0
}
```

## 📋 Source of Truth

- **Primary data**: In-memory `Map` in `server.js` (sessions)
- **Client persistence**: `localStorage` in the browser
- **No database**: Sessions are lost on server restart

## 📦 Delivery Payload

The final deliverable is a polished research document in the browser UI, exportable as:
- **PDF** (via `html2pdf.js`)
- **Word** (via HTML-to-DOC blob)
- **Markdown** (raw text download)
- **JSON** (full session state)

## 🛡️ Behavioral Rules

1. **Never modify user prompts programmatically** — all prompts are editable before sending.
2. **All API model calls go through `/api/call`** — centralized routing through `callModel()`.
3. **Parallel calls use `Promise.allSettled`** — one failure doesn't kill the batch.
4. **Manual models (Perplexity, Grok)** are never called via API — copy-paste only.
5. **Deep Research mode** enables extended tokens and reasoning for supported models.
6. **Phase 3 is sequential** — each step feeds into the next (Perplexity → Claude → Grok → ChatGPT → Gemini).

---

## 🔄 Context Handoff

**2026-04-06**: Applied B.L.A.S.T. protocol. Created `gemini.md`, `architecture/` SOPs, extracted `tools/` from monolithic `server.js`. No processes or prompts changed. Next: address QA_REPORT critical issues (authentication, persistence, input sanitization).
