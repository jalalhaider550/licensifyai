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
        systemPrompt: `You are a legal case summarization assistant. Return ONLY valid JSON. Use the case type, existing case data, documents, and prior actions to generate a concise case summary, bullet facts, missing information prompts, and a rough completion percentage.`,
        userPrompt: `Case type: ${caseType}\nCase data: ${JSON.stringify(body.caseData || {}, null, 2)}\nDocuments: ${JSON.stringify(body.documents || [], null, 2)}\nPrevious actions: ${JSON.stringify(body.previousActions || [], null, 2)}\n\nReturn JSON exactly like:\n{\n  "title": "short case title",\n  "summary": "short paragraph",\n  "keyFacts": ["fact 1", "fact 2"],\n  "missingItems": ["Upload signed agreement"],\n  "progressPercentage": 60\n}`,
      };
    case "extract-case-data":
      return {
        systemPrompt: `You extract structured legal case data from uploaded documents. Return ONLY valid JSON. Keep extracted fields practical and brief.`,
        userPrompt: `Case type: ${caseType}\nDocument name: ${body.documentName || "Document"}\nDocument category: ${body.documentCategory || "supporting"}\nDocument text:\n${(body.documentText || "").slice(0, 18000)}\n\nReturn JSON exactly like:\n{\n  "summary": "one short paragraph",\n  "parties": ["Party A"],\n  "dates": ["2025-01-15"],\n  "clauses": ["Termination clause"],\n  "keyFacts": ["fact 1", "fact 2"],\n  "missingItems": ["Need signed version"]\n}`,
      };
    case "next-steps":
      return {
        systemPrompt: `You are an AI legal workflow planner. Return ONLY valid JSON. Produce 3 to 5 short, practical, non-generic next steps tailored to the case type and facts. Each step must be one line.`,
        userPrompt: `Case type: ${caseType}\nCase summary: ${body.caseSummary || ""}\nKey facts: ${JSON.stringify(body.keyFacts || [], null, 2)}\nDocuments: ${JSON.stringify(body.documents || [], null, 2)}\nPrevious actions: ${JSON.stringify(body.previousActions || [], null, 2)}\n\nReturn JSON exactly like:\n{\n  "steps": [\n    { "title": "Draft legal notice", "why": "The facts suggest a formal notice is the fastest leverage point." }\n  ],\n  "missingItems": ["Upload termination clause"]\n}`,
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