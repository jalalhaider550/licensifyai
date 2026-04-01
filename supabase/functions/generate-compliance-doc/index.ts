import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEGAL_PERSONA = `You are a practising senior regulatory solicitor (England & Wales qualified, 15+ years PQE) specialising in fintech licensing, financial services regulation, and compliance. Your documents have been used in successful FCA and FinCEN submissions. You write with the authority and precision of a lawyer who knows the regulator will read every word. You do not hedge — you state what is required, draft what is needed, and advise on what will work.`;

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
    - NEVER use markdown symbols in headings — no ###, ##, #, no ** asterisks, no HTML tags like bold or italic tags.
    - ALL headings must be plain numbered text, rendered bold by the application automatically.
    - Correct format: 1. Background    2. Legal Position    3. Demand    4. Next Steps
    - Maintain consistent sequential numbering throughout the entire document.
    - Sub-sections use decimal numbering: 1.1, 1.2, 2.1, etc.
    - Output ONLY the number, period, and heading text — nothing else.
    - NEVER mix heading styles — every heading in the document must follow this format.`;

const GUARDRAILS = `
MANDATORY RULES — FOLLOW WITHOUT EXCEPTION:
1. ACCURACY: Every regulatory reference must be correct and verifiable. Cite specific FCA Handbook provisions (e.g., SYSC 6.1.1R, SUP 10A), relevant statutes (e.g., FSMA 2000, MLR 2017), or US equivalents.
2. NO FABRICATION: Never invent regulatory requirements. If a requirement is jurisdiction-dependent, state which regime applies and proceed.
3. JURISDICTION: Always specify the applicable regulatory framework. Do not conflate UK and US requirements.
4. PROFESSIONAL STANDARD: Documents must be suitable for direct submission to regulators or review by senior counsel. Write as if the regulator is reading.
5. COMPLETENESS: Every section must contain substantive content. Where company data is missing, make reasonable assumptions and mark specific items as requiring confirmation — not a disclaimer.
6. CONSISTENCY: Maintain consistent terminology, defined terms, and cross-references throughout.
7. NO HEDGING: Do not add unnecessary qualifications. State the regulatory position with authority.
8. STRUCTURED OUTPUT: Follow the exact output format specified.`;

const buildClientSummary = (client: any, directors: any[], shareholders: any[]) => `
Company: ${client.company_name}
Jurisdiction: ${client.jurisdiction}
Registration Number: ${client.registration_number || "[Not provided]"}
Registered Address: ${client.registered_address || "[Not provided]"}
Services: ${client.services?.join(", ") || "[Not specified]"}
Contact Email: ${client.contact_email || "[Not provided]"}
Contact Phone: ${client.contact_phone || "[Not provided]"}
Incorporation Date: ${client.incorporation_date || "[Not provided]"}

Directors:
${directors.length > 0 ? directors.map((d: any) => `- ${d.full_name} (${d.role || "Director"})`).join("\n") : "[No directors recorded — this is a critical gap for regulatory submissions]"}

Shareholders:
${shareholders.length > 0 ? shareholders.map((s: any) => `- ${s.name} (${s.percentage}%)`).join("\n") : "[No shareholders recorded — ownership structure must be disclosed]"}
`.trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "extract-form-fields") {
      const { documentText, clientName, licenseType } = body;

      systemPrompt = `${LEGAL_PERSONA}

You are extracting structured data from a business document to populate a regulatory licensing application form. Your extraction must be thorough and legally precise.

${GUARDRAILS}

Return ONLY valid JSON with the specified fields. Use null for fields not found in the document.`;

      userPrompt = `Extract ALL relevant information from this document for a ${licenseType || "fintech license"} application for ${clientName || "the company"}.

Document text:
${documentText}

Return a JSON object with these fields (use null if not found, never invent data):
- company_name: string
- registration_number: string
- address: string
- website: string
- contact_email: string
- services: array of strings (be specific about regulated activities)
- target_customers: string
- markets: string
- revenue_model: string
- capital_amount: string (specify currency)
- source_of_funds: string
- expected_volume: string (specify currency and period)
- compliance_officer: string
- aml_program: string (summarise key AML/CFT measures identified)
- risk_management: string
- directors: array of {name, nationality, role}
- shareholders: array of {name, percentage, country}
- extraction_confidence: "HIGH/MEDIUM/LOW"
- missing_critical_fields: ["list of fields not found that are mandatory for regulatory submission"]

Return ONLY valid JSON.`;

    } else if (action === "extract-business-model") {
      const { documentText, clientName } = body;

      systemPrompt = `${LEGAL_PERSONA}

