// Supplementary case-law sources: CourtListener (US) + BAILII (UK).
// Additive only. Does not modify or call into any existing research pipeline.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupplementaryCase {
  source: "CourtListener" | "BAILII" | "Lovable AI";
  jurisdiction: "US" | "UK";
  title: string;
  citation?: string;
  court?: string;
  date?: string;
  url: string;
  snippet?: string;
}

async function aiCaseLaw(query: string, jurisdiction: "UK" | "US", limit: number): Promise<SupplementaryCase[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return [];
  const sys = `You are a senior commercial solicitor with 15+ years PQE. Return only REAL, verifiable ${jurisdiction === "UK" ? "United Kingdom (England & Wales, Scotland, Northern Ireland)" : "United States (federal & state)"} case law authorities responsive to the user's query. Never invent citations. If unsure of a citation, omit it. Output strict JSON only.`;
  const user = `Query: ${query}\n\nReturn up to ${limit} authoritative cases as JSON: {"cases":[{"title":"","citation":"","court":"","year":"YYYY","summary":"one sentence ratio"}]}`;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) { console.error("AI case law gateway", resp.status, await resp.text().catch(() => "")); return []; }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const arr: any[] = Array.isArray(parsed?.cases) ? parsed.cases : [];
    return arr.slice(0, limit).map((c: any): SupplementaryCase => ({
      source: "Lovable AI",
      jurisdiction,
      title: String(c.title || "Untitled").slice(0, 240),
      citation: c.citation ? String(c.citation) : undefined,
      court: c.court ? String(c.court) : undefined,
      date: c.year ? String(c.year) : undefined,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${c.title || ""} ${c.citation || ""}`)}`,
      snippet: c.summary ? String(c.summary).slice(0, 400) : undefined,
    }));
  } catch (e) {
    console.error("aiCaseLaw error", e);
    return [];
  }
}

async function searchCourtListener(query: string, limit: number): Promise<SupplementaryCase[]> {
  try {
    const url = `https://www.courtlistener.com/api/rest/v4/search/?type=o&q=${encodeURIComponent(query)}&order_by=score%20desc`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) return [];
    const data = await resp.json();
    const results = (data.results || []).slice(0, limit);
    return results.map((r: any): SupplementaryCase => ({
      source: "CourtListener",
      jurisdiction: "US",
      title: r.caseName || r.case_name || "Untitled",
      citation: (r.citation && Array.isArray(r.citation) ? r.citation.join(", ") : r.citation) || r.lexisCite || r.neutralCite || undefined,
      court: r.court || r.court_id || undefined,
      date: r.dateFiled || r.date_filed || undefined,
      url: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : (r.download_url || `https://www.courtlistener.com/?q=${encodeURIComponent(query)}`),
      snippet: typeof r.snippet === "string" ? r.snippet.replace(/<[^>]+>/g, "").slice(0, 280) : undefined,
    }));
  } catch (e) {
    console.error("CourtListener error", e);
    return [];
  }
}

async function searchBAILII(query: string, limit: number): Promise<SupplementaryCase[]> {
  // BAILII has no public JSON API. Use their search HTML endpoint and parse minimally.
  try {
    const url = `https://www.bailii.org/cgi-bin/lucy_search_1.cgi?querytype=any&query=${encodeURIComponent(query)}&method=boolean&highlight=1&mask_path=`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 LicensifyAI" } });
    if (!resp.ok) return [];
    const html = await resp.text();
    // Match anchors that look like case results: /xx/cases/...
    const cases: SupplementaryCase[] = [];
    const re = /<a\s+href="(\/[a-z]{2}\/cases\/[^"]+\.html)"[^>]*>([^<]+)<\/a>/gi;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = re.exec(html)) && cases.length < limit) {
      const href = m[1];
      if (seen.has(href)) continue;
      seen.add(href);
      const title = m[2].trim().replace(/\s+/g, " ");
      cases.push({
        source: "BAILII",
        jurisdiction: "UK",
        title,
        url: `https://www.bailii.org${href}`,
      });
    }
    return cases;
  } catch (e) {
    console.error("BAILII error", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body.query || "").toString().trim();
    const jurisdiction: string = (body.jurisdiction || "BOTH").toString().toUpperCase();
    const limit: number = Math.min(Math.max(Number(body.limit || 5), 1), 15);

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wantUK = jurisdiction === "UK" || jurisdiction === "BOTH";
    const wantUS = jurisdiction === "US" || jurisdiction === "BOTH";

    const [usExt, ukExt] = await Promise.all([
      wantUS ? searchCourtListener(query, limit) : Promise.resolve([] as SupplementaryCase[]),
      wantUK ? searchBAILII(query, limit) : Promise.resolve([] as SupplementaryCase[]),
    ]);

    // AI fallback per-jurisdiction when external sources return nothing
    const [usAi, ukAi] = await Promise.all([
      wantUS && usExt.length === 0 ? aiCaseLaw(query, "US", limit) : Promise.resolve([] as SupplementaryCase[]),
      wantUK && ukExt.length === 0 ? aiCaseLaw(query, "UK", limit) : Promise.resolve([] as SupplementaryCase[]),
    ]);

    const results = [...usExt, ...ukExt, ...usAi, ...ukAi];

    return new Response(JSON.stringify({ query, jurisdiction, results, supplementary: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("supplementary-case-law error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
