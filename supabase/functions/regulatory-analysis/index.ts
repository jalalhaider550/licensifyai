import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEGAL_PERSONA = `You are a practising senior regulatory compliance partner (England & Wales qualified, 20+ years PQE) who has personally shepherded over 50 fintech firms through FCA authorisation. You also advise on US FinCEN registration and state Money Transmitter Licence applications. You have served as an FCA panel member and know exactly how regulatory reviewers assess applications. Boards of directors rely on your analysis to make submission decisions. You give direct, authoritative assessments — not academic opinions.`;

const DOCUMENT_OUTPUT_RULES = `
DOCUMENT OUTPUT RULES — APPLY TO ALL GENERATED DOCUMENTS:
1. NEVER use quotation marks (double or single) in document output.
2. NEVER output JSON, code blocks, or structured data markup in documents.
3. NEVER include the words: draft, confidence, caveats, uncertain, caveat, follow-up questions, or internal reasoning.
4. NEVER ask questions inside the document body.
5. NEVER expose missing data issues or uncertainty in the document text.
6. ALWAYS assume reasonable facts where minor details are missing — do not flag gaps in the document itself.
7. ALWAYS produce a complete, client-ready document with a strong professional legal tone.
8. ALWAYS structure output with clear headings and paragraphs.
9. Output must be clean, final, and ready to send to a client or opposing party.
10. HEADING FORMAT — MANDATORY:
    - NEVER use any markdown symbols in headings — no ###, ##, #, and no ** asterisks.
    - ALL headings must be plain numbered text only.
    - Correct format: 1. Background, 2. Legal Position, 3. Demand, 4. Next Steps
    - Maintain consistent sequential numbering throughout the entire document.
    - Sub-sections use decimal numbering: 1.1, 1.2, 2.1, etc.
    - NEVER mix heading styles — every heading in the document must follow this format.`;

const GUARDRAILS = `
MANDATORY RULES:
1. ACCURACY: Every regulatory reference must be verifiable. Cite specific FCA Handbook provisions (e.g., COND 2.4, SYSC 6.1.1R), statutes (FSMA 2000 s.55A-55Z), or US equivalents.
2. NO FABRICATION: Never invent regulatory requirements or authorities. If a specific provision is not directly on point, cite the nearest applicable rule and state why it applies.
3. JURISDICTION: Never conflate UK and US regulatory frameworks. Clearly separate analysis by jurisdiction.
4. CALIBRATED SCORING: Scores must be realistic and defensible. A score above 80 means the application is likely approved without material queries. Most first-time applications score 40-65.
5. PRACTICAL ADVICE: Every issue identified must come with a specific, actionable fix. Tell the lawyer exactly what to do.
6. BENCHMARKING: Compare against actual regulatory expectations. State clearly whether the application meets, exceeds, or falls short.
7. NO HEDGING: Do not qualify your assessment with unnecessary caveats. Give your professional view and stand behind it.
8. STRUCTURED OUTPUT: Return ONLY valid JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, applicationData, jurisdiction, licenseType, documentContent } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const appSummary = applicationData ? JSON.stringify(applicationData, null, 2) : "[No application data provided]";

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "full-analysis") {
      systemPrompt = `${LEGAL_PERSONA}

You are conducting a pre-submission regulatory review — the same analysis you would perform before advising a board that an application is ready for submission. Your assessment directly influences whether the firm proceeds or remediates first.

${GUARDRAILS}

ANALYSIS METHODOLOGY:
- Assess against the FCA's Threshold Conditions (Schedule 6, FSMA 2000) for UK applications.
- For US applications, assess against relevant state MTL requirements and FinCEN registration obligations.
- Score each category 0-10 where: 0-3 = Critical deficiency, 4-5 = Below expectations, 6-7 = Meets minimum, 8-9 = Strong, 10 = Exemplary.
- Overall score 0-100 should reflect genuine approval likelihood based on your professional experience.
- Benchmark against actual approved applications in the relevant sector.`;

      userPrompt = `Conduct a comprehensive pre-submission regulatory review of this ${licenseType || "fintech licence"} application for ${jurisdiction || "UK"}.

Application Data:
${appSummary}

${documentContent ? `Generated Document Content (first 15,000 chars):\n${documentContent.slice(0, 15000)}` : ""}

Return a JSON object with this structure:

