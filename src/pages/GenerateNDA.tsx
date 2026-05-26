import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import { ContractLimitDialog } from "@/components/payments/ContractLimitDialog";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  FileUp,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  createLegalDocxBlob,
  createLegalPdfBlob,
  type LegalDocumentPayload,
} from "@/lib/legalDocuments";
import {
  prepareBrowserDownload,
  triggerBrowserDownload,
} from "@/lib/fileDownloads";
import { DocumentUploadReview, type ReviewedDocument } from "@/components/app/DocumentUploadReview";

interface SubClause {
  number: string;
  body: string;
}

interface DocumentClause {
  number: string;
  title: string;
  body: string;
  subClauses?: SubClause[];
}

interface DocumentWarning {
  type: string;
  message: string;
}

interface GeneratedNDA {
  title: string;
  date: string;
  parties: { disclosingParty: string; receivingParty: string };
  recitals: string;
  definitions: { term: string; definition: string }[];
  clauses: DocumentClause[];
  governingLaw: string;
  signatureBlock: string;
  warnings: DocumentWarning[];
}

const buildFileName = (partyName: string, format: string) => {
  const party = partyName?.trim()
    ? partyName.trim().replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
    : "LicensifyAI";
  const date = new Date().toISOString().split("T")[0];
  return `NDA_${party}_${date}.${format}`;
};

const ndaToLegalPayload = (doc: GeneratedNDA): LegalDocumentPayload => {
  const sections = doc.clauses.map((c) => ({
    heading: `${c.number}. ${c.title}`,
    body: [c.body, ...(c.subClauses || []).map((sc) => `${sc.number} ${sc.body}`)],
  }));

  if (doc.recitals) sections.unshift({ heading: "RECITALS", body: [doc.recitals] });
  if (doc.definitions?.length) {
    sections.splice(1, 0, {
      heading: "DEFINITIONS",
      body: doc.definitions.map((d) => `"${d.term}" means ${d.definition}`),
    });
  }
  if (doc.governingLaw) sections.push({ heading: "GOVERNING LAW", body: [doc.governingLaw] });

  return {
    kind: "document",
    title: doc.title,
    date: doc.date,
    recipientName: `Disclosing Party: ${doc.parties.disclosingParty}`,
    recipientDetails: [`Receiving Party: ${doc.parties.receivingParty}`],
    sections,
    closing: doc.signatureBlock,
  };
};

const CLAUSE_LIBRARY = [
  "Indemnity",
  "Limitation of Liability",
  "Non-compete",
  "Dispute Resolution",
  "Data Protection",
  "Force Majeure",
];

