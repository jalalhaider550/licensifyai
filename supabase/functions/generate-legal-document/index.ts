import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLAUSE_LIBRARY = [
  "Indemnity",
  "Limitation of Liability",
  "Confidentiality",
  "Non-compete",
  "Dispute Resolution",
  "Governing Law",
  "Force Majeure",
  "Termination",
  "Intellectual Property",
  "Data Protection",
];

function detectScenarioRisks(body: any): string[] {
  const risks: string[] = [];
  const allText = [
    body.specialInstructions || "",
    body.specialClauses || "",
    body.scopeOfWork || "",
    body.paymentTerms || "",
    body.terminationClause || "",
    body.generationMode || "",
  ].join(" ").toLowerCase();

  // Payment risk signals
  if (/non[- ]?payment|late payment|default|arrears|overdue|unpaid|deposit|upfront|advance payment/i.test(allText)) {
    risks.push("HIGH_PAYMENT_RISK");
  }
  // Strict / protective signals
  if (/strict|protective|penalty|penalt|enforce|heavy|punitive/i.test(allText) || body.generationMode === "strict") {
    risks.push("STRICT_PROTECTION");
  }
  // Favor party signals
  if (/favor.*party.*a|protect.*party.*a|benefit.*party.*a/i.test(allText) || body.generationMode === "favor_party_a") {
    risks.push("FAVOR_PARTY_A");
  }
  if (/favor.*party.*b|protect.*party.*b|benefit.*party.*b/i.test(allText) || body.generationMode === "favor_party_b") {
    risks.push("FAVOR_PARTY_B");
  }
  // Performance / KPI signals
  if (/kpi|performance|deliverable|milestone|sla|service level/i.test(allText)) {
    risks.push("PERFORMANCE_BASED");
  }
  // IP risk signals
  if (/intellectual property|ip rights|copyright|patent|trade secret/i.test(allText)) {
    risks.push("IP_SENSITIVE");
  }
  // Confidentiality emphasis
  if (/confidential|nda|non[- ]?disclosure|sensitive information/i.test(allText)) {
    risks.push("CONFIDENTIALITY_EMPHASIS");
  }
  // Termination risk
  if (/terminat|cancel|exit|walk away|break clause/i.test(allText)) {
    risks.push("TERMINATION_RISK");
  }

  return risks;
}

function buildScenarioInstructions(risks: string[], partyA: string, partyB: string): string {
  if (risks.length === 0) return "";

  const instructions: string[] = ["\n\nSCENARIO-SPECIFIC INSTRUCTIONS (MANDATORY — adapt the contract to these detected risks):"];

  if (risks.includes("HIGH_PAYMENT_RISK")) {
    instructions.push(`
PAYMENT RISK DETECTED — You MUST include ALL of the following:
- Upfront deposit/advance payment clause (minimum 25-50% before work begins)
- Late payment interest clause (e.g. 2-4% above base rate per month)
- Right to suspend services on non-payment (after 14 days overdue)
- Minimum commitment period with early exit penalties
- Clear payment milestones tied to deliverables
- Right to recover debt collection costs`);
  }

  if (risks.includes("STRICT_PROTECTION")) {
    instructions.push(`
STRICT PROTECTION MODE — You MUST:
- Limit the client's (${partyB}'s) right to terminate without cause
- Require minimum notice period of 90 days for termination
- Include liquidated damages for early termination
- Add penalty clauses for breach (specific monetary amounts or percentages)
- Strengthen payment enforcement with acceleration clauses
- Include personal guarantee provisions where appropriate
- Add KPI/performance measurement clauses with clear benchmarks
- Include audit rights for ${partyA}`);
  }

  if (risks.includes("FAVOR_PARTY_A")) {
    instructions.push(`
FAVOR PARTY A (${partyA}) — Ensure:
- Liability cap applies only to ${partyA}, not ${partyB}
- ${partyA} has broader termination rights
- IP ownership vests in ${partyA}
- Indemnity obligations fall primarily on ${partyB}
- ${partyA} retains right to assign without consent`);
  }

  if (risks.includes("FAVOR_PARTY_B")) {
    instructions.push(`
FAVOR PARTY B (${partyB}) — Ensure:
- Flexible termination for ${partyB} with short notice
- Liability cap applies to ${partyB}
- Payment terms favorable to ${partyB}
- ${partyB} retains more IP rights`);
  }

  if (risks.includes("PERFORMANCE_BASED")) {
    instructions.push(`
PERFORMANCE-BASED CONTRACT — Include:
- Specific KPIs with measurable targets
- Performance review periods (monthly/quarterly)
- Right to terminate for persistent underperformance
- Performance bonus/penalty structure
- SLA with response time commitments`);
  }

  if (risks.includes("IP_SENSITIVE")) {
    instructions.push(`
IP-SENSITIVE CONTRACT — Include:
- Detailed IP ownership and assignment clauses
- Pre-existing IP carve-outs
- License-back provisions
- IP indemnification
- Non-compete and non-solicitation for IP-related work`);
  }

  if (risks.includes("TERMINATION_RISK")) {
    instructions.push(`
TERMINATION RISK DETECTED — Include:
- Graduated termination notice periods
- Termination for cause vs convenience distinction
- Wind-down and transition obligations
- Post-termination survival clauses
- Return of materials and data obligations`);
  }

  return instructions.join("\n");
}