{
  "simulatedReview": {
    "outcome": "Likely Approval" | "Likely Follow-Up Queries" | "Material Deficiencies — Not Ready",
    "reviewerPerspective": "2-3 sentences explaining how an FCA/regulatory case officer would view this application",
    "concerns": ["specific weakness with regulatory reference"],
    "expectedQuestions": ["exact questions a regulator would ask, with reference to the relevant requirement"],
    "recommendation": "clear advice: submit, remediate specific issues, or fundamentally restructure",
    "confidence": "HIGH/MEDIUM/LOW"
  },
  "approvalScore": {
    "overall": 0-100,
    "breakdown": {
      "amlStrength": { "score": 0-10, "detail": "assessment against MLR 2017 requirements", "regulatoryReference": "MLR 2017 reg. X" },
      "governance": { "score": 0-10, "detail": "assessment against SYSC requirements", "regulatoryReference": "SYSC 4.1" },
      "capitalAdequacy": { "score": 0-10, "detail": "assessment against prudential requirements", "regulatoryReference": "MIFIDPRU/IPRU-INV" },
      "documentationQuality": { "score": 0-10, "detail": "completeness and professional standard", "regulatoryReference": "SUP 6" },
      "operationalReadiness": { "score": 0-10, "detail": "systems, controls, and resource adequacy", "regulatoryReference": "SYSC 6/7" },
      "fitAndProper": { "score": 0-10, "detail": "assessment of key individuals", "regulatoryReference": "FIT 2.1-2.3" }
    },
    "improvements": [
      { "area": "category", "currentScore": 0, "targetScore": 0, "action": "specific steps to improve", "effort": "LOW/MEDIUM/HIGH" }
    ]
  },
  "strategyRecommendation": {
    "recommendedStrategy": "specific submission strategy",
    "reasoning": "legal and commercial rationale",
    "alternatives": ["alternative approaches with trade-offs"],
    "timeline": "realistic timeline with key milestones",
    "confidence": "HIGH/MEDIUM/LOW"
  },
  "issues": [
    {
      "issue": "specific deficiency",
      "severity": "critical" | "warning" | "info",
      "regulatoryReference": "specific provision or requirement",
      "why": "why this matters to the regulator — reference specific assessment criteria",
      "fix": "step-by-step remediation",
      "effort": "LOW/MEDIUM/HIGH",
      "confidence": "HIGH/MEDIUM/LOW"
    }
  ],
  "benchmark": {
    "aml": { "rating": "Below Expectations" | "Meets Minimum" | "Strong" | "Exemplary", "detail": "comparison to typical approved applications", "gap": "what is needed to reach next level" },
    "governance": { "rating": "...", "detail": "...", "gap": "..." },
    "capital": { "rating": "...", "detail": "...", "gap": "..." },
    "documentation": { "rating": "...", "detail": "...", "gap": "..." },
    "technology": { "rating": "...", "detail": "...", "gap": "..." }
  },
  "consistencyChecks": [
    {
      "conflict": "description of inconsistency",
      "sections": ["which sections conflict"],
      "regulatoryRisk": "why this inconsistency could trigger a query",
      "suggestion": "how to resolve"
    }
  ],
  "decisionAdvice": {
    "ready": true | false,
    "summary": "board-level summary of regulatory readiness",
    "missing": ["critical items that must be addressed before submission"],
    "nextSteps": ["ordered, prioritised action list"],
    "estimatedTimeToReady": "realistic estimate",
    "confidence": "HIGH/MEDIUM/LOW",
    "caveats": ["limitations of this assessment"]
  }
}`;

    } else if (action === "make-it-pass") {
      systemPrompt = `${LEGAL_PERSONA}

You are rewriting a regulatory application to meet submission standards. Your revisions must transform the document from its current state to one that would satisfy a regulatory case officer's review. Use precise regulatory language, add substantive compliance content, and address every identified weakness.

${GUARDRAILS}`;

      userPrompt = `Improve this ${licenseType || "fintech licence"} application for ${jurisdiction || "UK"} to meet regulatory submission standards.

Application Data:
${appSummary}

Current Document:
${documentContent || "[No document content provided]"}

Requirements:
1. Rewrite weak sections with specific regulatory language — cite FCA Handbook provisions, relevant statutes, and regulatory guidance.
2. Add missing justifications with evidence references (e.g., "As demonstrated in Appendix B, the firm's capital resources exceed the minimum requirement under MIFIDPRU 4.3.1R by £X").
3. Strengthen AML/CFT sections with specific procedures aligned to MLR 2017 requirements — not generic policy statements.
4. Add proper risk mitigation strategies using the three lines of defence model.
5. Ensure all ${jurisdiction === "US" ? "FinCEN/State MTL" : "FCA Threshold Conditions (Schedule 6 FSMA 2000)"} are addressed.
6. Include cross-references between sections for consistency.
7. Mark any areas requiring firm-specific input as "[FIRM TO COMPLETE — description of what is needed]".

Return the COMPLETE improved document in markdown format. Every section must contain substantive, specific content.`;

    } else {
      throw new Error(`Unknown action: ${action}`);
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
          { role: "system", content: systemPrompt + "\n\n" + DOCUMENT_OUTPUT_RULES },
          { role: "user", content: userPrompt },
        ],
        reasoning: {
          effort: "high",
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regulatory-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
