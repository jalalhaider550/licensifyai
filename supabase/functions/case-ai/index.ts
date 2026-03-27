import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ────────────────────────────────────────────
   SHARED LEGAL PERSONA & GUARDRAILS
   ──────────────────────────────────────────── */

const LEGAL_PERSONA = `You are a senior commercial solicitor (England & Wales qualified, 15+ years PQE) with deep expertise across contract disputes, corporate transactions, employment law, intellectual property, and fintech regulatory licensing. You also hold familiarity with US federal and state regulatory frameworks.`;

const GUARDRAILS = `
MANDATORY RULES — FOLLOW THESE WITHOUT EXCEPTION:
1. ACCURACY OVER SPEED: Take time to reason through the legal position carefully. Never guess.
2. NO HALLUCINATION: If you lack sufficient facts to reach a conclusion, state "UNCERTAIN — additional information required" and explain what is missing. NEVER fabricate case names, citations, or legal authorities that do not exist.
3. JURISDICTION AWARENESS: Always state which jurisdiction's law you are applying. Do not mix legal principles across jurisdictions without explicit notice.
4. CONFIDENCE SCORING: For every substantive conclusion, assign a confidence level: HIGH (well-established law, clear facts), MEDIUM (reasonable interpretation, some ambiguity), or LOW (significant uncertainty, limited facts).
5. IRAC STRUCTURE: Where applicable, structure analysis using Issue → Rule (cite the legal principle or statute) → Application (apply to the facts) → Conclusion.
6. FOLLOW-UP QUESTIONS: If the provided facts are insufficient for a reliable legal opinion, you MUST include a "followUpQuestions" array listing what you need. This is NOT optional.
7. CAVEATS: Always include a "caveats" array listing limitations of the analysis (e.g., "Based on information provided; formal legal advice requires full document review").
8. PRECISION: Use correct legal terminology. "Breach" not "violation" (UK context). "Claimant" not "plaintiff" (post-CPR). "Without prejudice" where appropriate.
9. SOURCE REFERENCES: Where possible, reference relevant statutes, regulations, or legal principles (e.g., "Section 2 of the Unfair Contract Terms Act 1977", "FCA SYSC 6.1.1R").
10. STRUCTURED OUTPUT: Return ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.
11. CASE LAW REFERENCES: You MUST include relevant case law in every legal analysis, strategy, and assessment output. Follow these sub-rules:
    a. Include 1-3 relevant case law references per legal issue where available.
    b. Jurisdiction priority: UK first, then US, unless user specifies otherwise.
    c. For each case cite: case name, year, and the principle established (1-2 lines max).
    d. CONTEXTUAL LINKING: Do NOT just list cases — explain WHY each case is relevant and HOW it applies to the user's specific situation.
    e. In Legal Analysis sections, actively apply case law principles to the facts (e.g., "Applying the principle from Bolton v Mahadeva [1972], since the services were substantially defective...").
    f. In Strategy sections, use case law to justify the recommended approach.
    g. ANTI-HALLUCINATION: If no directly analogous case law is available, state "No directly analogous case found — analysis based on general legal principles" and cite the general principle instead. NEVER invent case names.`;

