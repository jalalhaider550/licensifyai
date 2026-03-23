import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

      systemPrompt = `You are a regulatory compliance analyst specialising in fintech licensing. Read the business document and extract ALL relevant information to populate a licensing application form. Return a JSON object with these fields (use null if not found):
- company_name: string
- registration_number: string
- address: string
- website: string
- contact_email: string
- services: array of strings
- target_customers: string
- markets: string
- revenue_model: string
- capital_amount: string
- source_of_funds: string
- expected_volume: string
- compliance_officer: string
- aml_program: string
- risk_management: string
- directors: array of {name, nationality, role}
- shareholders: array of {name, percentage, country}

Return ONLY valid JSON. No markdown.`;

      userPrompt = `Extract form fields for a ${licenseType || "fintech license"} application from this document for ${clientName || "the company"}:\n\n${documentText}`;

    } else if (action === "extract-business-model") {
      const { documentText, clientName } = body;
      
      systemPrompt = `You are a regulatory compliance analyst specializing in fintech licensing. Your task is to read business model documents and extract structured information. Return a JSON object with the following fields:
- services_offered: array of strings
- revenue_model: string
- target_customers: string
- technology_platform: string
- operational_structure: string
- compliance_considerations: string
- company_overview: string

Be thorough and extract as much relevant detail as possible. Return ONLY valid JSON, no markdown.`;

      userPrompt = `Extract structured business information from the following document for ${clientName || "the company"}:\n\n${documentText}`;

    } else if (action === "generate-business-plan") {
      const { client, directors, shareholders, extractedData, licenseType, currency } = body;

      const clientSummary = `
Company: ${client.company_name}
Jurisdiction: ${client.jurisdiction}
Registration Number: ${client.registration_number || "Not provided"}
Registered Address: ${client.registered_address || "Not provided"}
Services: ${client.services?.join(", ") || "Not specified"}
Contact Email: ${client.contact_email || "Not provided"}
Incorporation Date: ${client.incorporation_date || "Not provided"}
License Type: ${licenseType || "Not specified"}
Currency: ${currency || "GBP"}

Directors:
${directors?.length > 0 ? directors.map((d: any) => `- ${d.full_name} (${d.role || "Director"})`).join("\n") : "No directors recorded"}

Shareholders:
${shareholders?.length > 0 ? shareholders.map((s: any) => `- ${s.name} (${s.percentage}%)`).join("\n") : "No shareholders recorded"}

Extracted Business Model Data:
${extractedData ? JSON.stringify(extractedData, null, 2) : "No extracted data available"}
`.trim();

      systemPrompt = `You are a senior regulatory lawyer and compliance document specialist for fintech companies. You generate professional, submission-ready business plans suitable for regulatory licensing applications (UK FCA and US FinCEN/state regulators). Your writing must be formal, precise, legally structured, and commercially credible. Use clear headings, defined parties where relevant, disciplined clause-style sections, and ${currency || "GBP"} for all financial figures.`;

      userPrompt = `Generate a comprehensive, detailed fintech business plan for regulatory submission using the following company data:

${clientSummary}

The business plan MUST include ALL of the following sections with detailed content:

1. Executive Summary
2. Company Overview
3. Products and Services
4. Business Model
5. Market Opportunity
6. Technology Infrastructure
7. Compliance and Regulatory Strategy
8. AML and Financial Crime Controls
9. Operational Structure
10. Risk Management Framework
11. Growth Strategy
12. Financial Overview

Write the full document in markdown format. Make it detailed and suitable for regulatory submissions. Each section should be at least 2-3 paragraphs. Use ${currency || "GBP"} for all financial references. The final output must read like a polished professional document, not a rough draft.`;

    } else if (action === "generate-license-template") {
      const { client, directors, shareholders, extractedData, licenseType, currency } = body;

      const clientSummary = `
Company: ${client.company_name}
Jurisdiction: ${client.jurisdiction}
Registration Number: ${client.registration_number || "Not provided"}
Registered Address: ${client.registered_address || "Not provided"}
Website: ${client.website || "Not provided"}
Services: ${client.services?.join(", ") || "Not specified"}
Contact Email: ${client.contact_email || "Not provided"}
License Type: ${licenseType || "Not specified"}
Currency: ${currency || "GBP"}

Directors:
${directors?.length > 0 ? directors.map((d: any) => `- ${d.full_name} (${d.role || "Director"}, ${d.nationality || "Nationality not provided"})`).join("\n") : "No directors recorded"}

Shareholders:
${shareholders?.length > 0 ? shareholders.map((s: any) => `- ${s.name} (${s.percentage}%, ${s.country || "Country not provided"})`).join("\n") : "No shareholders recorded"}

Additional Data:
${extractedData ? JSON.stringify(extractedData, null, 2) : "No additional data"}
`.trim();

      systemPrompt = `You are a regulatory compliance document specialist for fintech licensing. You generate structured license application data as JSON. Use ${currency || "GBP"} for all financial figures. Be thorough and specific. Return ONLY valid JSON, no markdown, no code fences.`;

      userPrompt = `Generate a comprehensive license application preparation template for a ${licenseType || "fintech license"} using the following company data:

${clientSummary}

Return a JSON object with this exact structure. Populate every field from the company data above. Where data is missing, use "[TO BE PROVIDED]" as the value.

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
        { "label": "Services Offered", "value": "..." },
        { "label": "Target Customers", "value": "..." },
        { "label": "Markets Served", "value": "..." },
        { "label": "Revenue Model", "value": "..." }
      ]
    },
    {
      "title": "Directors and Management",
      "fields": [
        { "label": "Director 1 — Name", "value": "..." },
        { "label": "Director 1 — Nationality", "value": "..." },
        { "label": "Director 1 — Role", "value": "..." }
      ]
    },
    {
      "title": "Shareholders and Ownership Structure",
      "fields": [
        { "label": "Shareholder 1 — Name", "value": "..." },
        { "label": "Shareholder 1 — Ownership %", "value": "..." },
        { "label": "Shareholder 1 — Country", "value": "..." }
      ]
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
        { "label": "Compliance Officer / MLRO", "value": "..." },
        { "label": "KYC / CDD Procedures", "value": "..." },
        { "label": "Transaction Monitoring", "value": "..." },
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
        { "label": "Data Protection / GDPR Compliance", "value": "..." },
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
  ]
}

Include ALL directors and shareholders as separate fields (Director 1, Director 2, etc.). Add additional fields within sections where the company data warrants it. Return ONLY the JSON.`;

    } else if (action === "generate-legal-draft") {
      const { actionType, draftType, caseType, caseSummary, keyFacts, parties, jurisdiction, documents, previousActions } = body;

      systemPrompt = `You are a senior lawyer drafting professional legal work product. Return ONLY valid JSON. Do not use markdown, code fences, or hash-prefixed headings. Use formal legal language, jurisdiction-consistent terminology, and publication-ready structure.`;

      if (actionType === "review_matter") {
        userPrompt = `Prepare a legal review memorandum.

Draft type: ${draftType || "legal review memorandum"}
Case type: ${caseType || "general_legal"}
Jurisdiction: ${jurisdiction || "UK"}
Parties: ${JSON.stringify(parties || [], null, 2)}
Case summary: ${caseSummary || ""}
Key facts: ${JSON.stringify(keyFacts || [], null, 2)}
Documents: ${JSON.stringify(documents || [], null, 2)}
Previous actions: ${JSON.stringify(previousActions || [], null, 2)}

Return JSON in exactly this shape:
{
  "kind": "review",
  "title": "...",
  "overview": "...",
  "keyIssues": ["..."],
  "legalRisks": ["..."],
  "recommendations": ["..."]
}`;
      } else if (actionType === "generate_strategy") {
        userPrompt = `Prepare a legal strategy memorandum.

Draft type: ${draftType || "legal strategy memorandum"}
Case type: ${caseType || "general_legal"}
Jurisdiction: ${jurisdiction || "UK"}
Parties: ${JSON.stringify(parties || [], null, 2)}
Case summary: ${caseSummary || ""}
Key facts: ${JSON.stringify(keyFacts || [], null, 2)}
Documents: ${JSON.stringify(documents || [], null, 2)}
Previous actions: ${JSON.stringify(previousActions || [], null, 2)}

Return JSON in exactly this shape:
{
  "kind": "strategy",
  "title": "...",
  "bestCourse": ["..."],
  "risks": ["..."],
  "alternatives": ["..."],
  "immediateNextMoves": ["..."]
}`;
      } else {
        userPrompt = `Prepare a formal legal document ready for lawyer review.

Draft type: ${draftType || "formal legal notice"}
Case type: ${caseType || "general_legal"}
Jurisdiction: ${jurisdiction || "UK"}
Parties: ${JSON.stringify(parties || [], null, 2)}
Case summary: ${caseSummary || ""}
Key facts: ${JSON.stringify(keyFacts || [], null, 2)}
Documents: ${JSON.stringify(documents || [], null, 2)}
Previous actions: ${JSON.stringify(previousActions || [], null, 2)}

Return JSON in exactly this shape:
{
  "kind": "document",
  "title": "...",
  "date": "${new Date().toLocaleDateString("en-GB")}",
  "recipientName": "...",
  "recipientDetails": ["..."],
  "subject": "...",
  "introduction": "...",
  "sections": [
    { "heading": "Introduction", "body": ["..."] },
    { "heading": "Background", "body": ["..."] },
    { "heading": "Legal Basis", "body": ["..."] },
    { "heading": "Demand", "body": ["..."] }
  ],
  "closing": "...",
  "signature": "Yours faithfully,\n[Law Firm Name]"
}`;
      }

    } else {
      const { documentType, documentName, client, directors, shareholders } = body;

      const clientSummary = `
Company: ${client.company_name}
Jurisdiction: ${client.jurisdiction}
Registration Number: ${client.registration_number || "Not provided"}
Registered Address: ${client.registered_address || "Not provided"}
Services: ${client.services?.join(", ") || "Not specified"}
Contact Email: ${client.contact_email || "Not provided"}
Contact Phone: ${client.contact_phone || "Not provided"}
Incorporation Date: ${client.incorporation_date || "Not provided"}

Directors:
${directors.length > 0 ? directors.map((d: any) => `- ${d.full_name} (${d.role || "Director"})`).join("\n") : "No directors recorded"}

Shareholders:
${shareholders.length > 0 ? shareholders.map((s: any) => `- ${s.name} (${s.percentage}%)`).join("\n") : "No shareholders recorded"}
`.trim();

      systemPrompt = `You are a senior regulatory lawyer and compliance document specialist for fintech companies. You generate professional, detailed compliance documents for fintech license applications. Your documents must be formally written, legally structured, and suitable for direct review by counsel. Use clear headings, sections, subsections, and precise regulatory language.`;

      userPrompt = `Generate a comprehensive "${documentName}" document for the following company. Use all the company data provided to make the document specific and relevant.

${clientSummary}

The document should be well-structured with:
1. Clear title and date
2. Table of contents outline
3. Detailed sections with subsections
4. Specific references to the company's services and structure
5. References to relevant regulations
6. Practical implementation details

Please write the full document in markdown format. The draft must feel submission-ready and professionally structured.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
