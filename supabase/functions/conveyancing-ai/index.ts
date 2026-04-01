import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
9. Output must be clean, final, and ready to send to a client or opposing party.`;

/* ── Minimum fields – AI proceeds anyway but flags missing ── */
const MINIMUM_FIELDS = ["property_address", "client_name"];

const FIELD_LABELS: Record<string, string> = {
  property_address: "Property address",
  client_name: "Client name",
  price: "Transaction price",
  tenure: "Tenure (freehold/leasehold)",
  client_type: "Client role (buyer/seller)",
  postcode: "Postcode",
  mortgage_status: "Mortgage status",
};

interface CaseSchema {
  client: { name: string; email?: string; phone?: string; type: string };
  property: { address: string; postcode: string; tenure: string; category: string; price: number; vacant?: boolean };
  transaction: { type: string; target_date?: string };
  parties: { other_side_name: string; other_side_firm: string; estate_agent: string };
  mortgage: { status: string; lender?: string; broker?: string };
  financial: { source_of_funds: string; source_of_wealth: string };
  documents: any[];
  intake_complete: boolean;
  ta6: {
    disputes: string; planning_works: string; guarantees: string;
    boundaries: string; rights_of_way: string; notices: string; services: string;
  };
  ta10: { included_items: string; excluded_items: string; additional_items: string };
  special_instructions: string;
}

function buildCaseSchema(body: any, intakeData?: any): CaseSchema {
  const i = intakeData || {};
  return {
    client: {
      name: i.full_name || body.clientName || "",
      email: i.email || body.clientEmail || "",
      phone: i.phone || "",
      type: i.client_role || body.clientType || "buyer",
    },
    property: {
      address: i.property_address || body.propertyAddress || "",
      postcode: i.property_postcode || body.postcode || "",
      tenure: i.tenure || body.tenure || "freehold",
      category: i.property_type || body.propertyCategory || "residential",
      price: i.transaction_price || body.price || 0,
      vacant: i.property_vacant,
    },
    transaction: {
      type: body.transactionType || "purchase",
      target_date: body.targetCompletionDate || undefined,
    },
    parties: {
      other_side_name: body.otherSideName || "",
      other_side_firm: body.otherSideFirm || "",
      estate_agent: body.estateAgent || "",
    },
    mortgage: {
      status: i.has_mortgage ? "yes" : (body.mortgageStatus || "unknown"),
      lender: i.lender_name || body.lenderName || "",
      broker: i.mortgage_broker || "",
    },
    financial: {
      source_of_funds: i.source_of_funds || "",
      source_of_wealth: i.source_of_wealth || "",
    },
    documents: body.documents || [],
    intake_complete: i.intake_complete || body.intakeComplete || false,
    ta6: {
      disputes: i.ta6_disputes || "",
      planning_works: i.ta6_planning_works || "",
      guarantees: i.ta6_guarantees || "",
      boundaries: i.ta6_boundaries || "",
      rights_of_way: i.ta6_rights_of_way || "",
      notices: i.ta6_notices || "",
      services: i.ta6_services || "",
    },
    ta10: {
      included_items: i.ta10_included_items || "",
      excluded_items: i.ta10_excluded_items || "",
      additional_items: i.ta10_additional_items || "",
    },
    special_instructions: i.special_instructions || "",
  };
}

function findMissingFields(caseData: CaseSchema): string[] {
  const flat: Record<string, any> = {
    property_address: caseData.property.address,
    client_name: caseData.client.name,
    price: caseData.property.price,
    tenure: caseData.property.tenure,
    client_type: caseData.client.type,
    postcode: caseData.property.postcode,
    mortgage_status: caseData.mortgage.status,
  };
  const missing: string[] = [];
  for (const [key, val] of Object.entries(flat)) {
    if (!val || val === "" || val === 0 || val === "unknown") {
      missing.push(FIELD_LABELS[key] || key);
    }
  }
  return missing;
}

const CONVEYANCING_PERSONA = `You are a senior conveyancing solicitor (England & Wales qualified, 15+ years PQE). You have deep knowledge of the Law of Property Act 1925, Land Registration Act 2002, Standard Conditions of Sale (5th Edition), Law Society Conveyancing Protocol, CML/UK Finance Lender requirements, SDLT/LTT calculations, AML/KYC requirements, and Leasehold Reform Act 2002.