function buildContractPrompt(body: any) {
  const {
    contractType,
    partyA,
    partyB,
    jurisdiction,
    scopeOfWork,
    paymentTerms,
    duration,
    terminationClause,
    specialClauses,
    specialInstructions,
    generationMode,
  } = body;

  const detectedRisks = detectScenarioRisks(body);
  const scenarioInstructions = buildScenarioInstructions(detectedRisks, partyA, partyB);

  let modeInstruction = "";
  switch (generationMode) {
    case "strict":
      modeInstruction = "Draft with very strict, protective clauses. Minimize exposure for both parties. Include heavy penalties for breach.";
      break;
    case "favor_party_a":
      modeInstruction = `Draft clauses that strongly favor ${partyA}. Liability should fall primarily on ${partyB}. Indemnity and IP ownership should benefit ${partyA}.`;
      break;
    case "favor_party_b":
      modeInstruction = `Draft clauses that strongly favor ${partyB}. Liability should fall primarily on ${partyA}. Terms should be flexible for ${partyB}.`;
      break;
    case "balanced":
      modeInstruction = "Draft balanced clauses that protect both parties equally. Use fair and reasonable terms throughout.";
      break;
    default:
      modeInstruction = "Draft standard professional clauses with reasonable protections for both parties.";
  }

  return `You are a senior commercial lawyer (15+ years PQE). Generate a COMPLETE, PROFESSIONAL ${contractType} contract.

CRITICAL: This is NOT a generic template. You must tailor EVERY clause to the specific scenario, parties, and risks described below. Generic boilerplate is unacceptable.

PARTIES:
- Party A: ${partyA}
- Party B: ${partyB}

JURISDICTION: ${jurisdiction}
SCOPE OF WORK: ${scopeOfWork || "To be defined by the parties"}
PAYMENT TERMS: ${paymentTerms || "As agreed between the parties"}
DURATION: ${duration || "12 months from the date of execution"}
${terminationClause ? `TERMINATION: ${terminationClause}` : ""}
${specialClauses ? `SPECIAL CLAUSES TO INCLUDE: ${specialClauses}` : ""}

GENERATION MODE: ${modeInstruction}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ""}
${detectedRisks.length > 0 ? `\nDETECTED RISK PROFILE: ${detectedRisks.join(", ")}` : ""}
${scenarioInstructions}

Return a JSON object with this EXACT structure:
{
  "title": "CONTRACT TITLE",
  "date": "Date string",
  "parties": { "partyA": "${partyA}", "partyB": "${partyB}" },
  "recitals": "WHEREAS clauses as a single string — tailored to the specific business relationship",
  "definitions": [{ "term": "Term", "definition": "Definition text" }],
  "clauses": [
    {
      "number": "1",
      "title": "Clause Title",
      "body": "Full clause text with professional legal language tailored to this scenario",
      "subClauses": [{ "number": "1.1", "body": "Sub-clause text" }]
    }
  ],
  "governingLaw": "Governing law clause text",
  "signatureBlock": "IN WITNESS WHEREOF signature block text",
  "warnings": [
    { "type": "missing_clause" | "risk_imbalance" | "jurisdiction_issue", "message": "Warning text" }
  ]
}

MANDATORY CLAUSES (include ALL): Definitions, Scope of Work/Services, Payment, Duration/Term, Termination, Confidentiality, Intellectual Property, Limitation of Liability, Indemnity, Dispute Resolution, Governing Law, Force Majeure, General Provisions (Notices, Amendments, Severability, Entire Agreement).

Each clause must be FULL professional legal text — not summaries. Use proper legal language and numbered sub-clauses.
Tailor every clause to the specific parties, scope, and risk profile. Do NOT produce generic boilerplate.
After generating, analyze and add warnings for any missing clauses, risk imbalances, or jurisdiction issues.`;
}

