import { supabase } from "@/integrations/supabase/client";

export interface SupplementaryCase {
  source: "CourtListener" | "BAILII" | "Lovable AI";
  jurisdiction: "US" | "UK";
  title: string;
  citation?: string;
  court?: string;
  date?: string;
  url: string;
  snippet?: string;
}

export interface SupplementaryLookupOptions {
  query: string;
  jurisdiction?: "UK" | "US" | "BOTH";
  limit?: number;
}

/**
 * Supplementary, additive-only case-law lookup.
 * Never replaces or alters existing research pipelines.
 * Call this only when the user explicitly requests broader research, or
 * when the primary system reports insufficient coverage.
 */
export async function fetchSupplementaryCaseLaw(opts: SupplementaryLookupOptions): Promise<SupplementaryCase[]> {
  const { data, error } = await supabase.functions.invoke("supplementary-case-law", {
    body: {
      query: opts.query,
      jurisdiction: opts.jurisdiction || "BOTH",
      limit: opts.limit || 5,
    },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data?.results as SupplementaryCase[]) || [];
}

/** Render supplementary cases as a tagged plain-text block to APPEND to existing outputs without changing format. */
export function renderSupplementaryAppendix(results: SupplementaryCase[]): string {
  if (!results.length) return "";
  const lines = ["", "SUPPLEMENTARY AUTHORITIES (additive — secondary sources)"];
  results.forEach((r, i) => {
    const meta = [r.court, r.date, r.citation].filter(Boolean).join(" · ");
    lines.push(`${i + 1}. [${r.jurisdiction} · ${r.source}] ${r.title}${meta ? ` — ${meta}` : ""}`);
    lines.push(`   ${r.url}`);
    if (r.snippet) lines.push(`   ${r.snippet}`);
  });
  return lines.join("\n");
}
