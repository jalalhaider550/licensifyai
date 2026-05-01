// Supplementary case-law sources: CourtListener (US) + BAILII (UK).
// Additive only. Does not modify or call into any existing research pipeline.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupplementaryCase {
  source: "CourtListener" | "BAILII";
  jurisdiction: "US" | "UK";
  title: string;
  citation?: string;
  court?: string;
  date?: string;
  url: string;
  snippet?: string;
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

    const tasks: Promise<SupplementaryCase[]>[] = [];
    if (jurisdiction === "US" || jurisdiction === "BOTH") tasks.push(searchCourtListener(query, limit));
    if (jurisdiction === "UK" || jurisdiction === "BOTH") tasks.push(searchBAILII(query, limit));

    const settled = await Promise.all(tasks);
    const results = settled.flat();

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