CRITICAL BEHAVIOUR:
- ALWAYS proceed with available data. Never refuse to generate output.
- If information is missing, make REASONABLE ASSUMPTIONS based on standard conveyancing practice.
- CLEARLY FLAG all assumptions with [ASSUMPTION] prefix.
- If mortgage status is unknown, assume cash purchase and flag it.
- If tenure is unknown, assume freehold and flag it.
- Generate ACTIONABLE output even with partial data.`;

const GUARDRAILS = `
MANDATORY:
1. Return ONLY valid JSON. No markdown, no code fences.
2. UK conveyancing focus (England & Wales).
3. If uncertain, state "UNCERTAIN" and explain.
4. Every section must be actionable.
5. Always return "sections" array format.
6. Include TA6/TA10 analysis when data is available.
7. Flag missing items clearly but NEVER block output generation.`;

function buildStepPrompt(step: string, caseData: CaseSchema) {
  const ctx = JSON.stringify(caseData, null, 2);
  const missingFields = findMissingFields(caseData);
  const missingNote = missingFields.length > 0
    ? `\n\nNOTE: The following fields are missing or unknown: ${missingFields.join(", ")}. Proceed with reasonable assumptions and flag them clearly.`
    : "";

  const ta6Summary = Object.entries(caseData.ta6).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  const ta10Summary = Object.entries(caseData.ta10).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  const formsContext = (ta6Summary || ta10Summary) ? `\n\nTA6 (Property Information):\n${ta6Summary || "Not provided"}\n\nTA10 (Fixtures & Contents):\n${ta10Summary || "Not provided"}` : "";

  const baseUser = `Case data:\n${ctx}${formsContext}${missingNote}`;

  const stepPrompts: Record<string, { system: string; user: string }> = {
    client_intake: {
      system: `${CONVEYANCING_PERSONA}\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nProvide intake analysis. Assess completeness, identify risks from TA6/TA10 if available, and recommend next steps. Return JSON:
{
  "sections": [
    { "title": "Case Overview", "content": "..." },
    { "title": "Client Information Status", "content": "What we know and what's missing..." },
    { "title": "TA6 Insights", "content": "Analysis of property information form responses..." },
    { "title": "TA10 Insights", "content": "Analysis of fixtures & contents..." },
    { "title": "AML/KYC Status", "content": "Source of funds and wealth assessment..." },
    { "title": "Initial Risk Assessment", "content": "..." },
    { "title": "Missing Items", "content": "..." },
    { "title": "Recommended Next Steps", "content": "..." }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "completeness": 0-100,
  "assumptions": ["list of assumptions made"],
  "nextAction": "single clear next step"
}`,
    },
    contract_pack: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are generating a contract pack.\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nGenerate a complete contract pack analysis. Include TA6/TA10 summaries if available. Return JSON:
{
  "sections": [
    { "title": "Contract Summary", "content": "..." },
    { "title": "Title Summary", "content": "..." },
    { "title": "TA6 Summary", "content": "Summary of property information form — disputes, works, boundaries, services..." },
    { "title": "TA10 Summary", "content": "Summary of fixtures & contents — included, excluded, negotiable items..." },
    { "title": "Special Conditions", "content": "..." },
    { "title": "Risk Flags", "content": "..." },
    { "title": "Missing Items Checklist", "content": "..." },
    { "title": "Recommended Actions", "content": "..." }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "completeness": 0-100,
  "assumptions": [],
  "missingDocuments": [],
  "nextAction": "..."
}`,
    },
    searches: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are analysing property searches.\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nGenerate searches analysis. Simulate title register findings based on available data. Return JSON:
{
  "sections": [
    { "title": "Title Register Summary", "content": "Simulated title analysis based on property details..." },
    { "title": "Recommended Searches", "content": "Each search with cost and timeline..." },
    { "title": "Risk Assessment", "content": "Risks from TA6 data, property type, location..." },
    { "title": "Restrictions & Charges", "content": "Likely restrictions based on tenure..." },
    { "title": "Recommendations", "content": "..." }
  ],
  "searchesRequired": [
    { "name": "Local Authority Search", "priority": "essential", "estimatedCost": "£150-300", "timeline": "2-6 weeks" },
    { "name": "Environmental Search", "priority": "essential", "estimatedCost": "£40-60", "timeline": "48 hours" },
    { "name": "Water & Drainage", "priority": "essential", "estimatedCost": "£50-70", "timeline": "48 hours" },
    { "name": "Chancel Repair", "priority": "recommended", "estimatedCost": "£25", "timeline": "instant" }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "assumptions": [],
  "nextAction": "..."
}`,
    },
    enquiries: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are generating pre-contract enquiries based on TA6/TA10 responses and identified risks.\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nGenerate enquiries. If TA6 mentions disputes → raise enquiry. If planning works mentioned → raise enquiry. If rights of way → raise enquiry. Return JSON:
{
  "sections": [
    { "title": "Standard Enquiries (TA6/TA7/TA10)", "content": "..." },
    { "title": "TA6-Driven Enquiries", "content": "Enquiries raised from property information form responses..." },
    { "title": "Additional Enquiries", "content": "..." },
    ${caseData.property.tenure === "leasehold" ? '{ "title": "Leasehold Enquiries (LPE1)", "content": "..." },' : ""}
    { "title": "Risk-Based Enquiries", "content": "..." },
    { "title": "Timeline & Deadlines", "content": "..." }
  ],
  "enquiryCount": 0,
  "riskLevel": "LOW|MEDIUM|HIGH",
  "assumptions": [],
  "nextAction": "..."
}`,
    },
    mortgage: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are reviewing mortgage requirements.\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nGenerate mortgage review. If mortgage unknown, assume cash purchase and flag. Return JSON:
{
  "sections": [
    { "title": "Mortgage Status", "content": "..." },
    { "title": "Lender Requirements", "content": "..." },
    { "title": "Certificate of Title", "content": "..." },
    { "title": "Outstanding Items", "content": "..." },
    { "title": "Timeline", "content": "..." }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "assumptions": [],
  "nextAction": "..."
}`,
    },
    report: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are generating a Report on Title.\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nGenerate Report on Title. Return JSON:
{
  "sections": [
    { "title": "Property Description", "content": "..." },
    { "title": "Title Analysis", "content": "..." },
    { "title": "Search Results Summary", "content": "..." },
    { "title": "Enquiries Summary", "content": "..." },
    { "title": "TA6/TA10 Summary", "content": "Key points from property information and fixtures forms..." },
    { "title": "Mortgage Compliance", "content": "..." },
    { "title": "Special Conditions", "content": "..." },
    { "title": "Risk Summary", "content": "..." },
    { "title": "SDLT Calculation", "content": "Based on £${caseData.property.price}..." },
    { "title": "Recommendations", "content": "..." }
  ],
  "overallRisk": "LOW|MEDIUM|HIGH",
  "readyForExchange": true,
  "assumptions": [],
  "nextAction": "..."
}`,
    },
    exchange: {
      system: `${CONVEYANCING_PERSONA}\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nPrepare exchange checklist. Return JSON:
{
  "sections": [
    { "title": "Pre-Exchange Checklist", "content": "..." },
    { "title": "Deposit Arrangements", "content": "..." },
    { "title": "Exchange Protocol", "content": "..." },
    { "title": "Completion Date", "content": "..." },
    { "title": "Outstanding Items", "content": "..." }
  ],
  "readyForExchange": false,
  "blockers": [],
  "assumptions": [],
  "nextAction": "..."
}`,
    },
    completion: {
      system: `${CONVEYANCING_PERSONA}\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nPrepare completion. Return JSON:
{
  "sections": [
    { "title": "Completion Statement", "content": "..." },
    { "title": "Funds Required", "content": "..." },
    { "title": "Completion Day Procedure", "content": "..." },
    { "title": "Key Undertakings", "content": "..." },
    { "title": "Post-Completion Reminders", "content": "..." }
  ],
  "assumptions": [],
  "nextAction": "..."
}`,
    },
    post_completion: {
      system: `${CONVEYANCING_PERSONA}\n\n${GUARDRAILS}`,
      user: `${baseUser}\n\nGenerate post-completion tasks. Return JSON:
{
  "sections": [
    { "title": "SDLT Filing", "content": "..." },
    { "title": "Land Registry Application", "content": "..." },
    { "title": "Lender Obligations", "content": "..." },
    { "title": "Client Correspondence", "content": "..." },
    { "title": "File Closure", "content": "..." }
  ],
  "deadlines": [
    { "task": "SDLT Return", "deadline": "14 days from completion", "penalty": "£100 initial + interest" },
    { "task": "Land Registry Application", "deadline": "Priority period (30 working days)", "penalty": "Loss of priority" }
  ],
  "assumptions": [],
  "nextAction": "..."
}`,
    },
  };

  return stepPrompts[step] || stepPrompts.client_intake;
}

