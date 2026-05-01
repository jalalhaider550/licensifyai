import { useEffect, useState } from "react";
import { Loader2, FileDown, Save, Gavel, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FILING_TYPES_UK,
  FILING_TYPES_US,
  generateCourtFiling,
  saveCourtFiling,
  listCourtFilings,
  deleteCourtFiling,
  exportCourtFilingPdf,
  exportCourtFilingDocx,
  type CourtFiling,
} from "@/lib/courtFilings";

interface Props {
  caseId: string;
  clientId?: string | null;
  defaultJurisdiction?: "UK" | "US";
  defaultTitle?: string;
  caseFacts?: string;
}

/**
 * Additive court filing panel for a single case.
 * Reuses the existing court-filing-ai pipeline; does not modify other case logic.
 */
export function CaseCourtFilingPanel({ caseId, clientId, defaultJurisdiction = "UK", defaultTitle = "", caseFacts = "" }: Props) {
  const [jurisdiction, setJurisdiction] = useState<"UK" | "US">(defaultJurisdiction);
  const [filingType, setFilingType] = useState<string>(FILING_TYPES_UK[0]);
  const [court, setCourt] = useState("");
  const [title, setTitle] = useState(defaultTitle);
  const [caseNumber, setCaseNumber] = useState("");
  const [claimant, setClaimant] = useState("");
  const [defendant, setDefendant] = useState("");
  const [facts, setFacts] = useState(caseFacts);
  const [relief, setRelief] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>();
  const [filings, setFilings] = useState<CourtFiling[]>([]);

  useEffect(() => {
    setFilingType((jurisdiction === "UK" ? FILING_TYPES_UK : FILING_TYPES_US)[0]);
  }, [jurisdiction]);

  const reload = async () => {
    try {
      const all = await listCourtFilings();
      setFilings(all.filter((f) => f.case_id === caseId));
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  const handleGenerate = async () => {
    if (!title.trim() || !filingType) {
      toast.error("Title and filing type are required");
      return;
    }
    setGenerating(true);
    try {
      const out = await generateCourtFiling({
        jurisdiction, court, filing_type: filingType, title,
        case_number: caseNumber,
        parties: { claimant, defendant },
        facts, relief,
        case_id: caseId, client_id: clientId || null,
      });
      setContent(out);
      toast.success("Draft generated");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) { toast.error("Generate or write the draft first"); return; }
    setSaving(true);
    try {
      const saved = await saveCourtFiling({
        id: savedId, jurisdiction, court, filing_type: filingType, title,
        case_number: caseNumber, parties: { claimant, defendant },
        facts, relief, content,
        case_id: caseId, client_id: clientId || null,
      });
      setSavedId(saved.id);
      toast.success("Filing saved to case");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (fmt: "pdf" | "docx") => {
    if (!content.trim()) { toast.error("Nothing to export"); return; }
    setExporting(fmt);
    try {
      if (fmt === "pdf") await exportCourtFilingPdf(title || "court-filing", content);
      else await exportCourtFilingDocx(title || "court-filing", content);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this saved filing?")) return;
    try { await deleteCourtFiling(id); reload(); toast.success("Deleted"); }
    catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const types = jurisdiction === "UK" ? FILING_TYPES_UK : FILING_TYPES_US;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Court Filing</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Generate · Save · Export</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Jurisdiction</Label>
            <div className="flex gap-1">
              {(["UK", "US"] as const).map((j) => (
                <button key={j} onClick={() => setJurisdiction(j)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs border ${jurisdiction === j ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}>
                  {j}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Filing type</Label>
            <select value={filingType} onChange={(e) => setFilingType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs">
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Court</Label>
            <Input value={court} onChange={(e) => setCourt(e.target.value)} placeholder={jurisdiction === "UK" ? "e.g. High Court (KBD)" : "e.g. S.D.N.Y."} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Case number</Label>
            <Input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Filing title" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{jurisdiction === "UK" ? "Claimant" : "Plaintiff"}</Label>
            <Input value={claimant} onChange={(e) => setClaimant(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Defendant</Label>
            <Input value={defendant} onChange={(e) => setDefendant(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Statement of facts</Label>
            <Textarea rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Relief sought</Label>
            <Textarea rows={2} value={relief} onChange={(e) => setRelief(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Gavel className="h-3.5 w-3.5 mr-1.5" />}
            Generate filing
          </Button>
          <Button onClick={handleSave} disabled={saving || !content} variant="outline" size="sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save to case
          </Button>
          <Button onClick={() => handleExport("pdf")} disabled={exporting !== null || !content} variant="outline" size="sm">
            {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />} PDF
          </Button>
          <Button onClick={() => handleExport("docx")} disabled={exporting !== null || !content} variant="outline" size="sm">
            {exporting === "docx" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />} Word
          </Button>
        </div>

        {content && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Editable draft</Label>
            <Textarea rows={16} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />
          </div>
        )}
      </div>

      {filings.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Saved filings for this case</h4>
          <div className="space-y-2">
            {filings.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-2.5 hover:border-primary/40 transition">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{f.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {f.jurisdiction} · {f.filing_type}{f.court ? ` · ${f.court}` : ""} · {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setSavedId(f.id); setJurisdiction(f.jurisdiction as any); setFilingType(f.filing_type);
                    setCourt(f.court || ""); setTitle(f.title); setCaseNumber(f.case_number || "");
                    setClaimant((f.parties as any)?.claimant || ""); setDefendant((f.parties as any)?.defendant || "");
                    setFacts(f.facts || ""); setRelief(f.relief || ""); setContent(f.content || "");
                    toast.info("Loaded into editor");
                  }}>Load</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(f.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CaseCourtFilingPanel;