function buildNdaPrompt(body: any) {
  const {
    disclosingParty,
    receivingParty,
    jurisdiction,
    purpose,
    duration,
    ndaType,
    specialInstructions,
  } = body;

  const typeInstruction = ndaType === "mutual"
    ? "This is a MUTUAL NDA — both parties are disclosing and receiving confidential information."
    : `This is a ONE-WAY NDA — ${disclosingParty} is the disclosing party and ${receivingParty} is the receiving party.`;

  return `You are a senior commercial lawyer. Generate a COMPLETE, PROFESSIONAL Non-Disclosure Agreement.

${typeInstruction}

DISCLOSING PARTY: ${disclosingParty}
RECEIVING PARTY: ${receivingParty}
JURISDICTION: ${jurisdiction}
PURPOSE: ${purpose || "Business discussions and potential collaboration"}
DURATION: ${duration || "2 years from the date of execution"}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ""}

Return a JSON object with this EXACT structure:
{
  "title": "NON-DISCLOSURE AGREEMENT",
  "date": "Date string",
  "parties": { "disclosingParty": "${disclosingParty}", "receivingParty": "${receivingParty}" },
  "recitals": "WHEREAS clauses",
  "definitions": [{ "term": "Term", "definition": "Definition text" }],
  "clauses": [
    {
      "number": "1",
      "title": "Clause Title",
      "body": "Full clause text",
      "subClauses": [{ "number": "1.1", "body": "Sub-clause text" }]
    }
  ],
  "governingLaw": "Governing law clause text",
  "signatureBlock": "Signature block text",
  "warnings": [
    { "type": "missing_clause" | "risk_imbalance" | "jurisdiction_issue", "message": "Warning text" }
  ]
}

Include clauses for: Definition of Confidential Information, Obligations of Receiving Party, Exclusions from Confidential Information, Term and Termination, Return of Materials, Remedies, No License/Warranty, Governing Law, Dispute Resolution, General Provisions.

Use FULL professional legal language. Each clause must be complete.`;
}

function buildRegenerateClausePrompt(body: any) {
  const { clause, instruction, documentContext } = body;
  return `You are a senior commercial lawyer. Regenerate the following clause based on the instruction.

CURRENT CLAUSE:
Title: ${clause.title}
Number: ${clause.number}
Body: ${clause.body}
${clause.subClauses?.length ? `Sub-clauses: ${JSON.stringify(clause.subClauses)}` : ""}

DOCUMENT CONTEXT: ${documentContext || "Standard commercial agreement"}
INSTRUCTION: ${instruction}

Return a JSON object:
{
  "number": "${clause.number}",
  "title": "Updated title",
  "body": "Full updated clause text with professional legal language",
  "subClauses": [{ "number": "X.X", "body": "Sub-clause text" }]
}

Generate COMPLETE professional legal text. Do not summarize.`;
}

