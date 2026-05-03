# SOP: API Routes

> Standard Operating Procedure for all Express API endpoints.
> Last Updated: 2026-04-06

---

## Route Map

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/session` | Create new research session | ❌ None |
| `GET` | `/api/session/:id` | Retrieve session by ID | ❌ None |
| `PATCH` | `/api/session/:id` | Update session fields | ❌ None |
| `POST` | `/api/call` | Call a single AI model | ❌ None |
| `POST` | `/api/parallel` | Call all 3 API models simultaneously | ❌ None |
| `POST` | `/api/manual` | Save manually pasted response | ❌ None |
| `GET` | `/api/export/:id` | Export session as JSON download | ❌ None |
| `GET` | `/api/sessions` | List all active sessions | ❌ None |
| `GET` | `*` | Fallback → serve `index.html` | ❌ None |

## POST /api/session

**Creates** a new research session in the in-memory store.

- **Input**: None
- **Output**: `{ id: "uuid" }`
- **Side Effect**: Adds session to `sessions` Map

## GET /api/session/:id

**Retrieves** a session by ID.

- **Input**: URL param `id`
- **Output**: Full session object
- **Error**: 404 if not found

## PATCH /api/session/:id

**Updates** allowed fields on a session.

- **Input**: JSON body with any of: `topic`, `researchBrief`, `currentPhase`, `currentStep`
- **Allowed Fields**: Explicitly whitelisted (no mass assignment)
- **Output**: Updated session object
- **Error**: 404 if not found

## POST /api/call

**Calls** a single AI model with the given prompts.

- **Input**:
  ```json
  {
    "sessionId": "uuid",
    "model": "claude|chatgpt|gemini",
    "systemPrompt": "string",
    "userPrompt": "string",
    "deepResearch": false
  }
  ```
- **Output**: Model result object (see Data Schema in gemini.md)
- **Side Effect**: Updates session token usage
- **Error**: 400 if no sessionId, 500 on unexpected errors

## POST /api/parallel

**Calls** all 3 API models simultaneously using `Promise.allSettled`.

- **Input**:
  ```json
  {
    "sessionId": "uuid",
    "systemPrompt": "string",
    "userPrompt": "string"
  }
  ```
- **Output**:
  ```json
  {
    "claude": { ... },
    "chatgpt": { ... },
    "gemini": { ... }
  }
  ```
- **Side Effect**: Updates session token usage for all models

## POST /api/manual

**Saves** a manually pasted response for Perplexity or Grok.

- **Input**:
  ```json
  {
    "sessionId": "uuid",
    "model": "perplexity|grok",
    "text": "string",
    "phase": 1,
    "step": "3.1"
  }
  ```
- **Output**: `{ success: true }`

## Server Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `PORT` | 3000 (env override) | Standard dev port |
| `server.timeout` | 600000 (10 min) | Deep research calls can be long |
| `server.keepAliveTimeout` | 610000 | Slightly above timeout to prevent premature close |
| `server.headersTimeout` | 620000 | Slightly above keepAlive |
| `express.json limit` | 5mb | Research responses can be large |
