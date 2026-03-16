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

    if (action === "extract-business-model") {
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
      const { client, directors, shareholders, extractedData } = body;

      const clientSummary = `
Company: ${client.company_name}
Jurisdiction: ${client.jurisdiction}
Registration Number: ${client.registration_number || "Not provided"}
Registered Address: ${client.registered_address || "Not provided"}
Services: ${client.services?.join(", ") || "Not specified"}
Contact Email: ${client.contact_email || "Not provided"}
Incorporation Date: ${client.incorporation_date || "Not provided"}

Directors:
${directors?.length > 0 ? directors.map((d: any) => `- ${d.full_name} (${d.role || "Director"})`).join("\n") : "No directors recorded"}

Shareholders:
${shareholders?.length > 0 ? shareholders.map((s: any) => `- ${s.name} (${s.percentage}%)`).join("\n") : "No shareholders recorded"}

Extracted Business Model Data:
${extractedData ? JSON.stringify(extractedData, null, 2) : "No extracted data available"}
`.trim();

      systemPrompt = `You are a regulatory compliance document specialist for fintech companies. You generate professional, detailed business plans suitable for regulatory licensing applications (UK FCA and US FinCEN/state regulators). Your documents should be comprehensive, well-structured, and include specific references to the company's data.`;

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

Write the full document in markdown format. Make it detailed and suitable for regulatory submissions. Each section should be at least 2-3 paragraphs.`;

    } else {
      // Default: original compliance doc generation
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

      systemPrompt = `You are a regulatory compliance document specialist for fintech companies. You generate professional, detailed compliance documents for fintech license applications. Your documents should be structured with clear headings, sections, and subsections. Use formal legal language appropriate for regulatory submissions. Include specific references to relevant regulations where appropriate. Always tailor the document to the specific company data provided.`;

      userPrompt = `Generate a comprehensive "${documentName}" document for the following company. Use all the company data provided to make the document specific and relevant.

${clientSummary}

The document should be well-structured with:
1. Clear title and date
2. Table of contents outline
3. Detailed sections with subsections
4. Specific references to the company's services and structure
5. References to relevant regulations
6. Practical implementation details

Please write the full document in markdown format.`;
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
