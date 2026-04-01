import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Required fields per step ── */
const REQUIRED_FIELDS: Record<string, string[]> = {
  client_intake: ["property_address", "client_name"],
  contract_pack: ["property_address", "client_name", "price", "tenure", "client_type"],
  searches: ["property_address", "postcode", "tenure"],
  enquiries: ["property_address", "tenure", "client_type"],
  mortgage: ["mortgage_status", "client_name"],
  report: ["property_address", "client_name", "price", "tenure"],
  exchange: ["property_address", "client_name", "price"],
  completion: ["property_address", "client_name", "price"],
  post_completion: ["property_address", "client_name"],
};

const FIELD_LABELS: Record<string, string> = {
  property_address: "Property address",
  client_name: "Client name",
  price: "Transaction price",
  tenure: "Tenure (freehold/leasehold)",
  client_type: "Client role (buyer/seller)",
  postcode: "Postcode",
  mortgage_status: "Mortgage status",
  other_side_name: "Other party name",
  other_side_firm: "Other party solicitor",
};

interface CaseSchema {
  client: { name: string; email?: string; type: string };
  property: { address: string; postcode: string; tenure: string; category: string; price: number };
  transaction: { type: string; target_date?: string };
  parties: { other_side_name: string; other_side_firm: string; estate_agent: string };
  mortgage: { status: string; lender?: string };
  documents: any[];
  intake_complete: boolean;
}

function buildCaseSchema(body: any): CaseSchema {
  return {
    client: {
      name: body.clientName || "",
      email: body.clientEmail || "",
      type: body.clientType || "buyer",
    },
    property: {
      address: body.propertyAddress || "",
      postcode: body.postcode || "",
      tenure: body.tenure || "freehold",
      category: body.propertyCategory || "residential",
      price: body.price || 0,
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
      status: body.mortgageStatus || "unknown",
      lender: body.lenderName || "",
    },
    documents: body.documents || [],
    intake_complete: body.intakeComplete || false,
  };
}

function validateStep(step: string, caseData: CaseSchema): string[] {
  const required = REQUIRED_FIELDS[step] || [];
  const missing: string[] = [];
  const flat: Record<string, any> = {
    property_address: caseData.property.address,
    client_name: caseData.client.name,
    price: caseData.property.price,
    tenure: caseData.property.tenure,
    client_type: caseData.client.type,
    postcode: caseData.property.postcode,
    mortgage_status: caseData.mortgage.status,
    other_side_name: caseData.parties.other_side_name,
    other_side_firm: caseData.parties.other_side_firm,
  };

  for (const field of required) {
    const val = flat[field];
    if (!val || val === "" || val === 0 || val === "unknown") {
      missing.push(FIELD_LABELS[field] || field);
    }
  }
  return missing;
}

const CONVEYANCING_PERSONA = `You are a senior conveyancing solicitor (England & Wales qualified, 15+ years PQE) specialising in residential and commercial property transactions. You have deep knowledge of:
- Law of Property Act 1925, Land Registration Act 2002
- Standard Conditions of Sale (5th Edition)
- Law Society Conveyancing Protocol
- CML/UK Finance Lender requirements
- SDLT/LTT calculations
- AML/KYC requirements under Money Laundering Regulations 2017
- Leasehold Reform Act 2002, Landlord and Tenant Act 1985/1987`;

const GUARDRAILS = `
MANDATORY:
1. ACCURACY: Never fabricate case law, statute references, or legal principles.
2. STRUCTURED JSON: Return ONLY valid JSON. No markdown, no code fences.
3. UK CONVEYANCING FOCUS: Default to England & Wales law unless stated.
4. ANTI-HALLUCINATION: If uncertain, state "UNCERTAIN" and explain what's missing.
5. PRACTICAL OUTPUT: Every section must be actionable — not generic legal advice.
6. SECTIONS FORMAT: Always return data in "sections" array format for clean rendering.`;

