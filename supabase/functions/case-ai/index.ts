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
2. NO HALLUCINATION: If you lack sufficient facts to reach a conclusion, state "UNCERTAIN — additional information required" and explain what is missing.
3. JURISDICTION AWARENESS: Always state which jurisdiction's law you are applying. Do not mix legal principles across jurisdictions without explicit notice.
4. CONFIDENCE SCORING: For every substantive conclusion, assign a confidence level: HIGH (well-established law, clear facts), MEDIUM (reasonable interpretation, some ambiguity), or LOW (significant uncertainty, limited facts).
5. IRAC STRUCTURE: Where applicable, structure analysis using Issue → Rule (cite the legal principle or statute) → Application (apply to the facts) → Conclusion.
6. FOLLOW-UP QUESTIONS: If the provided facts are insufficient for a reliable legal opinion, you MUST include a "followUpQuestions" array listing what you need. This is NOT optional.
7. CAVEATS: Always include a "caveats" array listing limitations of the analysis (e.g., "Based on information provided; formal legal advice requires full document review").
8. PRECISION: Use correct legal terminology. "Breach" not "violation" (UK context). "Claimant" not "plaintiff" (post-CPR). "Without prejudice" where appropriate.
9. SOURCE REFERENCES: Where possible, reference relevant statutes, regulations, or legal principles (e.g., "Section 2 of the Unfair Contract Terms Act 1977", "FCA SYSC 6.1.1R").
10. STRUCTURED OUTPUT: Return ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.`;

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
      "analysis": "Application to facts",
      "conclusion": "Preliminary view",
      "confidence": "HIGH/MEDIUM/LOW"
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

You are advising the instructing solicitor on the next strategic moves for this matter. Each recommendation must be legally precise, strategically sound, and executable. Every action should read like a task a qualified lawyer would actually perform — not generic advice.

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
- In your "strategicOverview", if missing information exists, you MUST acknowledge it. For example: "The following actions can proceed in parallel, however [N] items of outstanding information should be collected to ensure a complete matter file."
- For each recommended step, if it can proceed despite missing info, state in the "why" field: "This step can proceed, however the following information remains outstanding for completeness: [list relevant missing items]."
- For steps that CANNOT proceed without specific missing info, state clearly: "This action requires the following information before it can be completed: [list items]."
- NEVER produce a response that contradicts the known missing information state of the case.`,

        userPrompt: `${contextBlock}

EXAMPLE of a well-structured next step:
{
  "title": "Draft Pre-Action Protocol Letter (Professional Negligence)",
  "actionLabel": "Generate draft",
  "actionType": "draft_document",
  "draftType": "pre-action protocol letter",
  "priority": "high",
  "documentCategory": "correspondence",
  "why": "Under the Pre-Action Protocol for Professional Claims, a Letter of Claim must be sent giving the defendant 3 months to investigate and respond. Failure to comply may result in adverse costs consequences under CPR r.44.3(5)(a). Given the limitation period expires in approximately 14 months, this should be issued promptly to preserve the litigation timetable.",
  "legalBasis": "Pre-Action Protocol for Professional Claims, CPR Part 44",
  "confidence": "HIGH"
}

Return JSON exactly like:
{
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
      "confidence": "HIGH/MEDIUM/LOW"
    }
  ],
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

  try {
    const body = await req.json();

    if (!body || !body.action) {
      return new Response(JSON.stringify({ error: "Missing required 'action' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("case-ai: LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured. Please contact support.");
    }

    let systemPrompt: string;
    let userPrompt: string;
    try {
      const prompts = buildPrompt(body);
      systemPrompt = prompts.systemPrompt;
      userPrompt = prompts.userPrompt;
    } catch (promptError) {
      console.error("case-ai prompt build error:", promptError);
      return new Response(JSON.stringify({ error: `Invalid action: ${body.action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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

    // Return fallback instead of crashing
    try {
      const body = await req.clone().json().catch(() => ({}));
      const fallback = buildFallbackResponse((body as any)?.action || "next-steps");
      return new Response(JSON.stringify({ content: JSON.stringify(fallback), fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});
