import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, applicationData, jurisdiction, licenseType, documentContent } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const appSummary = applicationData ? JSON.stringify(applicationData, null, 2) : "No application data provided";

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "full-analysis") {
      systemPrompt = `You are a senior regulatory compliance analyst specializing in fintech licensing for both FCA (UK) and US state/federal regulators. You must return ONLY valid JSON (no markdown, no code fences). Analyze the application data and return a comprehensive analysis.`;

      userPrompt = `Analyze this ${licenseType || "fintech license"} application for ${jurisdiction || "UK"} jurisdiction.

Application Data:
${appSummary}

${documentContent ? `Generated Document Content:\n${documentContent.slice(0, 15000)}` : ""}

Return a JSON object with this EXACT structure:

{
  "simulatedReview": {
    "outcome": "Likely Approval" or "Likely Follow-Up" or "High Risk",
    "concerns": ["list of specific weaknesses found"],
    "expectedQuestions": ["specific questions regulators would ask"],
    "recommendation": "ready to submit OR specific fixes needed"
  },
  "approvalScore": {
    "overall": 0-100,
    "breakdown": {
      "amlStrength": { "score": 0-10, "detail": "explanation" },
      "governance": { "score": 0-10, "detail": "explanation" },
      "capitalAdequacy": { "score": 0-10, "detail": "explanation" },
      "documentationQuality": { "score": 0-10, "detail": "explanation" },
      "operationalReadiness": { "score": 0-10, "detail": "explanation" }
    },
    "improvements": ["how to improve each weak area"]
  },
  "strategyRecommendation": {
    "recommendedStrategy": "description of best approach",
    "reasoning": "why this strategy is recommended",
    "alternatives": ["other options to consider"],
    "timeline": "estimated timeline"
  },
  "issues": [
    {
      "issue": "what is wrong",
      "severity": "critical" or "warning" or "info",
      "why": "why it matters to regulators",
      "fix": "specific steps to fix it"
    }
  ],
  "benchmark": {
    "aml": { "rating": "Below Average" or "Average" or "Strong", "detail": "comparison" },
    "governance": { "rating": "Below Average" or "Average" or "Strong", "detail": "comparison" },
    "capital": { "rating": "Below Average" or "Average" or "Strong", "detail": "comparison" },
    "documentation": { "rating": "Below Average" or "Average" or "Strong", "detail": "comparison" },
    "technology": { "rating": "Below Average" or "Average" or "Strong", "detail": "comparison" }
  },
  "consistencyChecks": [
    {
      "conflict": "description of inconsistency",
      "sections": ["which sections conflict"],
      "suggestion": "how to resolve"
    }
  ],
  "decisionAdvice": {
    "ready": true or false,
    "summary": "overall assessment",
    "missing": ["what is still missing"],
    "nextSteps": ["ordered list of what to do next"]
  }
}

Be thorough, specific, and reference actual data from the application. Return ONLY the JSON.`;

    } else if (action === "make-it-pass") {
      systemPrompt = `You are a senior regulatory compliance document specialist. Your job is to take an existing application document and rewrite it to meet regulatory standards. Strengthen weak sections, add missing justifications, use proper regulatory language, and make it submission-ready. Return the improved document in markdown format.`;

      userPrompt = `Improve this ${licenseType || "fintech license"} application for ${jurisdiction || "UK"} to make it submission-ready.

Application Data:
${appSummary}

Current Document:
${documentContent || "No document content provided"}

Requirements:
1. Rewrite weak sections with stronger regulatory language
2. Add missing justifications and evidence references
3. Strengthen AML and compliance sections with specific procedures
4. Add proper risk mitigation strategies
5. Ensure all regulatory requirements are addressed
6. Use formal language suitable for ${jurisdiction === "US" ? "FinCEN/State regulators" : "FCA"} submission
7. Add specific references to relevant regulations

Return the COMPLETE improved document in markdown format.`;

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