function buildStepPrompt(step: string, caseData: CaseSchema) {
  const ctx = JSON.stringify(caseData, null, 2);

  const stepPrompts: Record<string, { system: string; user: string }> = {
    contract_pack: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are generating a contract pack for a property transaction.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate a complete contract pack analysis. Return JSON:
{
  "sections": [
    { "title": "Contract Summary", "content": "..." },
    { "title": "Title Summary", "content": "Analysis of title position based on tenure and property type..." },
    { "title": "Special Conditions", "content": "Recommended special conditions based on transaction details..." },
    { "title": "Risk Flags", "content": "Identified risks and concerns..." },
    { "title": "Missing Items Checklist", "content": "Documents and information still needed..." },
    { "title": "Recommended Actions", "content": "Next steps for the solicitor..." }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "completeness": 0-100,
  "missingDocuments": ["list of documents needed"],
  "nextAction": "single clear next step"
}`,
    },
    searches: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are analysing and recommending property searches.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate a comprehensive searches analysis. Since we don't have API access to Land Registry or local authority databases, provide AI-simulated analysis based on the property details. Return JSON:
{
  "sections": [
    { "title": "Title Register Summary", "content": "Based on the property details (tenure: ${caseData.property.tenure}, category: ${caseData.property.category}), the likely title position..." },
    { "title": "Recommended Searches", "content": "List each search needed with estimated cost and timeline: Local Authority Search (£150-300, 2-6 weeks), Environmental Search (£40-60, 48hrs), Water & Drainage (£50-70, 48hrs), Chancel Repair (£25, instant)..." },
    { "title": "Risk Assessment", "content": "Potential risks based on property location and type: planning issues, access rights, restrictive covenants, flood risk..." },
    { "title": "Restrictions & Charges", "content": "Likely restrictions or charges based on tenure and property type..." },
    { "title": "Recommendations", "content": "Priority actions and any additional searches recommended..." }
  ],
  "searchesRequired": [
    { "name": "search name", "priority": "essential|recommended|optional", "estimatedCost": "£XX", "timeline": "X days/weeks" }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "nextAction": "single clear next step"
}`,
    },
    enquiries: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are generating pre-contract enquiries (raising enquiries if buyer, responding if seller).\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate enquiries appropriate for this transaction. If buyer: raise enquiries. If seller: anticipate and prepare responses. Return JSON:
{
  "sections": [
    { "title": "Standard Enquiries (TA6/TA7/TA10)", "content": "List key standard form enquiries relevant to this property..." },
    { "title": "Additional Enquiries", "content": "Property-specific additional enquiries based on tenure, type, and any identified risks..." },
    ${caseData.property.tenure === "leasehold" ? '{ "title": "Leasehold Enquiries (LPE1)", "content": "Leasehold-specific enquiries: ground rent, service charges, lease length, management company, Section 20 notices, deed of covenant requirements..." },' : ""}
    { "title": "Risk-Based Enquiries", "content": "Enquiries arising from identified risks or unusual features..." },
    { "title": "Timeline & Deadlines", "content": "Expected response timeline and follow-up actions..." }
  ],
  "enquiryCount": 0,
  "riskLevel": "LOW|MEDIUM|HIGH",
  "nextAction": "single clear next step"
}`,
    },
    mortgage: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are reviewing mortgage requirements and lender compliance.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate mortgage review. Return JSON:
{
  "sections": [
    { "title": "Mortgage Status", "content": "Current mortgage position: ${caseData.mortgage.status}..." },
    { "title": "Lender Requirements", "content": "Standard UK Finance/CML handbook requirements applicable..." },
    { "title": "Certificate of Title", "content": "Requirements for issuing Certificate of Title to lender..." },
    { "title": "Outstanding Items", "content": "Documents and information needed from client/lender..." },
    { "title": "Timeline", "content": "Key mortgage-related deadlines and actions..." }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "nextAction": "single clear next step"
}`,
    },
    report: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are generating a Report on Title for the client.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate a comprehensive Report on Title. Return JSON:
{
  "sections": [
    { "title": "Property Description", "content": "Full property description based on available data..." },
    { "title": "Title Analysis", "content": "Analysis of title position, tenure, and any defects..." },
    { "title": "Search Results Summary", "content": "Summary of searches conducted and key findings..." },
    { "title": "Enquiries Summary", "content": "Summary of pre-contract enquiries and responses..." },
    { "title": "Mortgage Compliance", "content": "Confirmation of lender requirements met..." },
    { "title": "Special Conditions", "content": "Any special conditions in the contract..." },
    { "title": "Risk Summary", "content": "All identified risks with severity ratings..." },
    { "title": "SDLT Calculation", "content": "Stamp Duty Land Tax estimate based on price £${caseData.property.price}..." },
    { "title": "Recommendations", "content": "Final recommendations before exchange..." }
  ],
  "overallRisk": "LOW|MEDIUM|HIGH",
  "readyForExchange": true,
  "blockers": [],
  "nextAction": "single clear next step"
}`,
    },
    exchange: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are preparing for exchange of contracts.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate exchange preparation checklist and guidance. Return JSON:
{
  "sections": [
    { "title": "Pre-Exchange Checklist", "content": "All items that must be confirmed before exchange..." },
    { "title": "Deposit Arrangements", "content": "Deposit amount, source, cleared funds requirements..." },
    { "title": "Exchange Protocol", "content": "Law Society Formula to be used and procedure..." },
    { "title": "Completion Date", "content": "Proposed completion date and considerations..." },
    { "title": "Outstanding Items", "content": "Any remaining items to resolve before exchange..." }
  ],
  "readyForExchange": false,
  "blockers": [],
  "nextAction": "single clear next step"
}`,
    },
    completion: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are preparing for completion.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate completion preparation. Return JSON:
{
  "sections": [
    { "title": "Completion Statement", "content": "Financial summary for completion..." },
    { "title": "Funds Required", "content": "Breakdown of funds needed on completion day..." },
    { "title": "Completion Day Procedure", "content": "Step-by-step completion day actions..." },
    { "title": "Key Undertakings", "content": "Undertakings given/received..." },
    { "title": "Post-Completion Reminders", "content": "Immediate post-completion actions required..." }
  ],
  "totalFunds": 0,
  "nextAction": "single clear next step"
}`,
    },
    post_completion: {
      system: `${CONVEYANCING_PERSONA}\n\nYou are managing post-completion tasks.\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nGenerate post-completion task list. Return JSON:
{
  "sections": [
    { "title": "SDLT Filing", "content": "SDLT return must be filed within 14 days of completion. Amount based on purchase price £${caseData.property.price}..." },
    { "title": "Land Registry Application", "content": "AP1 application with supporting documents. Priority period from search..." },
    { "title": "Lender Obligations", "content": "Documents to send to lender, Certificate of Title, title deeds..." },
    { "title": "Client Correspondence", "content": "Final report to client, key safeguarding documents..." },
    { "title": "File Closure", "content": "Archiving requirements, key dates for future reference..." }
  ],
  "deadlines": [
    { "task": "SDLT Return", "deadline": "14 days from completion", "penalty": "£100 initial + interest" },
    { "task": "Land Registry Application", "deadline": "Priority period (30 working days from OS1 search)", "penalty": "Loss of priority" }
  ],
  "nextAction": "single clear next step"
}`,
    },
  };

  // Default/intake
  if (!stepPrompts[step]) {
    return {
      system: `${CONVEYANCING_PERSONA}\n\n${GUARDRAILS}`,
      user: `Case data:\n${ctx}\n\nProvide an intake analysis for this conveyancing matter. Return JSON:
{
  "sections": [
    { "title": "Case Overview", "content": "Summary of the transaction..." },
    { "title": "Client Information Status", "content": "What we know and what's missing..." },
    { "title": "Initial Risk Assessment", "content": "Early risk indicators..." },
    { "title": "Recommended Next Steps", "content": "Immediate actions required..." }
  ],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "nextAction": "single clear next step"
}`,
    };
  }

  return stepPrompts[step];
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        reasoning: { effort: "high" },
      }),
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "AI credits exhausted. Please top up in Settings → Workspace → Usage." };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI gateway error ${response.status}:`, errText);
      if (retryCount < 1) {
        console.log("Retrying AI call...");
        return callAI(systemPrompt, userPrompt, apiKey, retryCount + 1);
      }
      return null; // will trigger fallback
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown fences if present)
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }

    return JSON.parse(cleaned);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.status === 429 || err.status === 402) throw err;
    console.error("AI call error:", err);
    if (retryCount < 1) {
      console.log("Retrying after error...");
      return callAI(systemPrompt, userPrompt, apiKey, retryCount + 1);
    }
    return null;
  }
}

