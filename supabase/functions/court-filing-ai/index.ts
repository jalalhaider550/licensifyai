import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JURISDICTION_RULES: Record<string, string> = {
  UK: `UK Civil Procedure Rules (CPR). Use formal English court formatting:
- Header: "IN THE [COURT NAME]" / Claim No.
- Parties: "BETWEEN: [Claimant] -and- [Defendant]"
- Title of document in capitals
- Numbered paragraphs
- Statement of Truth at end
- Signature block with capacity, date
- Reference: relevant CPR Parts where applicable`,
  US: `US Federal/State court formatting:
- Caption block: court name, case number, parties (Plaintiff v. Defendant)
- Document title in capitals centered
- Numbered paragraphs
- Prayer for Relief / WHEREFORE clause
- Signature block: attorney name, bar number, firm, address
- Certificate of Service
- Reference FRCP rules where applicable`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const {
      jurisdiction = "UK",
      court = "",
      filing_type,
      title,
      parties = {},
      case_number = "",
      facts = "",
      relief = "",
      include_memory = true,
    } = body;

    if (!filing_type || !title) {
      return new Response(JSON.stringify({ error: "filing_type and title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull legal memory for context (lessons learned)
    let memoryContext = "";
    if (include_memory) {
      const { data: mem } = await supabase
        .from("legal_memory")
        .select("title, summary, decision, outcome, lessons, jurisdiction, topic")
        .eq("user_id", user.id)
        .or(`jurisdiction.eq.${jurisdiction},jurisdiction.is.null`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (mem && mem.length) {
        memoryContext = "\n\nPRIOR CASE MEMORY (apply lessons learned, avoid past mistakes):\n" +
          mem.map((m, i) => `${i + 1}. [${m.topic || "general"}] ${m.title} — Decision: ${m.decision || "n/a"}; Outcome: ${m.outcome || "n/a"}; Lesson: ${m.lessons || "n/a"}`).join("\n");
      }
    }

    const rules = JURISDICTION_RULES[jurisdiction] || JURISDICTION_RULES.UK;

    const systemPrompt = `You are a Senior Commercial Solicitor (15+ years PQE) drafting a court-ready filing. Be decisive. No hedging. No markdown. No HTML. No quotation marks around the document. Use plain numbered paragraphs and capitalized section headings.

JURISDICTION RULES:
${rules}

OUTPUT REQUIREMENTS:
- Produce a complete, court-ready document body
- Follow the jurisdiction's required format precisely
- Use numbered paragraphs (1., 2., 3.)
- Include proper caption, parties, body, prayer/relief, signature block
- If facts are insufficient, make reasonable professional assumptions and mark them as [ASSUMPTION: ...]
- Output plain text only`;

    const userPrompt = `Draft a ${filing_type} for filing in ${jurisdiction}.
Court: ${court || "[TO BE CONFIRMED]"}
Case Number: ${case_number || "[TO BE ASSIGNED]"}
Title: ${title}
Parties: ${JSON.stringify(parties)}

FACTS:
${facts || "[Insufficient facts provided — make reasonable professional assumptions and flag them.]"}

RELIEF SOUGHT:
${relief || "[Apply standard relief appropriate to the filing type.]"}
${memoryContext}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content, jurisdiction, filing_type, title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("court-filing-ai error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