You are analysing a business model document to extract structured information relevant to regulatory licensing applications.

${GUARDRAILS}`;

      userPrompt = `Extract structured business model information from this document for ${clientName || "the company"}.

Document text:
${documentText}

Return JSON:
{
  "services_offered": ["specific regulated and unregulated activities"],
  "revenue_model": "detailed description",
  "target_customers": "customer segments with regulatory implications",
  "technology_platform": "technical infrastructure description",
  "operational_structure": "staffing, outsourcing, governance",
  "compliance_considerations": "identified regulatory touchpoints and requirements",
  "company_overview": "professional summary suitable for regulatory submission",
  "regulatory_activities": ["specific activities requiring authorisation"],
  "risk_factors": ["identified risks from a regulatory perspective"],
  "extraction_confidence": "HIGH/MEDIUM/LOW",
  "gaps_identified": ["information gaps that would need to be addressed for licensing"]
}`;

    } else if (action === "generate-business-plan") {
      const { client, directors, shareholders, extractedData, licenseType, currency } = body;
      const clientSummary = buildClientSummary(client, directors || [], shareholders || []);

      systemPrompt = `${LEGAL_PERSONA}

You are drafting a regulatory business plan for submission to ${client.jurisdiction === "US" ? "FinCEN and/or relevant state regulators" : "the Financial Conduct Authority (FCA)"}. This document must meet the standards expected in actual regulatory applications. It must be comprehensive, commercially credible, and demonstrate the applicant's fitness and propriety.

${GUARDRAILS}