async function callAI(systemPrompt: string, userPrompt: string, apiKey: string, retryCount = 0): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + "\n\n" + DOCUMENT_OUTPUT_RULES },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(timeout);

    if (response.status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
    if (response.status === 402) throw { status: 402, message: "AI credits exhausted. Please top up in Settings → Workspace → Usage." };

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI gateway error ${response.status}:`, errText);
      if (retryCount < 1) return callAI(systemPrompt, userPrompt, apiKey, retryCount + 1);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }

    // Try balanced brace extraction if direct parse fails
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      if (start >= 0) {
        let depth = 0;
        let end = start;
        for (let i = start; i < cleaned.length; i++) {
          if (cleaned[i] === "{") depth++;
          if (cleaned[i] === "}") depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        const jsonStr = cleaned.substring(start, end).replace(/[\x00-\x1f]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");
        return JSON.parse(jsonStr);
      }
      return null;
    }
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.status === 429 || err.status === 402) throw err;
    console.error("AI call error:", err);
    if (retryCount < 1) return callAI(systemPrompt, userPrompt, apiKey, retryCount + 1);
    return null;
  }
}

function buildFallback(step: string): any {
  return {
    sections: [
      { title: "AI Temporarily Unavailable", content: "The AI analysis could not be completed at this time. Please retry. Your case data is saved." },
      { title: "Standard Next Steps", content: `For the "${step}" stage, ensure all required documents are uploaded and case details are complete, then retry.` },
    ],
    riskLevel: "UNKNOWN",
    nextAction: "Retry AI analysis.",
    fallback: true,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try {
    body = await req.json();
    console.log("conveyancing-ai INPUT:", JSON.stringify({ step: body.step, caseId: body.caseId }));

    const step = body.step;
    if (!step) {
      return new Response(JSON.stringify({ success: false, error: "Missing 'step' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch intake data from DB for enriched context
    let intakeData: any = null;
    if (body.caseId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);
        const { data } = await sb.from("conveyancing_client_intake").select("*").eq("case_id", body.caseId).maybeSingle();
        intakeData = data;
      } catch (e) {
        console.error("Failed to fetch intake data:", e);
      }
    }

    const caseSchema = buildCaseSchema(body, intakeData);

    // Check absolute minimum — only block if no address AND no name
    const hasAddress = !!caseSchema.property.address;
    const hasName = !!caseSchema.client.name;
    if (!hasAddress && !hasName) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          sections: [
            { title: "Insufficient Data", content: "At minimum, a client name or property address is needed to proceed. Please add basic case details." },
          ],
          riskLevel: "BLOCKED",
          nextAction: "Add client name and property address to the case.",
          validationFailed: true,
          missingFields: ["Client name", "Property address"],
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: true, data: buildFallback(step) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { system, user } = buildStepPrompt(step, caseSchema);
    const result = await callAI(system, user, LOVABLE_API_KEY);

    if (!result) {
      return new Response(JSON.stringify({ success: true, data: buildFallback(step) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!result.sections || !Array.isArray(result.sections)) {
      result.sections = [{ title: "Analysis", content: typeof result === "string" ? result : JSON.stringify(result) }];
    }

    // Add missing-fields info as a section if applicable
    const missing = findMissingFields(caseSchema);
    if (missing.length > 0 && !result.sections.find((s: any) => s.title === "Missing Items")) {
      result.sections.push({
        title: "Missing Items",
        content: `The following information was not available and assumptions were made:\n\n${missing.map(f => `• ${f}`).join("\n")}\n\nPlease update case details for more accurate analysis.`,
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("conveyancing-ai error:", err);
    if (err.status === 429 || err.status === 402) {
      return new Response(JSON.stringify({ success: false, error: err.message }),
        { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true, data: buildFallback(body?.step || "unknown") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
