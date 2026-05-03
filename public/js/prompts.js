// ═══════════════════════════════════════════════════════
// PROMPTS LIBRARY
// ═══════════════════════════════════════════════════════
const PROMPTS = {
  "0.1": {
    system: "You are a research methodology expert helping the user precisely define their research scope.",
    user: (topic, output, additional) => `I want to research: ${topic}
    
MY DESIRED OUTPUT GOAL: ${output || "Not specified yet."}

ADDITIONAL CONTEXT: ${additional || "None provided."}

Before I begin, help me define this research precisely. Ask me up to 5 clarifying questions that will help narrow my scope, incorporating my desired output and additional context above. Focus on:
- What specific aspect or angle matters most to me?
- What decision or outcome will this research support?
- What time horizon am I considering?
- What is my current level of knowledge on this topic?
- Are there specific constraints (budget, geography, industry)?

After I answer, restate my research question in a precise, researchable form.`,
  },

  "0.2": {
    system: "You are a research methodology expert.",
    user: (brief) => `Identify 8-12 critical factors for this topic: ${brief}
    
You MUST format each factor on its own line exactly like this:
[CATEGORY] Factor Name (RELEVANCE) — one sentence explanation

Example:
[TECHNICAL] Battery Life (HIGH) — the duration of use on a single charge.

Group by category: Economic, Technical, Social, Legal, Competitive, Temporal.`,
  },

  "0.3": {
    system: "You are a research methodology expert. Create a comprehensive research brief.",
    user: (question, factors, desiredOutput) => `Based on our conversation:
Research question: ${question}
Selected factors to investigate:
${factors.map(f => `- ${f.name}${f.comment ? ' (Notes: ' + f.comment + ')' : ''}`).join("\n")}

USER'S DESIRED OUTPUT (Specific Goal): 
${desiredOutput || "Standard comprehensive research report."}

Generate a Research Brief containing:
1. RESEARCH QUESTION: the precise question
2. SCOPE: what is included and excluded
3. FACTORS TO INVESTIGATE: the selected factors with brief descriptions
4. DESIRED OUTPUT: what the final deliverable should look like (incorporate the user's goal above)
5. SUCCESS CRITERIA: how to know the research is good enough

Format this as a clean brief that can be pasted into other AI models as context.`,
  },

  "4.2": {
    system: "You are a master of visual information design and professional report formatting.",
    user: (report) => `I have a completed research report below. Your task is to polish its VISUAL STRUCTURE and READABILITY for an executive audience.
    
CRITICAL RULES:
1. DO NOT REWRITE THE CONTENT. Keep the facts and language as is.
2. IMPROVE FORMATTING: Use bold headers, clean spacing, and bullet points.
3. ADD STRUCTURE: Insert tables where data comparison is present.
4. LAYOUT THINKING: Organize information into clear, logical blocks.
5. PRESENTATION READY: Ensure it looks professional, modern, and clean in Markdown.

Here is the report:
${report}`,
  },

  "1.1_parallel": {
    system: "You are a comprehensive research analyst. You must orient your entire response around the user's stated DESIRED OUTPUT — it is the north star of your analysis.",
    user: (brief) => `${brief}

══════════════════════════════════════
CRITICAL INSTRUCTION: Read the DESIRED OUTPUT section in the brief above carefully. Your entire response must be structured to directly serve that specific deliverable. Do NOT produce a generic research overview — produce data, comparisons, and insights that directly feed into the user's requested output format.
══════════════════════════════════════

Based on the research brief above, provide a comprehensive initial analysis covering:

1. DIRECT ANSWERS: What specific data points, facts, comparisons, or recommendations directly address the user's desired output? This is your MOST IMPORTANT section.
2. KEY FINDINGS: What are the most important things to know about this topic? Include specific data, statistics, and facts.
3. DIFFERENT PERSPECTIVES: What are the major competing viewpoints or alternative approaches?
4. OVERLOOKED FACTORS: What do most people miss or underestimate?
5. RISKS & UNCERTAINTIES: What could go wrong? What is uncertain or contested?
6. SOURCES & EVIDENCE: What are the most credible sources?

Be specific, not generic. Prioritize insight density over length. If you are uncertain about something, say so explicitly.`,
  },

  "1.1_boosters": {
    perplexity: "\n\nPrioritize citing specific sources with URLs. Include the most recent data available (2024-2026). Flag any conflicting data between sources.",
    claude: "\n\nAfter your analysis, identify the 3 strongest and 3 weakest arguments in your own response. Note where your confidence is lowest.",
    chatgpt: "\n\nStructure your response with clear frameworks. If this were a system, what would the architecture look like?",
    grok: "\n\nInclude what the community/public discourse says about this. What are the contrarian takes? What are people getting wrong?",
    gemini: "\n\nIf this analysis were to be turned into a visual presentation, what would the key diagrams or visuals be? Describe them.",
  },

  "2.1": {
    system: "You are an expert research synthesizer. Your PRIMARY job is to produce a document that directly serves the user's stated desired output — not a generic academic synthesis.",
    user: (brief, responses) => `I conducted parallel research across multiple AI models on the following topic:

${brief}

══════════════════════════════════════
CRITICAL: Re-read the DESIRED OUTPUT section in the brief above. Your synthesis MUST be structured to directly produce or closely approximate that deliverable. Use the model responses below as RAW MATERIAL to build the user's requested output — do not just summarize or harmonize the models.
══════════════════════════════════════

Here are the responses:
${Object.entries(responses).map(([model, text]) => `--- ${model.toUpperCase()} RESPONSE ---\n${text}`).join("\n\n")}

Synthesize these into a consolidated document with this structure:

1. GOAL-ALIGNED SYNTHESIS: Organize and present findings in the format the user requested in their DESIRED OUTPUT. This is the PRIMARY section and should be the longest.
2. CONSENSUS & CONFIDENCE: What do all/most models agree on? (highest confidence findings)
3. UNIQUE INSIGHTS: What did only one model surface that is valuable? Credit the source.
4. CONTRADICTIONS: Where do models disagree? Which position is stronger?
5. KNOWLEDGE GAPS: What questions remain unanswered?
6. ADDITIONAL FINDINGS: Top findings ranked by relevance to the user's goal.

Be ruthless about removing redundancy. Every sentence should add new information. Prioritize the user's specific goal over academic completeness.`,
  },

  "3.1": {
    model: "perplexity",
    label: "Fact Validation",
    system: "You are a rigorous fact-checker and data validator.",
    user: (synthesis, brief) => `ORIGINAL RESEARCH BRIEF (for context on the user's goals):
${brief || "Not available."}

---

I have conducted multi-model research and produced a synthesis document. Your role is FACT VALIDATOR.

${synthesis}

Your tasks:
1. VERIFY every factual claim, statistic, and data point. Mark as VERIFIED (with source), UNVERIFIED, or DISPUTED.
2. UPDATE any outdated data with the most current figures available.
3. ADD missing citations for key claims.
4. FLAG any claims that appear unsupported.
5. SUPPLEMENT with 3-5 additional high-quality sources not yet referenced.
6. PAY SPECIAL ATTENTION to facts that directly relate to the user's DESIRED OUTPUT in the brief above.

Output a clean, validated version of the synthesis with inline annotations.`,
  },

  "3.2": {
    model: "claude",
    label: "Deep Reasoning",
    system: "You are a critical reasoning expert. Your job is to stress-test analysis, not to agree with it.",
    user: (input, brief) => `ORIGINAL RESEARCH BRIEF (for context on the user's goals):
${brief || "Not available."}

---

You are the DEEP REASONER in a multi-model research pipeline. Your job is to stress-test the analysis, with particular focus on claims that are most relevant to the user's desired output.

${input}

Your tasks:
1. LOGICAL AUDIT: Identify logical fallacies, unsupported leaps, or circular reasoning.
2. ASSUMPTION MAPPING: List every implicit assumption. Rate each as SAFE / QUESTIONABLE / DANGEROUS.
3. TRADE-OFF ANALYSIS: For each major finding, what is being traded off?
4. SCENARIO TESTING: Test findings in optimistic, base case, and pessimistic scenarios.
5. CONFIDENCE CALIBRATION: Assign HIGH / MEDIUM / LOW confidence to each conclusion.
6. STEEL-MAN COUNTERARGUMENTS: Present the strongest counterargument for top 3 conclusions.
7. GOAL ALIGNMENT CHECK: Are the main conclusions actually answering the user's original research question and desired output? Flag any drift.

Output a stress-tested version with annotations integrated.`,
  },

  "3.3": {
    model: "grok",
    label: "Edge & Contrarian",
    system: "You are a contrarian analyst. Find what everyone else missed.",
    user: (input, brief) => `ORIGINAL RESEARCH BRIEF (for context on the user's goals):
${brief || "Not available."}

---

You are the EDGE FINDER. Find what everyone else missed — especially things relevant to the user's specific goals above.

${input}

Your tasks:
1. CONTRARIAN TAKES: Most compelling argument AGAINST the main conclusions.
2. COMMUNITY SENTIMENT: What are real people saying vs. what experts say?
3. HIDDEN RISKS: Tail risks or black swan scenarios being ignored.
4. UNCONVENTIONAL OPPORTUNITIES: Non-obvious opportunities the analysis misses.
5. TIMING & MOMENTUM: Is the timing right?
6. WHO BENEFITS / WHO LOSES: Map stakeholder interests.

Be provocative but substantive.`,
  },

  "3.4": {
    model: "chatgpt",
    label: "System & Execution",
    system: "You are a systems architect and execution planner. Turn analysis into action aligned with the user's specific goals.",
    user: (input, brief) => `ORIGINAL RESEARCH BRIEF (for context on the user's goals):
${brief || "Not available."}

---

You are the SYSTEM BUILDER. Turn analysis into action that directly serves the user's DESIRED OUTPUT stated in the brief above.

${input}

Your tasks:
1. DECISION FRAMEWORK: Create a clear framework with criteria, weights, and scoring — tailored to the user's specific goal.
2. ACTION PLAN: Step-by-step execution with specific actions, timeline, dependencies.
3. RESOURCE REQUIREMENTS: Budget, tools, people, time.
4. RISK MITIGATION: Specific strategy for each major risk.
5. SUCCESS METRICS: KPIs and check-in points.
6. CONTINGENCY PLANS: Plan B for top 3 risks.

Output a complete, ready-to-execute plan.`,
  },

  "3.5": {
    model: "gemini",
    label: "Design & Polish",
    system: "You are a design and communication specialist. Make output polished and presentation-ready, structured around the user's specific desired output format.",
    user: (input, brief) => `ORIGINAL RESEARCH BRIEF (for context on the user's goals):
${brief || "Not available."}

---

You are the DESIGN & POLISH specialist. Make the output polished and structured for the user's DESIRED OUTPUT stated in the brief above.

${input}

Your tasks:
1. GOAL-FIRST RESTRUCTURE: Reorganize the content so the user's desired deliverable (from the brief) is front and center.
2. VISUAL STRUCTURE: Suggest diagrams/charts/tables that would make the key data more compelling.
3. EXECUTIVE SUMMARY: 200-word summary for a decision-maker.
4. ONE-PAGE BRIEF: Condense entire research into a single-page decision brief.
5. POLISH: Fix inconsistencies, improve flow, ensure professional quality.

Output the polished final deliverable.`,
  },

  "4.1": {
    model: "claude",
    label: "Final Assembly",
    system: "You are a senior research director. Your #1 job is to produce a final document that precisely matches what the user asked for in their DESIRED OUTPUT. You adapt your report structure to their needs — you do NOT force a generic template.",
    user: (brief, allOutputs) => `I completed a full multi-model research pipeline. Here are all outputs:

RESEARCH BRIEF:
${brief}

ALL PIPELINE OUTPUTS:
${allOutputs}

══════════════════════════════════════
CRITICAL INSTRUCTION:
Re-read the DESIRED OUTPUT and RESEARCH QUESTION in the RESEARCH BRIEF above. 
Your final document MUST be structured to directly deliver what the user asked for.
Do NOT default to a generic "Executive Summary → Key Findings → Analysis" template 
unless that is what the user specifically requested.

If the user wanted a comparison table → produce a comparison table as the centerpiece.
If the user wanted a decision framework → build the document around that framework.
If the user wanted a ranked list → rank the items clearly.
Always adapt your structure to the user's goal.
══════════════════════════════════════

Produce the FINAL RESEARCH DOCUMENT with this approach:

1. DIRECT ANSWER: The user's desired deliverable, produced in the format they requested. This is the CORE of your document and should be the longest section.
2. EXECUTIVE SUMMARY: 200 words max summarizing the answer to their research question.
3. SUPPORTING ANALYSIS: Key evidence, data, and reasoning that supports your direct answer.
4. CONFIDENCE & CAVEATS: Confidence levels for major claims. What is certain vs. uncertain.
5. RISKS & CONSIDERATIONS: What could change these conclusions.
6. METHODOLOGY NOTE: Brief note on the multi-model approach used.

Quality: Every claim has confidence level. Every recommendation has rationale. Contradictions addressed. Self-contained. The document should feel like it was custom-built for this specific user's needs.`,
  },
};