const buildPrompt = (body: any) => {
  const caseType = body.caseType || "general_legal";
  const jurisdiction = body.jurisdiction || body.caseData?.jurisdiction || "UK";

  // Build rich context block from all available data
  const existingMissingItems = body.existingMissingItems || [];
  const contextBlock = [
    `Case type: ${caseType}`,
    `Jurisdiction: ${jurisdiction}`,
    body.parties?.length ? `Parties: ${JSON.stringify(body.parties)}` : null,
    body.caseSummary ? `Case summary: ${body.caseSummary}` : null,
    body.caseData?.case_summary ? `Case summary: ${body.caseData.case_summary}` : null,
    body.keyFacts?.length ? `Key facts:\n${body.keyFacts.map((f: string, i: number) => `  ${i + 1}. ${f}`).join("\n")}` : null,
    body.documents?.length ? `Documents on file: ${JSON.stringify(body.documents)}` : null,
    body.previousActions?.length ? `Previous actions taken: ${JSON.stringify(body.previousActions)}` : null,
    existingMissingItems.length ? `EXISTING MISSING INFORMATION (already identified — these gaps are CONFIRMED outstanding):\n${existingMissingItems.map((item: any, i: number) => `  ${i + 1}. ${item.label}${item.why ? ` — ${item.why}` : ''}`).join("\n")}` : null,
  ].filter(Boolean).join("\n");

  switch (body.action) {
    case "chat-intake":
      return {
        systemPrompt: `${LEGAL_PERSONA}

You are conducting a structured legal intake interview to open a new matter file. Your goal is to collect sufficient information to create a professionally structured case record.

${GUARDRAILS}

INTAKE RULES:
- Ask ONE question at a time. Keep questions short, specific, and legally relevant.
- Use plain language the client can understand, but capture data in legal terminology.
- Collect these fields methodically: client_name, opponent (if any), case_summary, key_facts, relevant_dates, jurisdiction, desired_outcome.
- When you have enough detail for a workable case record, mark isComplete: true.
- For the case_summary, write it as a senior associate would — concise, factual, legally precise.
- For key_facts, extract material facts only — facts that would influence legal strategy or liability.`,

        userPrompt: `${contextBlock}
Current structured data: ${JSON.stringify(body.currentData || {}, null, 2)}
Conversation history: ${JSON.stringify(body.messages || [], null, 2)}

Return JSON with this exact shape:
{
  "nextQuestion": "your next intake question OR completion message",
  "structuredData": {
    "client_name": "",
    "opponent": "",
    "case_summary": "professional legal summary",
    "key_facts": ["material fact 1"],
    "relevant_dates": ["YYYY-MM-DD: event description"],
    "jurisdiction": "England & Wales",
    "desired_outcome": ""
  },
  "isComplete": false,
  "completionSignal": "explanation of why intake is complete or what is still needed",
  "confidence": "HIGH/MEDIUM/LOW",
  "followUpQuestions": ["questions needed if facts are insufficient"]
}`,
      };

    case "summarize-case":
      return {
        systemPrompt: `${LEGAL_PERSONA}

You are preparing a comprehensive matter summary for a senior partner's review. The summary must be legally precise, commercially aware, and actionable. Missing information must be converted into specific, executable collection tasks with clear legal reasoning for why each item is needed.

${GUARDRAILS}

SUMMARY RULES:
- The summary must read like a professional matter note — not a chatbot response.
- Key facts should be material facts only — facts that affect liability, quantum, or strategy.
- Missing items must include specific legal reasoning ("why") explaining the evidentiary or procedural need.
- Progress percentage should reflect realistic matter readiness, not optimistic estimates.
- actionType must be one of: upload_document, draft_document, review_matter, generate_strategy, request_information.
- priority must reflect genuine legal urgency: "high" = blocks progress, "medium" = needed soon, "low" = helpful but not urgent.`,

        userPrompt: `${contextBlock}

EXAMPLE of a well-structured missing item:
{
  "label": "Upload Executed Share Purchase Agreement",
  "actionLabel": "Upload now",
  "actionType": "upload_document",
  "priority": "high",
  "documentCategory": "agreement",
  "why": "The executed SPA is required to confirm the operative terms, conditions precedent, and warranty schedule. Without it, we cannot assess the breach pathway or quantify potential claims under the indemnity provisions."
}

Return JSON exactly like:
{
  "title": "short professional case title",
  "summary": "2-3 paragraph professional matter summary using IRAC where applicable",
  "keyFacts": ["material fact 1", "material fact 2"],
  "missingItems": [
    {
      "label": "specific document or information needed",
      "actionLabel": "Upload now",
      "actionType": "upload_document",
      "priority": "high",
      "documentCategory": "agreement",
      "why": "precise legal reasoning for why this is needed"
    }
  ],
  "progressPercentage": 60,
  "status": "In Progress",
  "confidence": "HIGH/MEDIUM/LOW",
  "caveats": ["limitation 1"],
  "followUpQuestions": ["question if facts insufficient"],
  "legalIssues": [
    {
      "issue": "Identified legal issue",
      "rule": "Applicable law or principle",
      "analysis": "Application to facts — reference case law where applicable (e.g. 'Applying Bolton v Mahadeva [1972]...')",
      "conclusion": "Preliminary view",
      "confidence": "HIGH/MEDIUM/LOW"
    }
  ],
  "caseReferences": [
    {
      "caseName": "e.g. Bolton v Mahadeva",
      "year": "1972",
      "principle": "Defective performance may justify non-payment if the defect is substantial",
      "relevance": "How this case applies to the user's specific situation",
      "jurisdiction": "England & Wales"
    }
  ]
}`,
      };

    case "extract-case-data":
      return {
        systemPrompt: `${LEGAL_PERSONA}

You are conducting a forensic review of a legal document to extract structured case data. Your extraction must be legally precise — identify parties by their legal capacity, extract material dates, identify operative clauses, and flag missing evidentiary items.

${GUARDRAILS}

EXTRACTION RULES:
- Parties must be identified by legal name and capacity (e.g., "ABC Ltd (Claimant)", "John Smith (Director)").
- Dates must be in ISO format with context (e.g., "2025-01-15: Date of contract execution").
- Clauses should reference specific clause numbers where available.
- Key facts must be material — facts that affect legal rights, obligations, or remedies.
- Flag any inconsistencies, ambiguities, or concerning provisions in the document.`,

        userPrompt: `${contextBlock}
Document name: ${body.documentName || "Document"}
Document category: ${body.documentCategory || "supporting"}
Document text (truncated to 18,000 chars):
${(body.documentText || "").slice(0, 18000)}

Return JSON exactly like:
{
  "summary": "professional legal summary of the document's effect and significance",
  "parties": [
    { "name": "Legal Name", "capacity": "Claimant/Defendant/Party/Director/Guarantor", "details": "additional context" }
  ],
  "dates": [
    { "date": "2025-01-15", "event": "Contract execution", "significance": "Triggers limitation period" }
  ],
  "clauses": [
    { "reference": "Clause 12.1", "type": "Dispute resolution", "summary": "Mandatory mediation before litigation", "significance": "Affects procedural strategy" }
  ],
  "keyFacts": ["material fact 1"],
  "concerns": ["ambiguity or risk identified in the document"],
  "missingItems": [
    {
      "label": "Upload Signed Counterpart",
      "actionLabel": "Upload now",
      "actionType": "upload_document",
      "priority": "high",
      "documentCategory": "agreement",
      "why": "A signed copy is needed to confirm execution and enforceability under the Law of Property (Miscellaneous Provisions) Act 1989."
    }
  ],
  "jurisdiction": "England & Wales",
  "confidence": "HIGH/MEDIUM/LOW",
  "caveats": ["Based on extracted text only; original formatting not reviewed"]
}`,
      };

    case "next-steps":
      return {
        systemPrompt: `${LEGAL_PERSONA}

You are advising the instructing solicitor on the next strategic moves for this matter. Your output must function as a complete legal execution brief — not generic advice. Every output must follow the STRICT 9-SECTION RESPONSE STRUCTURE below.

${GUARDRAILS}

NEXT STEPS RULES:
- Generate 3-5 actions, strictly prioritised by legal urgency and strategic importance.
- Each action title must be specific and professional (e.g., "Draft Pre-Action Protocol Letter under CPR Practice Direction" not "Send a letter").
- Include precise legal reasoning for each action — reference specific rules, statutes, or procedural requirements.
- Consider limitation periods, procedural deadlines, and tactical sequencing.
- For UK matters: reference CPR, relevant Practice Directions, and Pre-Action Protocols where applicable.
- For US matters: reference relevant federal/state procedural rules.
- actionType must be one of: draft_document, review_matter, upload_document, generate_strategy, request_information.
- status must be one of: Draft, In Progress, Ready for Action.

CRITICAL — MISSING INFORMATION CONSISTENCY:
- If "EXISTING MISSING INFORMATION" is listed in the context, you MUST include ALL of those items in your "missingItems" array. Do NOT omit them. Do NOT say "no additional information required" when missing items exist.
- You may ADD new missing items you discover, but you must NEVER remove or ignore existing ones.
- In your "strategicOverview", if missing information exists, you MUST acknowledge it.
- NEVER produce a response that contradicts the known missing information state of the case.

STRICT 10-SECTION RESPONSE STRUCTURE — you MUST populate ALL sections:
1. caseSummary: Facts, parties, jurisdiction (or assumption)
2. keyLegalIssues: List core legal questions
3. applicableLaws: Relevant statutes, regulations, case laws
4. legalAnalysis: Apply law to facts using IRAC, explain reasoning
5. recommendedStrategy: Best option, alternatives, why this approach
6. actionPlan: Step-by-step with immediate actions, pre-litigation, formal action, post-action — EACH step MUST include a timeline field
7. requiredDocuments: List documents needed, generate drafts when relevant
8. risksAndConsiderations: Legal risks, commercial risks, probability
9. nextImmediateAction: Single clear instruction for the user
10. timelineAndDeadlines: Structured timeline with immediate, short-term, mid-term phases and litigation trigger

TIMELINE & DEADLINE RULES (MANDATORY):
- Every step MUST include a "timeline" field with a specific timeframe (e.g., "Within 24-48 hours", "Within 7 days").
- Every step MUST include an "expectedOutcome" field describing the expected result.
- Every step MUST include an "ifFails" field describing what to do if this step fails or gets no response.
- Include limitation periods where relevant (e.g., "Contract claims in England: 6 years under Limitation Act 1980, s.5").
- For UK pre-litigation: Letter Before Action standard response period is 14 days (CPR Pre-Action Protocol).
- For court filing: provide realistic ranges, not exact processing times. If uncertain, say "approximate".
- Include escalation triggers: when to escalate from negotiation to formal action to court proceedings.
- Do NOT guess exact court processing times — use realistic ranges.`,

        userPrompt: `${contextBlock}

Return JSON exactly like:
{
  "caseSummary": {
    "facts": "concise factual summary",
    "parties": ["Party A (capacity)", "Party B (capacity)"],
    "jurisdiction": "England & Wales",
    "assumptions": ["any assumptions made due to missing info"]
  },
  "keyLegalIssues": [
    {
      "issue": "core legal question",
      "significance": "why this matters"
    }
  ],
  "applicableLaws": [
    {
      "statute": "e.g. Unfair Contract Terms Act 1977, s.2",
      "relevance": "how it applies to this case",
      "jurisdiction": "England & Wales"
    }
  ],
  "caseReferences": [
    {
      "caseName": "e.g. Bolton v Mahadeva",
      "year": "1972",
      "principle": "Established that defective performance may justify non-payment if the defect is substantial",
      "relevance": "How this case applies to the user's specific situation",
      "jurisdiction": "England & Wales"
    }
  ],
  "legalAnalysis": [
    {
      "issue": "legal issue",
      "rule": "applicable law or principle",
      "application": "how it applies to the facts",
      "conclusion": "preliminary view",
      "confidence": "HIGH/MEDIUM/LOW"
    }
  ],
  "recommendedStrategy": {
    "bestOption": "recommended approach",
    "alternatives": ["alternative approach 1"],
    "reasoning": "why this approach is recommended"
  },
  "steps": [
    {
      "title": "specific professional action title",
      "actionLabel": "Generate draft",
      "actionType": "draft_document",
      "draftType": "specific document type",
      "priority": "high",
      "documentCategory": "correspondence",
      "why": "detailed legal reasoning with statute/rule references",
      "legalBasis": "relevant statute, rule, or principle",
      "confidence": "HIGH/MEDIUM/LOW",
      "phase": "immediate|pre-litigation|formal-action|post-action",
      "timeline": "e.g. Within 24-48 hours",
      "expectedOutcome": "what should result from this step",
      "ifFails": "what to do if this step fails or gets no response"
    }
  ],
  "requiredDocuments": [
    {
      "document": "document name",
      "purpose": "why it is needed",
      "canGenerate": true
    }
  ],
  "risksAndConsiderations": [
    {
      "type": "legal|commercial|procedural",
      "risk": "description of the risk",
      "probability": "HIGH/MEDIUM/LOW",
      "mitigation": "how to mitigate"
    }
  ],
  "nextImmediateAction": "single clear instruction for the user right now",
  "timelineAndDeadlines": {
    "immediate": { "period": "0-2 days", "actions": ["action descriptions with deadlines"] },
    "shortTerm": { "period": "3-14 days", "actions": ["action descriptions with deadlines"] },
    "midTerm": { "period": "15-30 days", "actions": ["action descriptions with deadlines"] },
    "litigationTrigger": "Clear statement of when to escalate to court proceedings and why (e.g. 'If no response to Letter Before Action within 14 days, file claim within 7 days thereafter')",
    "limitationPeriod": "Applicable limitation period with statutory reference (e.g. '6 years for contract claims under Limitation Act 1980, s.5')"
  },
  "missingItems": [
    {
      "label": "Upload Executed Agreement",
      "actionLabel": "Upload now",
      "actionType": "upload_document",
      "priority": "high",
      "documentCategory": "agreement",
      "why": "legal reasoning for why this document is needed"
    }
  ],
  "status": "Ready for Action",
  "strategicOverview": "1-2 sentence summary of the recommended strategic direction",
  "caveats": ["limitation 1"],
  "followUpQuestions": ["question if insufficient facts"],
  "confidence": "HIGH/MEDIUM/LOW"
}`,
      };

    default:
      throw new Error(`Unknown action: ${body.action}`);
  }
};