function buildReviewDocumentPrompt(body: any) {
  const { documentText, documentType, improvementMode, userInstruction } = body;

  let modeInstruction = "";
  switch (improvementMode) {
    case "strict":
      modeInstruction = "Make all clauses stricter and more protective. Add heavy penalties for breach.";
      break;
    case "balanced":
      modeInstruction = "Balance all clauses to protect both parties equally.";
      break;
    case "favor_party_a":
      modeInstruction = "Revise clauses to strongly favor the first party mentioned.";
      break;
    case "add_missing":
      modeInstruction = "Focus on adding all missing essential clauses without changing existing ones significantly.";
      break;
    default:
      modeInstruction = "Improve the document professionally while maintaining its intent.";
  }

  return `You are a SENIOR COMMERCIAL LAWYER (15+ years PQE) performing a FULL LEGAL REVIEW — not a summary.

DOCUMENT TYPE: ${documentType || "Legal Agreement"}
IMPROVEMENT MODE: ${modeInstruction}
${userInstruction ? `USER INSTRUCTION: ${userInstruction}` : ""}

ORIGINAL DOCUMENT TEXT:
---
${documentText}
---

CRITICAL: You must perform a COMPLETE clause-by-clause legal analysis like a senior lawyer reviewing a contract for a client. Do NOT just summarize. Analyze EVERY clause.

Return a JSON object with this EXACT structure:
{
  "review": {
    "caseSummary": {
      "parties": { "partyA": "Name and role", "partyB": "Name and role" },
      "documentType": "Type of document identified",
      "jurisdiction": "Jurisdiction identified or inferred",
      "purpose": "Purpose and commercial context of this document"
    },
    "clauseByClauseBreakdown": [
      {
        "clauseName": "e.g. Termination",
        "whatItDoes": "Plain English explanation of the clause",
        "strength": "strong" | "weak" | "moderate",
        "favors": "Party A" | "Party B" | "Neutral",
        "riskLevel": "high" | "medium" | "low",
        "analysis": "Detailed legal analysis of this specific clause — what works, what is problematic, what is missing"
      }
    ],
    "keyIssues": ["Specific legal issues: missing clauses, ambiguities, unbalanced terms, enforcement risks"],
    "applicableLaws": {
      "statutes": ["Relevant statutes and legislation"],
      "caseReferences": [
        {
          "caseName": "e.g. Bolton v Mahadeva",
          "year": "1972",
          "principle": "1-2 line principle established",
          "relevance": "How this case applies to THIS document"
        }
      ]
    },
    "legalAnalysis": {
      "overallStrength": "Assessment of overall document strength",
      "enforceability": "How enforceable is this document",
      "commercialFairness": "Is this commercially fair or one-sided",
      "riskExposure": "Key risk exposures identified"
    },
    "improvements": [
      {
        "clause": "Which clause to fix",
        "currentIssue": "What is wrong",
        "suggestedFix": "Exact specific improvement — not generic"
      }
    ],
    "strengthScore": 1-10,
    "riskLevel": "high" | "medium" | "low",
    "redFlags": ["Dangerous clauses, missing protections, one-sided risks that need immediate attention"],
    "summary": "Executive summary of the review in 2-3 sentences"
  },
  "improvedDocument": {
    "title": "DOCUMENT TITLE",
    "date": "${new Date().toISOString().split("T")[0]}",
    "parties": { "partyA": "First party name", "partyB": "Second party name" },
    "recitals": "WHEREAS clauses",
    "definitions": [{ "term": "Term", "definition": "Definition text" }],
    "clauses": [
      {
        "number": "1",
        "title": "Clause Title",
        "body": "Full clause text with professional legal language",
        "subClauses": [{ "number": "1.1", "body": "Sub-clause text" }]
      }
    ],
    "governingLaw": "Governing law clause text",
    "signatureBlock": "Signature block text",
    "warnings": [
      { "type": "missing_clause" | "risk_imbalance" | "jurisdiction_issue", "message": "Warning text" }
    ]
  }
}

STRICT RULES:
1. clauseByClauseBreakdown MUST analyze EVERY major clause in the document — do NOT skip any
2. For each clause assess: strength, who it favors, risk level, and provide detailed analysis
3. keyIssues must list SPECIFIC legal concerns — not generic statements
4. applicableLaws must include 1-3 REAL case law references with jurisdiction priority: UK first, then US
5. DO NOT hallucinate case law — if unsure, use general legal principles and state clearly
6. improvements must be SPECIFIC — reference exact clauses and provide exact suggested fixes
7. redFlags must highlight genuinely dangerous or one-sided provisions
8. legalAnalysis must cover enforceability, commercial fairness, and risk exposure in detail
9. The improved document must fix ALL identified issues
10. strengthScore: 1 (very weak/dangerous) to 10 (excellent/comprehensive)

FAIL CONDITION: If your output reads like a summary instead of a clause-by-clause legal review, it has FAILED.`;
}

