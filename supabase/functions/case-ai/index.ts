import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildPrompt = (body: any) => {
  const caseType = body.caseType || "general_legal";

  switch (body.action) {
    case "chat-intake":
      return {
        systemPrompt: `You are an AI legal intake assistant. You help law firms structure a new legal case using a short chat. Return ONLY valid JSON. Ask one question at a time. Keep questions short and specific. Collect these fields: client_name, opponent, case_summary, key_facts. Mark isComplete true only when you have enough detail to create a workable case record.`,
        userPrompt: `Case type: ${caseType}\nCurrent structured data: ${JSON.stringify(body.currentData || {}, null, 2)}\nConversation: ${JSON.stringify(body.messages || [], null, 2)}\n\nReturn JSON with this exact shape:\n{\n  "nextQuestion": "short question or completion message",\n  "structuredData": {\n    "client_name": "",\n    "opponent": "",\n    "case_summary": "",\n    "key_facts": ["fact 1"]\n  },\n  "isComplete": true,\n  "completionSignal": "short explanation"\n}`,
      };
    case "summarize-case":
      return {
        systemPrompt: `You are a senior legal associate preparing a matter file. Return ONLY valid JSON. Use precise legal terminology, write a concise professional case summary, extract the most material facts, and convert missing information into actionable legal collection tasks.`,
        userPrompt: `Case type: ${caseType}\nJurisdiction: ${body.jurisdiction || body.caseData?.jurisdiction || "UK"}\nParties: ${JSON.stringify(body.parties || [], null, 2)}\nCase data: ${JSON.stringify(body.caseData || {}, null, 2)}\nDocuments: ${JSON.stringify(body.documents || [], null, 2)}\nPrevious actions: ${JSON.stringify(body.previousActions || [], null, 2)}\n\nReturn JSON exactly like:\n{\n  "title": "short case title",\n  "summary": "short professional paragraph",\n  "keyFacts": ["fact 1", "fact 2"],\n  "missingItems": [\n    {\n      "label": "Upload Executed Agreement",\n      "actionLabel": "Upload now",\n      "actionType": "upload_document",\n      "priority": "high",\n      "documentCategory": "agreement",\n      "why": "The executed contract is needed to confirm the operative terms and breach pathway."\n    }\n  ],\n  "progressPercentage": 60,\n  "status": "In Progress"\n}`,
      };
    case "extract-case-data":
      return {
        systemPrompt: `You extract structured legal case data from uploaded documents. Return ONLY valid JSON. Identify parties, material dates, operative clauses, and missing evidentiary items using legally accurate wording.`,
        userPrompt: `Case type: ${caseType}\nJurisdiction: ${body.jurisdiction || "UK"}\nDocument name: ${body.documentName || "Document"}\nDocument category: ${body.documentCategory || "supporting"}\nDocument text:\n${(body.documentText || "").slice(0, 18000)}\n\nReturn JSON exactly like:\n{\n  "summary": "one short professional paragraph",\n  "parties": ["Party A"],\n  "dates": ["2025-01-15"],\n  "clauses": ["Dispute resolution clause"],\n  "keyFacts": ["fact 1", "fact 2"],\n  "missingItems": [\n    {\n      "label": "Upload Signed Counterpart",\n      "actionLabel": "Upload now",\n      "actionType": "upload_document",\n      "priority": "high",\n      "documentCategory": "agreement",\n      "why": "A signed copy is needed to confirm execution and enforceability."\n    }\n  ],\n  "jurisdiction": "UK"\n}`,
      };
    case "next-steps":
      return {
        systemPrompt: `You are a senior litigation and commercial lawyer. Return ONLY valid JSON. Produce 3 to 5 legally accurate, specific, and executable next actions tailored to the case type, jurisdiction, facts, documents, and prior work. Use precise legal terminology. Do not write generic advice. Each title must read like a button label a lawyer would click. Include a priority, a standardized action type, and 1 to 2 lines of legal reasoning. Convert missing information into action buttons as well.`,
        userPrompt: `Case type: ${caseType}\nJurisdiction: ${body.jurisdiction || "UK"}\nParties: ${JSON.stringify(body.parties || [], null, 2)}\nCase summary: ${body.caseSummary || ""}\nKey facts: ${JSON.stringify(body.keyFacts || [], null, 2)}\nDocuments: ${JSON.stringify(body.documents || [], null, 2)}\nPrevious actions: ${JSON.stringify(body.previousActions || [], null, 2)}\n\nRules:\n- Use formal legal action labels such as "Draft Formal Legal Demand Notice" or "Analyze Dispute Resolution Clause".\n- Prefer actionType values from: draft_document, review_matter, upload_document, generate_strategy.\n- Use priority values: high, medium, low.\n- For upload actions, include the best-fit documentCategory.\n- For drafting, review, and strategy actions, include a draftType.\n- status must be one of: Draft, In Progress, Ready for Action.\n\nReturn JSON exactly like:\n{\n  "steps": [\n    {\n      "title": "Draft Formal Legal Demand Notice",\n      "actionLabel": "Generate draft",\n      "actionType": "draft_document",\n      "draftType": "formal legal demand notice",\n      "priority": "high",\n      "documentCategory": "correspondence",\n      "why": "Non-payment after delivery indicates an actionable breach, and a formal pre-action demand is the clearest next escalation step."\n    },\n    {\n      "title": "Analyze Dispute Resolution Clause",\n      "actionLabel": "Open review",\n      "actionType": "review_matter",\n      "draftType": "dispute resolution clause review memorandum",\n      "priority": "medium",\n      "documentCategory": "agreement",\n      "why": "The contract's dispute clause will determine notice requirements, forum, and escalation sequence."\n    },\n    {\n      "title": "Prepare Without-Prejudice Resolution Strategy",\n      "actionLabel": "Generate strategy",\n      "actionType": "generate_strategy",\n      "draftType": "without prejudice negotiation strategy",\n      "priority": "low",\n      "documentCategory": "supporting",\n      "why": "A strategy note helps sequence negotiation, evidence preservation, and escalation choices using the current factual record."\n    }\n  ],\n  "missingItems": [\n    {\n      "label": "Upload Executed Agreement",\n      "actionLabel": "Upload now",\n      "actionType": "upload_document",\n      "priority": "high",\n      "documentCategory": "agreement",\n      "why": "The executed agreement is needed to confirm governing terms, obligations, and remedies."\n    }\n  ],\n  "status": "Ready for Action"\n}`,
      };
    default:
      throw new Error(`Unknown action: ${body.action}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { systemPrompt, userPrompt } = buildPrompt(body);

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
        reasoning: {
          effort: "medium",
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

      const text = await response.text();
      console.error("case-ai gateway error:", response.status, text);
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("case-ai error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});