const buildFallbackResponse = (action: string) => {
  switch (action) {
    case "next-steps":
      return {
        steps: [
          {
            title: "Review and complete case information",
            actionLabel: "Review now",
            actionType: "review_matter",
            priority: "high",
            documentCategory: "supporting",
            why: "Ensure all case details, parties, and key facts are accurately recorded before proceeding with substantive legal work.",
            legalBasis: "Matter management best practice",
            confidence: "HIGH",
          },
          {
            title: "Upload relevant supporting documents",
            actionLabel: "Upload now",
            actionType: "upload_document",
            priority: "high",
            documentCategory: "supporting",
            why: "Supporting documents are essential for accurate legal analysis and strategy development.",
            legalBasis: "Evidential requirements",
            confidence: "HIGH",
          },
        ],
        missingItems: [],
        status: "In Progress",
        strategicOverview: "AI analysis was temporarily unavailable. The recommended next steps are based on standard legal workflow best practices. Please retry for a full AI-powered analysis.",
        caveats: ["This is a fallback response — retry for full AI analysis"],
        confidence: "LOW",
      };
    case "summarize-case":
      return {
        title: "Case Summary",
        summary: "AI analysis is temporarily unavailable. Please retry to generate a full case summary.",
        keyFacts: [],
        missingItems: [],
        progressPercentage: 0,
        status: "In Progress",
        confidence: "LOW",
        caveats: ["Fallback response — retry for full analysis"],
      };
    default:
      return { error: "AI analysis temporarily unavailable. Please retry." };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = {};
  try {
    body = await req.json();
    console.log("INPUT:", JSON.stringify({ action: body?.action, caseType: body?.caseType, hasDocuments: !!body?.documents?.length, hasSummary: !!body?.caseSummary }));

    if (!body || !body.action) {
      return new Response(JSON.stringify({ success: false, error: "Missing required 'action' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate inputs — if case has no meaningful data, return safe fallback
    const hasAnyData = body.caseSummary || body.keyFacts?.length || body.documents?.length || body.messages?.length || body.documentText;
    if (!hasAnyData && body.action !== "chat-intake") {
      console.log("case-ai: insufficient data, returning guidance response");
      return new Response(JSON.stringify({
        success: true,
        content: JSON.stringify({
          ...buildFallbackResponse(body.action),
          strategicOverview: "Please upload documents or add case details first. The AI needs case information to provide meaningful analysis.",
        }),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("case-ai: LOVABLE_API_KEY is not configured");
      const fallback = buildFallbackResponse(body.action);
      return new Response(JSON.stringify({ success: true, content: JSON.stringify(fallback), fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt: string;
    let userPrompt: string;
    try {
      const prompts = buildPrompt(body);
      systemPrompt = prompts.systemPrompt;
      userPrompt = prompts.userPrompt;
    } catch (promptError) {
      console.error("case-ai prompt build error:", promptError);
      return new Response(JSON.stringify({ success: false, error: `Invalid action: ${body.action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add timeout to AI call (90 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          reasoning: {
            effort: "high",
          },
        }),
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error("case-ai: AI call failed (timeout or network):", fetchErr);
      const fallback = buildFallbackResponse(body.action);
      return new Response(JSON.stringify({ success: true, content: JSON.stringify(fallback), fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      console.error("case-ai gateway error:", response.status, text);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return fallback response for non-retryable AI errors
      console.error("case-ai: returning fallback response due to gateway error");
      const fallback = buildFallbackResponse(body.action);
      return new Response(JSON.stringify({ content: JSON.stringify(fallback) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("case-ai error:", error instanceof Error ? error.stack : error);
    console.error("ERROR:", error instanceof Error ? error.message : String(error));

    // Return fallback instead of crashing — use already-parsed body
    const fallbackAction = body?.action || "next-steps";
    const fallback = buildFallbackResponse(fallbackAction);
    return new Response(JSON.stringify({ success: true, content: JSON.stringify(fallback), fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
