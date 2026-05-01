import { useEffect, useMemo, useState } from "react";
import { Search, X, BookOpen, ChevronDown, ChevronRight, Loader2, Filter, Plus, ArrowLeft } from "lucide-react";
import { fetchSupplementaryCaseLaw, type SupplementaryCase } from "@/lib/supplementaryCaseLaw";
import { toast } from "sonner";

type Jurisdiction = "BOTH" | "UK" | "US";
type CourtLevel = "ANY" | "SUPREME" | "APPEAL" | "LOWER";

interface ResearchResult extends SupplementaryCase {
  year?: number;
  relevance?: number;
}

const PAGE_SIZE = 8;

function inferYear(date?: string): number | undefined {
  if (!date) return undefined;
  const m = date.match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : undefined;
}

function inferCourtLevel(court?: string): CourtLevel {
  const c = (court || "").toLowerCase();
  if (/supreme|house of lords|uksc|scotus/.test(c)) return "SUPREME";
  if (/appeal|circuit|ewca|ukut|appellate/.test(c)) return "APPEAL";
  if (court) return "LOWER";
  return "ANY";
}

/**
 * Independent Research Sidebar.
 * Additive only — does NOT modify or wrap any existing case workflow.
 * Insertion is broadcast via a `research:insert` CustomEvent so consumers can opt-in.
 */
export function ResearchSidebar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("BOTH");
  const [courtLevel, setCourtLevel] = useState<CourtLevel>("ANY");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

  // Listen for external open requests, e.g. window.dispatchEvent(new CustomEvent("research:open"))
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("research:open", handler as EventListener);
    return () => window.removeEventListener("research:open", handler as EventListener);
  }, []);

  // Keyboard toggle: Ctrl/Cmd + Shift + R
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (jurisdiction !== "BOTH" && r.jurisdiction !== jurisdiction) return false;
      if (courtLevel !== "ANY") {
        const lvl = inferCourtLevel(r.court);
        // Allow lower if court unknown to avoid losing BAILII rows that have no court field
        if (r.court && lvl !== courtLevel) return false;
      }
      const y = r.year ?? inferYear(r.date);
      if (yearFrom && y && y < parseInt(yearFrom, 10)) return false;
      if (yearTo && y && y > parseInt(yearTo, 10)) return false;
      return true;
    });
  }, [results, jurisdiction, courtLevel, yearFrom, yearTo]);

  const paged = filtered.slice(0, page * PAGE_SIZE);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setPage(1);
    try {
      const raw = await fetchSupplementaryCaseLaw({
        query: query.trim(),
        jurisdiction,
        limit: 12,
      });
      const enriched: ResearchResult[] = raw.map((r, idx) => ({
        ...r,
        year: inferYear(r.date),
        relevance: Math.max(0, 100 - idx * 6),
      }));
      setResults(enriched);
      if (!enriched.length) toast.info("No supplementary results found.");
    } catch (e: any) {
      toast.error(e?.message || "Research search failed");
    } finally {
      setLoading(false);
    }
  };

  const insertIntoCase = (r: ResearchResult) => {
    const payload = {
      title: r.title,
      court: r.court,
      year: r.year,
      citation: r.citation,
      jurisdiction: r.jurisdiction,
      source: r.source,
      url: r.url,
      snippet: r.snippet,
      formatted: `[${r.jurisdiction} · ${r.source}] ${r.title}${r.citation ? ` — ${r.citation}` : ""}${r.court ? ` (${r.court}${r.year ? `, ${r.year}` : ""})` : ""}\n${r.url}${r.snippet ? `\n${r.snippet}` : ""}`,
    };
    window.dispatchEvent(new CustomEvent("research:insert", { detail: payload }));
    navigator.clipboard?.writeText(payload.formatted).catch(() => {});
    toast.success("Citation copied & broadcast to case workspace");
  };

  return (
    <>
      {/* Backdrop — clicking it closes the panel so users always have an escape */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}

      {/* Sidebar overlay panel */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-md transform border-l border-border bg-card shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        role="complementary"
        aria-label="Research panel"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">Research</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close research sidebar"
            className="rounded-md p-1.5 hover:bg-muted transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="border-b border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                placeholder='e.g. "negligence duty of care UK"'
                className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={runSearch}
              disabled={loading || !query.trim()}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
            </button>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Filter className="h-3 w-3" />
            Filters
            {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {showFilters && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Jurisdiction</label>
                <div className="flex gap-1">
                  {(["BOTH", "UK", "US"] as Jurisdiction[]).map((j) => (
                    <button
                      key={j}
                      onClick={() => setJurisdiction(j)}
                      className={`flex-1 rounded px-2 py-1 text-[11px] border ${jurisdiction === j ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}
                    >
                      {j === "BOTH" ? "Both" : j}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Court level</label>
                <div className="grid grid-cols-4 gap-1">
                  {(["ANY", "SUPREME", "APPEAL", "LOWER"] as CourtLevel[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCourtLevel(c)}
                      className={`rounded px-1.5 py-1 text-[10px] border ${courtLevel === c ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}
                    >
                      {c === "ANY" ? "Any" : c.charAt(0) + c.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Year range</label>
                <div className="flex gap-2">
                  <input
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="From"
                    className="w-1/2 rounded border border-input bg-background px-2 py-1 text-[11px]"
                  />
                  <input
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="To"
                    className="w-1/2 rounded border border-input bg-background px-2 py-1 text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="h-[calc(100vh-3.5rem-9.5rem)] overflow-y-auto p-3 space-y-2">
          {!loading && !results.length && (
            <div className="text-center text-xs text-muted-foreground py-12">
              Enter a query to search supplementary authorities.
              <div className="mt-2 text-[10px]">CourtListener (US) · BAILII (UK)</div>
            </div>
          )}
          {paged.map((r, idx) => {
            const key = `${r.source}-${idx}-${r.url}`;
            const isOpen = !!expanded[key];
            return (
              <div key={key} className="rounded-md border border-border bg-background p-2.5 hover:border-primary/40 transition">
                <button
                  onClick={() => setExpanded((s) => ({ ...s, [key]: !isOpen }))}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-snug truncate">{r.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{r.jurisdiction}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5">{r.source}</span>
                        {r.court && <span className="truncate max-w-[8rem]">{r.court}</span>}
                        {r.year && <span>· {r.year}</span>}
                        {r.citation && <span className="truncate max-w-[10rem]">· {r.citation}</span>}
                        {typeof r.relevance === "number" && (
                          <span className="ml-auto text-primary font-medium">{r.relevance}%</span>
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />}
                  </div>
                  {r.snippet && !isOpen && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{r.snippet}</p>
                  )}
                </button>
                {isOpen && (
                  <div className="mt-2 space-y-2 border-t border-border pt-2">
                    {r.snippet && <p className="text-[11px] leading-relaxed text-foreground/80">{r.snippet}</p>}
                    <div className="flex items-center gap-2">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Open source ↗
                      </a>
                      <button
                        onClick={() => insertIntoCase(r)}
                        className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <Plus className="h-3 w-3" /> Insert into case
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length > paged.length && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full rounded-md border border-border bg-muted/30 py-2 text-[11px] text-muted-foreground hover:bg-muted"
            >
              Load more ({filtered.length - paged.length} remaining)
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default ResearchSidebar;
