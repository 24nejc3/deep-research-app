# SOP: Research Workflow Pipeline

> Standard Operating Procedure for the 5-phase research workflow.
> Last Updated: 2026-04-06

---

## Overview

The Deep Research Workflow processes a user's research topic through 5 sequential phases, each building on the output of the previous one. The goal is to produce a comprehensive, multi-perspective research document.

## Phase 0 — Define Research

**Goal**: Transform a vague topic into a precise, researchable question with identified factors.

| Step | Action | Model | Input | Output |
|------|--------|-------|-------|--------|
| 0.1  | Clarification | Claude | Raw topic + desired output + additional context | Clarifying questions → refined research question |
| 0.2  | Factor Expansion | Claude | Refined question | 8–12 structured factors grouped by category |
| 0.3  | Brief Generation | Claude | Refined question + selected factors + desired output | Research Brief (scope, factors, success criteria) |

**Edge Cases**:
- User may skip clarification and go directly to factors
- Factor parsing uses regex: `[CATEGORY] Name (RELEVANCE) — description`
- Fallback regex for simpler formats: `- Name: description`

## Phase 1 — Parallel Exploration

**Goal**: Get diverse perspectives from all 5 models simultaneously.

| Step | Action | Models | Input | Output |
|------|--------|--------|-------|--------|
| 1.1  | Parallel Research | All 5 | Research Brief + model-specific boosters | 5 independent research responses |
| 1.2  | Review | Human | All responses | Human review (same view as 1.1) |

**Rules**:
- API models (Claude, ChatGPT, Gemini) run via `Promise.allSettled`
- Manual models (Perplexity, Grok) require copy-paste
- Each model gets a unique "booster" prompt suffix activating its strength
- Deep Research mode can be toggled per-model
- Need minimum 3 responses to proceed

## Phase 2 — Synthesis

**Goal**: Merge all parallel responses into one non-redundant document.

| Step | Action | Model | Input | Output |
|------|--------|-------|-------|--------|
| 2.1  | Consolidation | Claude | Brief + all Phase 1 responses | Goal-aligned synthesis document |

**Checkpoint**: User may stop here if synthesis answers their question.

## Phase 3 — Pipeline Deep Dive

**Goal**: Sequential specialist processing for maximum depth.

| Step | Action | Model | Input | Output |
|------|--------|-------|-------|--------|
| 3.1  | Fact Validation | Perplexity (manual) | Synthesis | Verified synthesis with source citations |
| 3.2  | Deep Reasoning | Claude (API) | Step 3.1 output | Stress-tested analysis with confidence levels |
| 3.3  | Edge & Contrarian | Grok (manual) | Step 3.2 output | Contrarian views, hidden risks, timing analysis |
| 3.4  | System & Execution | ChatGPT (API) | Step 3.3 output | Decision framework + action plan |
| 3.5  | Design & Polish | Gemini (API) | Step 3.4 output | Executive summary + polished deliverable |

**Rules**:
- Each step feeds into the next (chain)
- If a step's direct predecessor has no output, it falls back to the synthesis (step 2.1)
- Manual steps show copy-paste instructions

## Phase 4 — Final Assembly

**Goal**: Produce the final, presentation-ready research document.

| Step | Action | Model | Input | Output |
|------|--------|-------|-------|--------|
| 4.1  | Final Assembly | Claude (API) | Brief + all pipeline outputs | Complete research document |
| 4.2  | Visual Polish | Gemini (API) | Step 4.1 output | Executive-formatted report |

**Export Formats**: PDF, Word, Markdown, JSON
