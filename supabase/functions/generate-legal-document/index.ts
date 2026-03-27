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

  return `You are a senior commercial lawyer. Generate a COMPLETE, PROFESSIONAL ${contractType} contract.

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

Return a JSON object with this EXACT structure:
{
  "title": "CONTRACT TITLE",
  "date": "Date string",
  "parties": { "partyA": "${partyA}", "partyB": "${partyB}" },
  "recitals": "WHEREAS clauses as a single string",
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
  "signatureBlock": "IN WITNESS WHEREOF signature block text",
  "warnings": [
    { "type": "missing_clause" | "risk_imbalance" | "jurisdiction_issue", "message": "Warning text" }
  ]
}

MANDATORY CLAUSES (include ALL): Definitions, Scope of Work/Services, Payment, Duration/Term, Termination, Confidentiality, Intellectual Property, Limitation of Liability, Indemnity, Dispute Resolution, Governing Law, Force Majeure, General Provisions (Notices, Amendments, Severability, Entire Agreement).

Each clause must be FULL professional legal text — not summaries. Use proper legal language and numbered sub-clauses.
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
      const aiResponse = await fetch("https://ai-gateway.lovable.dev/api/chat/completions", {
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