const GenerateNDA = () => {
  const [disclosingParty, setDisclosingParty] = useState("");
  const [receivingParty, setReceivingParty] = useState("");
  const [jurisdiction, setJurisdiction] = useState("United Kingdom");
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState("");
  const [ndaType, setNdaType] = useState<"one-way" | "mutual">("one-way");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [document, setDocument] = useState<GeneratedNDA | null>(null);
  const [versions, setVersions] = useState<GeneratedNDA[]>([]);
  const [editingClauseIndex, setEditingClauseIndex] = useState<number | null>(null);
  const [editingClauseBody, setEditingClauseBody] = useState("");
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [showRegenerateInput, setShowRegenerateInput] = useState<number | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set());
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "docx" | null>(null);
  const [addClauseFrom, setAddClauseFrom] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "upload">("create");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const navigate = useNavigate();
  const { used, limit, bonus, refetch: refetchPlan } = usePlan();

  const handleUploadReviewed = (doc: ReviewedDocument, _review: any, _originalText: string) => {
    const mapped: GeneratedNDA = {
      title: doc.title || "Uploaded NDA",
      date: doc.date || new Date().toISOString().split("T")[0],
      parties: { disclosingParty: doc.parties?.partyA || doc.parties?.disclosingParty || "", receivingParty: doc.parties?.partyB || doc.parties?.receivingParty || "" },
      recitals: doc.recitals || "",
      definitions: doc.definitions || [],
      clauses: doc.clauses || [],
      governingLaw: doc.governingLaw || "",
      signatureBlock: doc.signatureBlock || "",
      warnings: (doc.warnings || []) as DocumentWarning[],
    };
    setDisclosingParty(mapped.parties.disclosingParty);
    setReceivingParty(mapped.parties.receivingParty);
    setDocument(mapped);
    setVersions([mapped]);
    setExpandedClauses(new Set());
  };

  const toggleClause = (index: number) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!disclosingParty.trim() || !receivingParty.trim()) {
      toast.error("Please enter both party names.");
      return;
    }
    setGenerating(true);
    try {
      const { data: usageData, error: usageErr } = await supabase.rpc("consume_contract", {
        _contract_type: "nda",
        _country: jurisdiction,
        _jurisdiction: null,
      });
      if (usageErr) throw usageErr;
      const usage = usageData as { allowed: boolean; reason?: string };
      if (!usage?.allowed) {
        if (usage?.reason === "pending_payment") {
          toast.error("Subscribe to a plan to start generating NDAs.");
          navigate("/upgrade");
          return;
        }
        if (usage?.reason === "limit_reached") {
          setShowLimitDialog(true);
          return;
        }
        toast.error("Unable to start generation.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("generate-legal-document", {
        body: {
          action: "generate-nda",
          disclosingParty: disclosingParty.trim(),
          receivingParty: receivingParty.trim(),
          jurisdiction,
          purpose,
          duration,
          ndaType,
          specialInstructions,
        },
      });
      if (error) {
        if (error.message?.includes("402") || data?.errorType === "credits_exhausted") {
          toast.error("Your AI balance is used up. Please top up in Settings → Cloud & AI balance.", { duration: 8000 });
          return;
        }
        if (error.message?.includes("429") || data?.errorType === "rate_limit") {
          toast.error("AI rate limit reached. Please wait a moment and try again.", { duration: 6000 });
          return;
        }
        throw error;
      }
      if (!data?.success) {
        if (data?.errorType === "credits_exhausted") {
          toast.error("Your AI balance is used up. Please top up in Settings → Cloud & AI balance.", { duration: 8000 });
          return;
        }
        if (data?.errorType === "rate_limit") {
          toast.error("AI rate limit reached. Please wait a moment and try again.", { duration: 6000 });
          return;
        }
        throw new Error(data?.error || "Failed to generate NDA");
      }
      const doc = data.document as GeneratedNDA;
      setDocument(doc);
      setVersions([doc]);
      setExpandedClauses(new Set());
      toast.success("NDA generated successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate NDA");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!document) return;
    setExportingFormat(format);
    try {
      const payload = ndaToLegalPayload(document);
      const blob = format === "docx"
        ? await createLegalDocxBlob(payload)
        : await createLegalPdfBlob(payload);
      const mimeType = format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
      const fileName = buildFileName(disclosingParty, format);
      const prepared = prepareBrowserDownload(blob, fileName, mimeType);
      triggerBrowserDownload(prepared);
      toast.success(`${format.toUpperCase()} download started`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Export failed");
    } finally {
      setExportingFormat(null);
    }
  };

  const saveVersion = () => {
    if (document) setVersions((prev) => [...prev, { ...document }]);
  };

  const revertToVersion = (index: number) => {
    const v = versions[index];
    if (v) {
      saveVersion();
      setDocument({ ...v });
      toast.success(`Reverted to Version ${index + 1}`);
    }
  };

  const startEditClause = (index: number) => {
    if (!document) return;
    setEditingClauseIndex(index);
    const c = document.clauses[index];
    setEditingClauseBody(
      c.body + (c.subClauses?.length ? "\n\n" + c.subClauses.map((sc) => `${sc.number} ${sc.body}`).join("\n") : "")
    );
  };

  const saveEditClause = () => {
    if (!document || editingClauseIndex === null) return;
    saveVersion();
    const updated = { ...document };
    updated.clauses = [...updated.clauses];
    updated.clauses[editingClauseIndex] = {
      ...updated.clauses[editingClauseIndex],
      body: editingClauseBody,
      subClauses: [],
    };
    setDocument(updated);
    setEditingClauseIndex(null);
    toast.success("Clause updated");
  };

  const removeClause = (index: number) => {
    if (!document) return;
    saveVersion();
    const updated = { ...document };
    updated.clauses = updated.clauses.filter((_, i) => i !== index).map((c, i) => ({ ...c, number: String(i + 1) }));
    setDocument(updated);
    toast.success("Clause removed");
  };

  const handleRegenerateClause = async (index: number) => {
    if (!document || !regenerateInstruction.trim()) return;
    setRegeneratingIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke("generate-legal-document", {
        body: {
          action: "regenerate-clause",
          clause: document.clauses[index],
          instruction: regenerateInstruction,
          documentContext: `NDA between ${disclosingParty} and ${receivingParty}, ${jurisdiction}`,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to regenerate clause");
      saveVersion();
      const updated = { ...document };
      updated.clauses = [...updated.clauses];
      updated.clauses[index] = data.document;
      setDocument(updated);
      setShowRegenerateInput(null);
      setRegenerateInstruction("");
      toast.success("Clause regenerated");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to regenerate clause");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const addClauseFromLibrary = (clauseTitle: string) => {
    if (!document) return;
    saveVersion();
    const updated = { ...document };
    updated.clauses = [
      ...updated.clauses,
      {
        number: String(updated.clauses.length + 1),
        title: clauseTitle,
        body: `[${clauseTitle} clause — click Edit to draft or use Regenerate to have AI generate this clause.]`,
        subClauses: [],
      },
    ];
    setDocument(updated);
    setAddClauseFrom(null);
    toast.success(`${clauseTitle} clause added`);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <ContractLimitDialog
          open={showLimitDialog}
          onClose={() => { setShowLimitDialog(false); void refetchPlan(); }}
          used={used}
          limit={limit}
          bonus={bonus}
        />
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Generate NDA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Professional non-disclosure agreement with full clause control.
          </p>
        </div>

        {!document ? (
          <div className="space-y-6">
            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                variant={mode === "create" ? "default" : "outline"}
                onClick={() => setMode("create")}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" /> Create New
              </Button>
              <Button
                variant={mode === "upload" ? "default" : "outline"}
                onClick={() => setMode("upload")}
                className="flex-1"
              >
                <FileUp className="mr-2 h-4 w-4" /> Upload & Review
              </Button>
            </div>

            {mode === "upload" ? (
              <DocumentUploadReview
                documentType="NDA"
                onDocumentReviewed={handleUploadReviewed}
                onCancel={() => setMode("create")}
              />
            ) : (
            <>
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Disclosing Party *</Label>
                  <Input value={disclosingParty} onChange={(e) => setDisclosingParty(e.target.value)} placeholder="e.g. Acme Ltd" />
                </div>
                <div className="space-y-2">
                  <Label>Receiving Party *</Label>
                  <Input value={receivingParty} onChange={(e) => setReceivingParty(e.target.value)} placeholder="e.g. Beta Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2 years" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="e.g. Business discussions and potential collaboration" />
              </div>

              <div className="space-y-2">
                <Label>NDA Type</Label>
                <div className="flex gap-2">
                  <Button variant={ndaType === "one-way" ? "default" : "outline"} size="sm" onClick={() => setNdaType("one-way")}>One-way</Button>
                  <Button variant={ndaType === "mutual" ? "default" : "outline"} size="sm" onClick={() => setNdaType("mutual")}>Mutual</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-primary font-semibold">Special Instructions</Label>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                  placeholder='e.g. "Make it strict", "Add penalties for breach", "Include carve-out for public information"'
                  className="border-primary/30"
                />
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {generating ? "Generating NDA…" : "Generate NDA"}
            </Button>
            </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setDocument(null)}>← Back to Form</Button>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} disabled={!!exportingFormat}>
                  {exportingFormat === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport("docx")} disabled={!!exportingFormat}>
                  {exportingFormat === "docx" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Word
                </Button>
              </div>
            </div>

            {document.warnings?.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Smart Legal Warnings
                </p>
                {document.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-destructive/80">⚠ {w.message}</p>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-xl font-bold text-foreground text-center">{document.title}</h2>
              <p className="text-center text-sm text-muted-foreground mt-1">{document.date}</p>
              <Separator className="my-4" />
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Disclosing Party:</span> {document.parties.disclosingParty}</p>
                <p><span className="font-semibold">Receiving Party:</span> {document.parties.receivingParty}</p>
              </div>
              {document.recitals && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recitals</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{document.recitals}</p>
                </div>
              )}
              {document.definitions?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Definitions</h3>
                  <div className="space-y-1.5">
                    {document.definitions.map((d, i) => (
                      <p key={i} className="text-sm"><span className="font-semibold">"{d.term}"</span> means {d.definition}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-foreground">Clauses</h3>
                <div className="relative">
                  <Button size="sm" variant="outline" onClick={() => setAddClauseFrom(addClauseFrom ? null : "open")}>
                    <Plus className="mr-2 h-4 w-4" /> Add Clause
                  </Button>
                  {addClauseFrom && (
                    <div className="absolute right-0 top-full mt-1 z-10 w-56 rounded-lg border border-border bg-card shadow-lg p-2 space-y-1">
                      {CLAUSE_LIBRARY.map((c) => (
                        <button key={c} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-muted transition-colors" onClick={() => addClauseFromLibrary(c)}>{c}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {document.clauses.map((clause, index) => (
                  <div key={`${clause.number}-${index}`} className="rounded-lg border border-border bg-background">
                    <button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors" onClick={() => toggleClause(index)}>
                      <span className="text-sm font-medium text-foreground">{clause.number}. {clause.title}</span>
                      {expandedClauses.has(index) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {expandedClauses.has(index) && (
                      <div className="px-4 pb-4 space-y-3">
                        {editingClauseIndex === index ? (
                          <div className="space-y-2">
                            <Textarea value={editingClauseBody} onChange={(e) => setEditingClauseBody(e.target.value)} rows={8} className="font-mono text-sm" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEditClause}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingClauseIndex(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{clause.body}</p>
                            {clause.subClauses?.map((sc, si) => (
                              <p key={si} className="text-sm text-foreground ml-4"><span className="font-semibold">{sc.number}</span> {sc.body}</p>
                            ))}
                          </>
                        )}
                        {editingClauseIndex !== index && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                            <Button size="sm" variant="outline" onClick={() => startEditClause(index)}><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowRegenerateInput(showRegenerateInput === index ? null : index)}><RefreshCcw className="mr-1 h-3 w-3" /> Regenerate</Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeClause(index)}><Trash2 className="mr-1 h-3 w-3" /> Remove</Button>
                          </div>
                        )}
                        {showRegenerateInput === index && (
                          <div className="flex gap-2 pt-2">
                            <Input value={regenerateInstruction} onChange={(e) => setRegenerateInstruction(e.target.value)} placeholder='e.g. "Make stricter"' className="flex-1" />
                            <Button size="sm" onClick={() => handleRegenerateClause(index)} disabled={regeneratingIndex === index}>
                              {regeneratingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              {document.governingLaw && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Governing Law</h3>
                  <p className="text-sm text-foreground">{document.governingLaw}</p>
                </div>
              )}
              {document.signatureBlock && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Execution</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{document.signatureBlock}</p>
                </div>
              )}
            </div>

            {versions.length > 1 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-foreground mb-3">Version History</h3>
                <div className="space-y-2">
                  {versions.map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                      <span className="text-sm text-foreground">Version {i + 1}{i === versions.length - 1 ? " (current)" : ""}</span>
                      {i < versions.length - 1 && (
                        <Button size="sm" variant="outline" onClick={() => revertToVersion(i)}><Undo2 className="mr-1 h-3 w-3" /> Revert</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => handleExport("pdf")} disabled={!!exportingFormat}>
                {exportingFormat === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Download PDF
              </Button>
              <Button variant="outline" onClick={() => handleExport("docx")} disabled={!!exportingFormat}>
                {exportingFormat === "docx" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Download Word
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default GenerateNDA;
