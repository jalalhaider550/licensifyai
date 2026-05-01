import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ExternalLink, BookOpen, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SupplementaryCase, fetchSupplementaryCaseLaw } from "@/lib/supplementaryCaseLaw";

/**
 * Side panel for additive case-law lookup (CourtListener + BAILII).
 * Does NOT touch the primary research system. Use as an enrichment layer.
 */
export const SupplementaryCaseLawPanel = ({
  defaultQuery = "",
  defaultJurisdiction = "BOTH",
}: {
  defaultQuery?: string;
  defaultJurisdiction?: "UK" | "US" | "BOTH";
}) => {
  const { toast } = useToast();
  const [query, setQuery] = useState(defaultQuery);
  const [jurisdiction, setJurisdiction] = useState<"UK" | "US" | "BOTH">(defaultJurisdiction);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SupplementaryCase[]>([]);

  const run = async () => {
    if (!query.trim()) {
      toast({ title: "Enter a search query", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const r = await fetchSupplementaryCaseLaw({ query, jurisdiction, limit: 6 });
      setResults(r);
      if (!r.length) toast({ title: "No supplementary results", description: "Primary system results remain unchanged." });
    } catch (e) {
      toast({ title: "Lookup failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Supplementary Case Law</h3>
        <Badge variant="outline" className="text-[10px]">Additive · Secondary</Badge>
      </div>
      <p className="text-xs text-muted-foreground flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        Optional enrichment from CourtListener (US) and BAILII (UK). Does not replace your primary research results.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <div>
          <Label className="text-xs">Query</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. summary judgment fraud" onKeyDown={(e) => e.key === "Enter" && run()} />
        </div>
        <div>
          <Label className="text-xs">Jurisdiction</Label>
          <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v as "UK" | "US" | "BOTH")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BOTH">UK + US</SelectItem>
              <SelectItem value="UK">UK (BAILII)</SelectItem>
              <SelectItem value="US">US (CourtListener)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className="rounded border p-2 hover:bg-muted/40">
            <div className="flex items-center gap-1 mb-1">
              <Badge variant="outline" className="text-[10px]">{r.jurisdiction}</Badge>
              <Badge variant="secondary" className="text-[10px]">{r.source}</Badge>
              {r.court && <span className="text-[10px] text-muted-foreground truncate">{r.court}</span>}
              {r.date && <span className="text-[10px] text-muted-foreground">{r.date}</span>}
            </div>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline inline-flex items-start gap-1">
              {r.title} <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
            </a>
            {r.citation && <p className="text-[11px] text-muted-foreground mt-0.5">{r.citation}</p>}
            {r.snippet && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{r.snippet}</p>}
          </div>
        ))}
        {!loading && results.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No supplementary results yet — primary system output is unaffected.</p>
        )}
      </div>
    </Card>
  );
};
