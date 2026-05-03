# SOP: Model Configuration & Behavior

> Standard Operating Procedure for how each AI model is configured and called.
> Last Updated: 2026-04-06

---

## Model Registry

| Model Key | Default Model ID | SDK | Deep Research Support |
|-----------|-------------------|-----|----------------------|
| `claude` | `claude-opus-4-6` | `@anthropic-ai/sdk` | ✅ Thinking mode (3.7+) |
| `chatgpt` | `gpt-5.4` | `openai` | ✅ Reasoning effort (o1/o3/o5) |
| `gemini` | `gemini-3.1-pro-preview` | `@google/generative-ai` | ❌ Standard only |

All model IDs are overridable via `.env` variables: `CLAUDE_MODEL`, `CHATGPT_MODEL`, `GEMINI_MODEL`.

## Claude — Call Specification

```
SDK: Anthropic
Method: anthropic.messages.create()
Parameters:
  - model: MODELS.claude
  - max_tokens: 16384 (normal) | 20000 (deep research)
  - system: systemPrompt (string)
  - messages: [{ role: "user", content: userPrompt }]
  
Deep Research Enhancement:
  - If model includes "3-7": adds thinking config
  - params.thinking = { type: "enabled", budget_tokens: 12000 }
  - params.max_tokens stays at 16384

Response Parsing:
  - text = res.content.map(b => b.text || "").join("\n")
  - tokens.input = res.usage?.input_tokens
  - tokens.output = res.usage?.output_tokens
```

## ChatGPT — Call Specification

```
SDK: OpenAI
Method: openai.chat.completions.create()
Parameters:
  - model: MODELS.chatgpt
  - messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
  - max_completion_tokens: 16384

Deep Research Enhancement:
  - If model starts with "o1", "o3", or "o5": adds reasoning_effort = "high"

Response Parsing:
  - text = res.choices[0].message.content
  - tokens.input = res.usage?.prompt_tokens
  - tokens.output = res.usage?.completion_tokens
```

## Gemini — Call Specification

```
SDK: GoogleGenerativeAI
Method: genAI.getGenerativeModel(config).generateContent()
Parameters:
  - config: { model: MODELS.gemini }
  - content: systemPrompt + "\n\n" + userPrompt (concatenated)

Deep Research Enhancement: None (no special mode)

Response Parsing:
  - text = res.response.text()
  - tokens.input = res.response.usageMetadata?.promptTokenCount
  - tokens.output = res.response.usageMetadata?.candidatesTokenCount
```

## Error Handling

All model calls are wrapped in try/catch. On error:
- Return `{ success: false, error: err.message, ms: elapsed }`
- Log error to console with model name and session ID
- Track timer regardless of success/failure

## Token Tracking

After each successful call, tokens are tracked per-model in the session object:
```
session.tokenUsage[model] += (result.tokens.input || 0) + (result.tokens.output || 0)
```

## Known Issues / Learnings

- **Gemini**: Does not support separate system prompts — system and user are concatenated.
- **Claude 3.7 Thinking**: Requires `max_tokens = 16384` when thinking is enabled; higher values may error.
- **OpenAI o-series**: System prompts may be ignored or treated differently. `max_completion_tokens` is used instead of `max_tokens`.
- **Empty responses**: Some models may return empty text on very long prompts — caller should check `result.text` existence.
