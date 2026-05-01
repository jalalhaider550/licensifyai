import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CourtFiling, FILING_TYPES_UK, FILING_TYPES_US,
  deleteCourtFiling, exportCourtFilingDocx, exportCourtFilingPdf,
  generateCourtFiling, listCourtFilings, saveCourtFiling,
} from "@/lib/courtFilings";
import {
  LegalMemoryEntry, deleteLegalMemory, listLegalMemory, saveLegalMemory,
} from "@/lib/legalMemory";
import { Download, FileText, Loader2, Plus, Save, Sparkles, Trash2, Brain, Search } from "lucide-react";

const CourtFilingsTab = () => {
  const { toast } = useToast();
  const [list, setList] = useState<CourtFiling[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState({
    jurisdiction: "UK" as "UK" | "US",
    court: "",
    filing_type: FILING_TYPES_UK[0],
    title: "",
    case_number: "",
    claimant: "",
    defendant: "",
    facts: "",
    relief: "",
    content: "",
  });

  const refresh = async () => {
    try {
      setLoading(true);
      setList(await listCourtFilings());
    } catch (e) {
      toast({ title: "Failed to load filings", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filingTypes = form.jurisdiction === "UK" ? FILING_TYPES_UK : FILING_TYPES_US;

  const handleGenerate = async () => {
    if (!form.title || !form.filing_type) {
      toast({ title: "Title and filing type required", variant: "destructive" });
      return;
    }
    try {
      setGenerating(true);
      const content = await generateCourtFiling({
        jurisdiction: form.jurisdiction,
        court: form.court,
        filing_type: form.filing_type,
        title: form.title,
        case_number: form.case_number,
        parties: { claimant: form.claimant, defendant: form.defendant },
        facts: form.facts,
        relief: form.relief,
      });
      setForm((f) => ({ ...f, content }));
      toast({ title: "Draft generated", description: "Review, edit and save when ready." });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      const saved = await saveCourtFiling({
        id: editingId,
        jurisdiction: form.jurisdiction,
        court: form.court,
        filing_type: form.filing_type,
        title: form.title,
        case_number: form.case_number,
        parties: { claimant: form.claimant, defendant: form.defendant },
        facts: form.facts,
        relief: form.relief,
        content: form.content,
      });
      setEditingId(saved.id);
      toast({ title: "Filing saved" });
      refresh();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleExport = async (kind: "pdf" | "docx") => {
    if (!form.content) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    try {
      setExporting(kind);
      if (kind === "pdf") await exportCourtFilingPdf(form.title, form.content);
      else await exportCourtFilingDocx(form.title, form.content);
    } catch (e) {
      toast({ title: "Export failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const loadIntoEditor = (f: CourtFiling) => {
    setEditingId(f.id);
    const parties = (f.parties || {}) as Record<string, string>;
    setForm({
      jurisdiction: (f.jurisdiction as "UK" | "US") || "UK",
      court: f.court || "",
      filing_type: f.filing_type,
      title: f.title,
      case_number: f.case_number || "",
      claimant: parties.claimant || "",
      defendant: parties.defendant || "",
      facts: f.facts || "",
      relief: f.relief || "",
      content: f.content || "",
    });
  };

  const handleNew = () => {
    setEditingId(undefined);
    setForm({
      jurisdiction: "UK", court: "", filing_type: FILING_TYPES_UK[0], title: "",
      case_number: "", claimant: "", defendant: "", facts: "", relief: "", content: "",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Jurisdiction</Label>
            <Select value={form.jurisdiction} onValueChange={(v) => setForm({ ...form, jurisdiction: v as "UK" | "US", filing_type: v === "UK" ? FILING_TYPES_UK[0] : FILING_TYPES_US[0] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="US">United States</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filing Type</Label>
            <Select value={form.filing_type} onValueChange={(v) => setForm({ ...form, filing_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {filingTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Document Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Particulars of Claim — Smith v Jones" />
          </div>
          <div>
            <Label>Court</Label>
            <Input value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} placeholder="e.g. High Court, Queen's Bench" />
          </div>
          <div>
            <Label>Case Number</Label>
            <Input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} />
          </div>
          <div>
            <Label>Claimant / Plaintiff</Label>
            <Input value={form.claimant} onChange={(e) => setForm({ ...form, claimant: e.target.value })} />
          </div>
          <div>
            <Label>Defendant</Label>
            <Input value={form.defendant} onChange={(e) => setForm({ ...form, defendant: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Material Facts</Label>
            <Textarea rows={4} value={form.facts} onChange={(e) => setForm({ ...form, facts: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Relief Sought</Label>
            <Textarea rows={3} value={form.relief} onChange={(e) => setForm({ ...form, relief: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Filing
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={!form.content}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <Button variant="outline" onClick={() => handleExport("docx")} disabled={!form.content || exporting !== null}>
            {exporting === "docx" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Word
          </Button>
          <Button variant="outline" onClick={() => handleExport("pdf")} disabled={!form.content || exporting !== null}>
            {exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF
          </Button>
          <Button variant="ghost" onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> New</Button>
        </div>

        <div>
          <Label>Editable Draft</Label>
          <Textarea
            rows={20}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Generated filing will appear here. You can edit before exporting."
            className="font-mono text-sm"
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Saved Filings</h3>
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {list.length === 0 && <p className="text-xs text-muted-foreground">No filings yet.</p>}
          {list.map((f) => (
            <div key={f.id} className="rounded border p-2 hover:bg-muted/50 cursor-pointer" onClick={() => loadIntoEditor(f)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{f.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">{f.jurisdiction}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{f.filing_type}</Badge>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async (e) => {
                  e.stopPropagation();
                  await deleteCourtFiling(f.id);
                  refresh();
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const LegalMemoryTab = () => {
  const { toast } = useToast();
  const [list, setList] = useState<LegalMemoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<LegalMemoryEntry>>({ title: "", memory_type: "case", jurisdiction: "UK", topic: "", summary: "", decision: "", outcome: "", lessons: "", tags: [] });
  const [tagsInput, setTagsInput] = useState("");

  const refresh = async () => {
    try { setList(await listLegalMemory(search)); }
    catch (e) { toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" }); }
  };
  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!editing.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    try {
      await saveLegalMemory({
        id: editing.id,
        title: editing.title!,
        memory_type: editing.memory_type || "case",
        jurisdiction: editing.jurisdiction || null,
        topic: editing.topic || "",
        summary: editing.summary || "",
        decision: editing.decision || "",
        outcome: editing.outcome || "",
        lessons: editing.lessons || "",
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast({ title: "Memory saved" });
      setEditing({ title: "", memory_type: "case", jurisdiction: "UK", topic: "", summary: "", decision: "", outcome: "", lessons: "", tags: [] });
      setTagsInput("");
      refresh();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const loadInto = (m: LegalMemoryEntry) => {
    setEditing(m);
    setTagsInput((m.tags || []).join(", "));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Capture Case Memory</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Record past cases, decisions and outcomes. Future court filings automatically draw on these lessons.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Smith v Jones — successful summary judgment" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={editing.memory_type || "case"} onValueChange={(v) => setEditing({ ...editing, memory_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="case">Past Case</SelectItem>
                <SelectItem value="decision">Decision</SelectItem>
                <SelectItem value="outcome">Outcome</SelectItem>
                <SelectItem value="precedent">Precedent</SelectItem>
                <SelectItem value="note">General Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Jurisdiction</Label>
            <Select value={editing.jurisdiction || "UK"} onValueChange={(v) => setEditing({ ...editing, jurisdiction: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="US">US</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Topic / Area of Law</Label>
            <Input value={editing.topic || ""} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} placeholder="e.g. commercial litigation, IP licensing" />
          </div>
          <div className="sm:col-span-2">
            <Label>Summary</Label>
            <Textarea rows={3} value={editing.summary || ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
          </div>
          <div>
            <Label>Decision Made</Label>
            <Textarea rows={3} value={editing.decision || ""} onChange={(e) => setEditing({ ...editing, decision: e.target.value })} />
          </div>
          <div>
            <Label>Outcome</Label>
            <Textarea rows={3} value={editing.outcome || ""} onChange={(e) => setEditing({ ...editing, outcome: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Lessons Learned (used to improve future drafts)</Label>
            <Textarea rows={3} value={editing.lessons || ""} onChange={(e) => setEditing({ ...editing, lessons: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="contract, breach, summary judgment" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Memory</Button>
          <Button variant="ghost" onClick={() => { setEditing({ title: "", memory_type: "case", jurisdiction: "UK", topic: "", summary: "", decision: "", outcome: "", lessons: "", tags: [] }); setTagsInput(""); }}>
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search memory…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} />
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {list.length === 0 && <p className="text-xs text-muted-foreground">No memory entries yet.</p>}
          {list.map((m) => (
            <div key={m.id} className="rounded border p-2 hover:bg-muted/50 cursor-pointer" onClick={() => loadInto(m)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {m.jurisdiction && <Badge variant="outline" className="text-[10px]">{m.jurisdiction}</Badge>}
                    <Badge variant="secondary" className="text-[10px]">{m.memory_type}</Badge>
                    {m.topic && <span className="text-[10px] text-muted-foreground">{m.topic}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async (e) => {
                  e.stopPropagation();
                  await deleteLegalMemory(m.id);
                  refresh();
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const LegalIntelligence = () => {
  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Legal Intelligence</h1>
          <p className="text-sm text-muted-foreground">Court-ready filings with jurisdiction-aware formatting, plus a long-term memory of cases, decisions and outcomes.</p>
        </div>

        <Tabs defaultValue="filings">
          <TabsList>
            <TabsTrigger value="filings"><FileText className="mr-2 h-4 w-4" /> Court Filings</TabsTrigger>
            <TabsTrigger value="memory"><Brain className="mr-2 h-4 w-4" /> Legal Memory</TabsTrigger>
          </TabsList>
          <TabsContent value="filings"><CourtFilingsTab /></TabsContent>
          <TabsContent value="memory"><LegalMemoryTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default LegalIntelligence;