function buildGenerateFromDocumentPrompt(body: any) {
  const { documentText, documentType, userInstruction, targetDocumentType } = body;

  return `You are a senior commercial lawyer. Using the uploaded document as a reference/source, generate a NEW ${targetDocumentType || documentType || "Legal Agreement"}.

USER INSTRUCTION: ${userInstruction || "Improve and restructure this document professionally"}

SOURCE DOCUMENT:
---
${documentText}
---

Extract key details (parties, terms, obligations, jurisdiction) from the source and generate a completely new, professional document.

Return a JSON object with this EXACT structure:
{
  "title": "DOCUMENT TITLE",
  "date": "${new Date().toISOString().split("T")[0]}",
  "parties": { "partyA": "First party name", "partyB": "Second party name" },
  "recitals": "WHEREAS clauses",
  "definitions": [{ "term": "Term", "definition": "Definition text" }],
  "clauses": [
    {
      "number": "1",
      "title": "Clause Title",
      "body": "Full clause text with professional legal language",
      "subClauses": [{ "number": "1.1", "body": "Sub-clause text" }]
    }
  ],
  "governingLaw": "Governing law clause text",
  "signatureBlock": "Signature block text",
  "warnings": [
    { "type": "missing_clause" | "risk_imbalance" | "jurisdiction_issue", "message": "Warning text" }
  ]
}

Each clause must be FULL professional legal text. Apply the user instruction to shape the output.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    let systemPrompt: string;

    switch (action) {
      case "generate-contract":
        systemPrompt = buildContractPrompt(body);
        break;
      case "generate-nda":
        systemPrompt = buildNdaPrompt(body);
        break;
      case "regenerate-clause":
        systemPrompt = buildRegenerateClausePrompt(body);
        break;
      case "review-document":
        systemPrompt = buildReviewDocumentPrompt(body);
        break;
      case "generate-from-document":
        systemPrompt = buildGenerateFromDocumentPrompt(body);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[generate-legal-document] action=${action}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a senior commercial lawyer. Always return valid JSON only. No markdown fences." },
            { role: "user", content: systemPrompt },
          ],
          temperature: 0.3,
          max_tokens: 12000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`[generate-legal-document] AI error: ${aiResponse.status}`, errText);

        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ success: false, error: "AI rate limit exceeded. Please wait a moment and try again.", errorType: "rate_limit" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ success: false, error: "Your AI balance is used up. Please top up to continue.", errorType: "credits_exhausted" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: "AI service temporarily unavailable. Please try again." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[generate-legal-document] No JSON in AI response");
        return new Response(
          JSON.stringify({ success: false, error: "Failed to parse document. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return new Response(
        JSON.stringify({ success: true, document: parsed, clauseLibrary: CLAUSE_LIBRARY }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return new Response(
          JSON.stringify({ success: false, error: "Request timed out. Please try again." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    }
  } catch (err: any) {
    console.error("[generate-legal-document] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