function buildFallback(step: string): any {
  return {
    sections: [
      { title: "AI Temporarily Unavailable", content: "The AI analysis could not be completed at this time. Please retry. Your case data is saved and no information has been lost." },
      { title: "Standard Next Steps", content: `For the "${step}" stage, please ensure all required documents are uploaded and case details are complete, then retry the AI action.` },
    ],
    riskLevel: "UNKNOWN",
    nextAction: "Retry AI analysis after confirming all required information is present.",
    fallback: true,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = {};
  try {
    body = await req.json();
    console.log("conveyancing-ai INPUT:", JSON.stringify({
      step: body.step,
      caseId: body.caseId,
      hasAddress: !!body.propertyAddress,
    }));

    const step = body.step;
    if (!step) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required 'step' parameter",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build structured case schema
    const caseSchema = buildCaseSchema(body);

    // Validate required fields for this step
    const missingFields = validateStep(step, caseSchema);
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          sections: [
            { title: "Missing Information", content: `The following information is required before AI can process the "${step.replace(/_/g, " ")}" step:\n\n${missingFields.map(f => `• ${f}`).join("\n")}\n\nPlease update the case details and try again.` },
            { title: "How to Fix", content: "Go back to the case creation or client intake form and provide the missing fields. You can also update case details from the case info strip above." },
          ],
          riskLevel: "BLOCKED",
          nextAction: `Add missing information: ${missingFields.join(", ")}`,
          validationFailed: true,
          missingFields,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({
        success: true,
        data: buildFallback(step),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build prompts and call AI
    const { system, user } = buildStepPrompt(step, caseSchema);
    const result = await callAI(system, user, LOVABLE_API_KEY);

    if (!result) {
      return new Response(JSON.stringify({
        success: true,
        data: buildFallback(step),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure sections format
    if (!result.sections || !Array.isArray(result.sections)) {
      result.sections = [{ title: "Analysis", content: JSON.stringify(result, null, 2) }];
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("conveyancing-ai error:", err);

    // Handle rate limit / payment errors
    if (err.status === 429 || err.status === 402) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message,
      }), { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      data: buildFallback(body?.step || "unknown"),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