BUSINESS PLAN RULES:
- Reference specific regulatory requirements (e.g., FCA Threshold Conditions under Schedule 6 FSMA 2000, FCA's approach to authorisation).
- Include realistic financial projections using ${currency || "GBP"}.
- AML/CFT sections must reference the Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017 (MLR 2017) for UK, or BSA/AML requirements for US.
- Governance sections must demonstrate adequate arrangements under SYSC (Senior Management Arrangements, Systems and Controls).
- Where data is insufficient, clearly mark with "[TO BE COMPLETED — description of what is needed]".`;

      userPrompt = `Generate a comprehensive regulatory business plan for submission using the following company data:

${clientSummary}

Extracted Business Model Data:
${extractedData ? JSON.stringify(extractedData, null, 2) : "[No extracted data — document will require significant input from the applicant]"}

License Type: ${licenseType || "[Not specified]"}
Currency: ${currency || "GBP"}

The business plan MUST include ALL sections with SUBSTANTIVE content (not placeholders):

1. Executive Summary — concise overview of the business, regulatory permissions sought, and key differentiators
2. Company Overview — legal structure, incorporation details, corporate history
3. Products and Services — detailed description of each service, specifying which are regulated activities
4. Business Model — revenue streams, pricing, unit economics, scalability
5. Market Opportunity — target market analysis, competitive landscape, addressable market
6. Technology Infrastructure — platform architecture, security measures, data protection (GDPR compliance)
7. Compliance and Regulatory Strategy — specific FCA/regulatory requirements addressed, Threshold Conditions analysis
8. AML and Financial Crime Controls — KYC/CDD procedures, transaction monitoring, SAR reporting, staff training (reference MLR 2017)
9. Operational Structure — governance framework, key personnel, outsourcing arrangements, SYSC compliance
10. Risk Management Framework — risk appetite statement, key risk categories, mitigation strategies, three lines of defence
11. Growth Strategy — phased expansion plan, regulatory implications of growth
12. Financial Projections — 3-year projections in ${currency || "GBP"}, capital adequacy, prudential requirements

Each section should be 3-5 substantive paragraphs. Write in markdown format. The document must read as a polished, submission-ready regulatory document.`;

    } else if (action === "generate-license-template") {
      const { client, directors, shareholders, extractedData, licenseType, currency } = body;
      const clientSummary = buildClientSummary(client, directors || [], shareholders || []);

      systemPrompt = `${LEGAL_PERSONA}

You generate structured license application preparation templates as JSON. Every field must be populated from available data or marked "[TO BE PROVIDED]" with a note explaining what is needed. Use ${currency || "GBP"} for all financial figures.

${GUARDRAILS}`;

      userPrompt = `Generate a comprehensive license application preparation template for a ${licenseType || "fintech license"} using this data:

${clientSummary}

Additional Data:
${extractedData ? JSON.stringify(extractedData, null, 2) : "[No additional data]"}

Return a JSON object with sections and fields as previously specified. Include ALL directors and shareholders as separate fields. Populate every field from available data. Where data is missing, use "[TO BE PROVIDED — explanation of what is needed and why]". Return ONLY JSON.

{
  "sections": [
    {
      "title": "Company Information",
      "fields": [
        { "label": "Legal Entity Name", "value": "..." },
        { "label": "Registration Number", "value": "..." },
        { "label": "Registered Address", "value": "..." },
        { "label": "Website", "value": "..." },
        { "label": "Contact Email", "value": "..." },
        { "label": "Jurisdiction", "value": "..." },
        { "label": "License Type Applied For", "value": "..." },
        { "label": "Regulatory Authority", "value": "..." }
      ]
    },
    {
      "title": "Business Activities",
      "fields": [
        { "label": "Regulated Activities", "value": "..." },
        { "label": "Services Offered", "value": "..." },
        { "label": "Target Customers", "value": "..." },
        { "label": "Markets Served", "value": "..." },
        { "label": "Revenue Model", "value": "..." }
      ]
    },
    {
      "title": "Directors and Management",
      "fields": []
    },
    {
      "title": "Shareholders and Ownership Structure",
      "fields": []
    },
    {
      "title": "Financial Information",
      "fields": [
        { "label": "Initial Capital (${currency || "GBP"})", "value": "..." },
        { "label": "Source of Funds", "value": "..." },
        { "label": "Expected Monthly Transaction Volume (${currency || "GBP"})", "value": "..." },
        { "label": "Projected Annual Revenue (${currency || "GBP"})", "value": "..." }
      ]
    },
    {
      "title": "Compliance and AML Program",
      "fields": [
        { "label": "Nominated MLRO", "value": "..." },
        { "label": "KYC/CDD Procedures (reference MLR 2017)", "value": "..." },
        { "label": "Transaction Monitoring System", "value": "..." },
        { "label": "SAR Reporting Process", "value": "..." },
        { "label": "Staff Training Program", "value": "..." }
      ]
    },
    {
      "title": "Risk Management Framework",
      "fields": [
        { "label": "Risk Assessment Methodology", "value": "..." },
        { "label": "Key Risks Identified", "value": "..." },
        { "label": "Mitigation Strategies", "value": "..." },
        { "label": "Ongoing Monitoring", "value": "..." }
      ]
    },
    {
      "title": "Technology Infrastructure",
      "fields": [
        { "label": "Core Technology Platform", "value": "..." },
        { "label": "Data Security Measures", "value": "..." },
        { "label": "GDPR Compliance Measures", "value": "..." },
        { "label": "Business Continuity Plan", "value": "..." }
      ]
    },
    {
      "title": "Safeguarding Arrangements",
      "fields": [
        { "label": "Safeguarding Method", "value": "..." },
        { "label": "Safeguarding Bank", "value": "..." },
        { "label": "Reconciliation Frequency", "value": "..." }
      ]
    },
    {
      "title": "Operational Structure",
      "fields": [
        { "label": "Number of Staff", "value": "..." },
        { "label": "Outsourced Functions", "value": "..." },
        { "label": "Governance Structure", "value": "..." },
        { "label": "Internal Controls", "value": "..." }
      ]
    }
  ],
  "completeness_assessment": {
    "score": "0-100",
    "critical_gaps": ["list of fields that MUST be completed before submission"],
    "confidence": "HIGH/MEDIUM/LOW"
  }
}`;

    } else if (action === "generate-legal-draft") {
      const { actionType, draftType, caseType, caseSummary, keyFacts, parties, jurisdiction, documents, previousActions } = body;

      const contextBlock = `
Draft type: ${draftType || "formal legal document"}
Case type: ${caseType || "general_legal"}
Jurisdiction: ${jurisdiction || "England & Wales"}
Parties: ${JSON.stringify(parties || [], null, 2)}
Case summary: ${caseSummary || "[No summary available]"}
Key facts: ${JSON.stringify(keyFacts || [], null, 2)}
Documents on file: ${JSON.stringify(documents || [], null, 2)}
Previous actions: ${JSON.stringify(previousActions || [], null, 2)}
`.trim();

      systemPrompt = `${LEGAL_PERSONA}

You are drafting professional legal work product for a qualified solicitor's review. The output must be of a standard suitable for dispatch to clients or opposing parties after review. Use formal legal drafting conventions appropriate to ${jurisdiction || "England & Wales"}.

${GUARDRAILS}

DRAFTING RULES:
- Use defined terms consistently (capitalised, introduced on first use).
- For UK correspondence: use "Dear Sirs" / "Yours faithfully" conventions where appropriate.
- Reference specific legal provisions where applicable.
- Structure documents with clear numbered paragraphs.
- Include a professional sign-off block.`;

      if (actionType === "review_matter") {
        userPrompt = `Prepare a legal review memorandum for senior partner review.

${contextBlock}

Structure the memorandum using IRAC methodology. Return JSON:
{
  "kind": "review",
  "title": "professional memorandum title",
  "overview": "executive summary (2-3 sentences)",
  "keyIssues": [
    {
      "issue": "identified legal issue",
      "rule": "applicable law/statute/principle",
      "analysis": "application of law to facts",
      "conclusion": "preliminary conclusion with confidence level"
    }
  ],
  "legalRisks": [
    { "risk": "description", "likelihood": "HIGH/MEDIUM/LOW", "impact": "description", "mitigation": "recommended action" }
  ],
  "recommendations": ["specific, actionable recommendation"],
  "confidence": "HIGH/MEDIUM/LOW",
  "caveats": ["limitation of this analysis"],
  "furtherInvestigation": ["what additional work is needed"]
}`;
      } else if (actionType === "generate_strategy") {
        userPrompt = `Prepare a litigation/matter strategy memorandum.

${contextBlock}

Return JSON:
{
  "kind": "strategy",
  "title": "strategy memorandum title",
  "strategicObjective": "overarching goal",
  "bestCourse": [
    { "step": "recommended action", "reasoning": "legal basis and tactical rationale", "timeline": "when to execute" }
  ],
  "risks": [
    { "risk": "description", "likelihood": "HIGH/MEDIUM/LOW", "mitigation": "how to manage" }
  ],
  "alternatives": [
    { "option": "alternative approach", "pros": ["advantage"], "cons": ["disadvantage"] }
  ],
  "immediateNextMoves": ["prioritised action items for this week"],
  "costEstimate": "indicative cost range if estimable, or 'Cannot estimate without further information'",
  "confidence": "HIGH/MEDIUM/LOW",
  "caveats": ["limitation"]
}`;
      } else {
        userPrompt = `Prepare a formal legal document ready for solicitor review and dispatch.

${contextBlock}

Return JSON:
{
  "kind": "document",
  "title": "document title",
  "date": "${new Date().toLocaleDateString("en-GB")}",
  "recipientName": "recipient's legal name",
  "recipientDetails": ["address line 1", "address line 2"],
  "ourReference": "suggested reference",
  "subject": "RE: formal subject line",
  "introduction": "opening paragraph establishing the legal context",
  "sections": [
    { "heading": "Background", "body": ["numbered paragraphs with facts"] },
    { "heading": "Legal Position", "body": ["numbered paragraphs citing applicable law"] },
    { "heading": "Demand / Request", "body": ["specific demands with deadlines"] }
  ],
  "closing": "formal closing paragraph with consequences of non-compliance",
  "signature": "Yours faithfully,\\n[Firm Name]\\n[Solicitor Name]\\n[SRA Number]",
  "confidence": "HIGH/MEDIUM/LOW",
  "caveats": ["This draft requires review by the supervising solicitor before dispatch"]
}`;
      }

    } else {
      // Default: compliance document generation
      const { documentType, documentName, client, directors, shareholders } = body;
      const clientSummary = buildClientSummary(client, directors || [], shareholders || []);

      systemPrompt = `${LEGAL_PERSONA}

You are drafting a "${documentName}" for a regulated fintech firm. This document must be of sufficient quality for direct submission to the ${client.jurisdiction === "US" ? "relevant US regulatory authority" : "Financial Conduct Authority (FCA)"} or review by external counsel.

${GUARDRAILS}

COMPLIANCE DOCUMENT RULES:
- Reference specific regulatory provisions (FCA Handbook, MLR 2017, FSMA 2000 for UK; BSA/AML, state MTL statutes for US).
- Include practical implementation details — not just policy statements.
- Address the company's specific services, structure, and risk profile.
- Use formal document structure with numbered sections and cross-references.
- Include review/approval procedures and version control provisions.`;

      userPrompt = `Generate a comprehensive "${documentName}" document for:

${clientSummary}

Requirements:
1. Professional title page with document metadata (version, date, author, approver)
2. Table of contents
3. Detailed sections with numbered subsections (each section 3-5 substantive paragraphs)
4. Specific references to the company's services, structure, and jurisdiction
5. References to applicable regulations with correct citation format
6. Practical implementation details (procedures, timelines, responsible parties)
7. Review and approval procedures
8. Appendices outline (forms, checklists, templates to be attached)

Write the full document in markdown format. It must read as a polished, submission-ready regulatory compliance document — not a template or draft outline.`;
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-compliance-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
