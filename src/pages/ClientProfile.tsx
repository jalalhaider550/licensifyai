import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Upload, FileText, Building2, Users as UsersIcon, Phone,
  Loader2, Download, X, Brain, BookOpen, FolderOpen, Briefcase,
  FileBarChart, FilePlus, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import jsPDF from "jspdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOCUMENT_TYPES = [
  { value: "business-model", label: "Business Model Document", icon: Briefcase, aiProcess: true },
  { value: "pitch-deck", label: "Pitch Deck", icon: FileBarChart, aiProcess: true },
  { value: "company-overview", label: "Company Overview", icon: Building2, aiProcess: true },
  { value: "draft-business-plan", label: "Draft Business Plan", icon: BookOpen, aiProcess: true },
  { value: "supporting-document", label: "Supporting Document", icon: FilePlus, aiProcess: false },
] as const;

type DocTypeValue = (typeof DOCUMENT_TYPES)[number]["value"];

const ClientProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [directors, setDirectors] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocTypeValue>("business-model");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    const fetchData = async () => {
      const [{ data: c }, { data: d }, { data: s }, { data: docs }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("directors").select("*").eq("client_id", id),
        supabase.from("shareholders").select("*").eq("client_id", id),
        supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      ]);
      setClient(c);
      setDirectors(d || []);
      setShareholders(s || []);
      setDocuments(docs || []);
      setLoading(false);
    };
    fetchData();
  }, [user, id]);

  const isBusy = uploading || extracting || generatingPlan;

  const processFile = async (file: File) => {
    if (!client || !user) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, Word, or text file.");
      return;
    }

    const docTypeMeta = DOCUMENT_TYPES.find((t) => t.value === selectedDocType)!;
    setUploading(true);

    try {
      // 1. Extract text
      toast.info(`Reading ${docTypeMeta.label}…`);
      let documentText = "";
      try {
        documentText = await extractTextFromFile(file);
      } catch (parseErr: any) {
        console.error("Parse error:", parseErr);
        toast.error("Could not read the document. Please try a different file format.");
        setUploading(false);
        return;
      }

      if (!documentText || documentText.trim().length < 20) {
        toast.error("The document appears to be empty or could not be read.");
        setUploading(false);
        return;
      }

      // 2. Upload to storage
      const filePath = `${user.id}/${id}/${selectedDocType}-${Date.now()}-${file.name}`;
      await supabase.storage.from("documents").upload(filePath, file);

      // 3. Save document record
      await supabase.from("documents").insert({
        client_id: id!,
        user_id: user.id,
        name: `${docTypeMeta.label}: ${file.name}`,
        file_type: file.type,
        storage_path: filePath,
        ai_status: docTypeMeta.aiProcess ? "pending" : "uploaded",
      });

      // Refresh documents list
      const { data: updatedDocs } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      setDocuments(updatedDocs || []);

      setUploading(false);

      // 4. If AI-processable doc type, extract and generate business plan
      if (docTypeMeta.aiProcess) {
        setExtracting(true);
        toast.info("AI is analyzing your document…");

        const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
          body: {
            action: "extract-business-model",
            documentText: documentText.slice(0, 30000),
            clientName: client.company_name,
          },
        });

        if (error) throw error;

        let parsed;
        try {
          const content = data.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        } catch {
          parsed = { raw_extraction: data.content };
        }

        setExtractedData(parsed);
        setExtracting(false);
        toast.success("Document analyzed! Generating business plan…");

        // Auto-generate business plan
        await generateBusinessPlan(parsed);
      } else {
        toast.success("Document uploaded successfully.");
      }
    } catch (err: any) {
      console.error("Upload/extract error:", err);
      toast.error(err.message || "Failed to process document");
      setUploading(false);
      setExtracting(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && !isBusy) processFile(file);
    },
    [isBusy, client, user, selectedDocType]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const generateBusinessPlan = async (extractedInfo?: any) => {
    if (!client) return;
    setGeneratingPlan(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
        body: {
          action: "generate-business-plan",
          client: {
            company_name: client.company_name,
            jurisdiction: client.jurisdiction,
            registration_number: client.registration_number,
            registered_address: client.registered_address,
            services: client.services,
            contact_email: client.contact_email,
            incorporation_date: client.incorporation_date,
          },
          directors: directors.map((d) => ({ full_name: d.full_name, role: d.role })),
          shareholders: shareholders.map((s) => ({ name: s.name, percentage: s.percentage })),
          extractedData: extractedInfo || extractedData,
        },
      });

      if (error) throw error;

      setEditorTitle(`Business Plan — ${client.company_name}`);
      setEditorContent(data.content || "Generation failed. Please try again.");
      setEditorOpen(true);
      toast.success("Business plan generated! Review and edit below.");
    } catch (err: any) {
      console.error("Business plan error:", err);
      toast.error(err.message || "Failed to generate business plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const exportAsWord = async () => {
    const paragraphs = editorContent.split("\n").map((line) => {
      if (line.startsWith("# ")) return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
      if (line.startsWith("## ")) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
      if (line.startsWith("### ")) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
      return new Paragraph({ children: [new TextRun({ text: line, size: 24 })], spacing: { after: 120 } });
    });
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${editorTitle.replace(/[^a-zA-Z0-9 ]/g, "")}.docx`);
    toast.success("Exported as Word document");
  };

  const exportAsPDF = () => {
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(editorContent, 170);
    let y = 20;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    for (const line of lines) {
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, 20, y);
      y += 5;
    }
    pdf.save(`${editorTitle.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`);
    toast.success("Exported as PDF");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center p-20">
          <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <div className="p-6 text-center text-muted-foreground">Client not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Editor overlay */}
        {editorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border p-3 sm:p-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <h2 className="font-display text-sm font-semibold text-foreground truncate">{editorTitle}</h2>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={exportAsWord}>
                    <Download className="mr-1 h-3 w-3" /> Word
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportAsPDF}>
                    <Download className="mr-1 h-3 w-3" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditorOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="w-full h-full resize-none p-4 sm:p-6 text-sm leading-relaxed text-foreground bg-card font-mono focus:outline-none"
                  style={{ minHeight: "60vh" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-3 w-3" /> Back to Clients
          </Link>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{client.company_name}</h1>
                <p className="mt-1 text-sm text-muted-foreground font-mono">
                  {client.jurisdiction} {client.registration_number ? `· Reg. ${client.registration_number}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/compliance">
                  <FileText className="mr-1 h-4 w-4" /> Generate Compliance Docs
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Upload documents for this client</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload a business model, pitch deck, company overview, or draft plan and the AI will read it and generate a business plan automatically.
                  </p>
                </div>
                <Button onClick={() => document.getElementById("upload-documents-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  <Upload className="mr-1 h-4 w-4" /> Upload Documents
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Company Info Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Company Details</h3>
            </div>
            <dl className="space-y-3 text-sm">
              {client.incorporation_date && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Incorporation Date</dt>
                  <dd className="mt-0.5 font-mono text-foreground">{client.incorporation_date}</dd>
                </div>
              )}
              {client.registered_address && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Registered Address</dt>
                  <dd className="mt-0.5 text-foreground">{client.registered_address}</dd>
                </div>
              )}
              {client.services && client.services.length > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Services</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {client.services.map((s: string) => (
                      <span key={s} className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Ownership Structure</h3>
            </div>
            {shareholders.length > 0 ? (
              <div className="space-y-2 mb-4">
                {shareholders.map((sh) => (
                  <div key={sh.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{sh.name}</span>
                    <span className="font-mono text-muted-foreground">{sh.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No shareholders added yet.</p>
            )}
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Directors</h4>
            {directors.length > 0 ? (
              <ul className="space-y-1">
                {directors.map((d) => (
                  <li key={d.id} className="text-sm text-foreground">{d.full_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No directors added yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Contact Information</h3>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Email</dt>
                <dd className="mt-0.5 text-foreground">{client.contact_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Phone</dt>
                <dd className="mt-0.5 font-mono text-foreground">{client.contact_phone || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ====== UPLOAD DOCUMENTS SECTION ====== */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Upload Documents</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Select the type of document to upload. Business-related documents will be read by AI to generate a licensing-ready business plan.
          </p>

          {/* Step 1: Select document type */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Step 1 — Select Document Type
            </label>
            <Select value={selectedDocType} onValueChange={(v) => setSelectedDocType(v as DocTypeValue)}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Choose document type…" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((dt) => {
                  const Icon = dt.icon;
                  return (
                    <SelectItem key={dt.value} value={dt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {dt.label}
                        {dt.aiProcess && (
                          <span className="ml-1 text-[10px] font-semibold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">AI</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Upload file — drag-and-drop zone */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Step 2 — Upload File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isBusy && fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200 p-6 sm:p-8 text-center
                ${dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
                ${isBusy ? "pointer-events-none opacity-60" : ""}
              `}
            >
              {isBusy ? (
                <div className="flex flex-col items-center gap-3">
                  {uploading && (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium text-foreground">Uploading document…</p>
                    </>
                  )}
                  {extracting && (
                    <>
                      <Brain className="h-8 w-8 animate-pulse text-primary" />
                      <p className="text-sm font-medium text-foreground">AI is reading your document…</p>
                      <p className="text-xs text-muted-foreground">Extracting business information</p>
                    </>
                  )}
                  {generatingPlan && (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium text-foreground">Generating business plan…</p>
                      <p className="text-xs text-muted-foreground">This may take a minute</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drag & drop your file here, or <span className="text-primary underline underline-offset-2">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Accepted formats: PDF, DOCX, TXT · Max 20 MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI-Extracted Data Display */}
          {extractedData && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5 mb-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI-Extracted Business Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {extractedData.services_offered && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Services Offered</dt>
                    <dd className="text-foreground">
                      {Array.isArray(extractedData.services_offered)
                        ? extractedData.services_offered.join(", ")
                        : extractedData.services_offered}
                    </dd>
                  </div>
                )}
                {extractedData.revenue_model && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Revenue Model</dt>
                    <dd className="text-foreground">{extractedData.revenue_model}</dd>
                  </div>
                )}
                {extractedData.target_customers && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Customers</dt>
                    <dd className="text-foreground">{extractedData.target_customers}</dd>
                  </div>
                )}
                {extractedData.technology_platform && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Technology Platform</dt>
                    <dd className="text-foreground">{extractedData.technology_platform}</dd>
                  </div>
                )}
                {extractedData.operational_structure && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Operational Structure</dt>
                    <dd className="text-foreground">{extractedData.operational_structure}</dd>
                  </div>
                )}
                {extractedData.compliance_considerations && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Compliance Considerations</dt>
                    <dd className="text-foreground">{extractedData.compliance_considerations}</dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Generate button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              onClick={() => generateBusinessPlan()}
              disabled={isBusy}
              className="gap-2"
            >
              {generatingPlan ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><FileText className="h-4 w-4" /> Generate Business Plan</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {extractedData
                ? "Uses extracted data + client profile to generate a detailed plan."
                : "Upload a document first for best results, or generate from client data only."}
            </p>
          </div>
        </div>

        {/* ====== DOCUMENTS LIST ====== */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Client Documents</h2>
          </div>
          <div className="rounded-xl border border-border bg-card">
            {documents.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No documents uploaded yet. Use the upload section above to add files for this client.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{doc.file_type || "Unknown"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider shrink-0 ${
                      doc.ai_status === "verified"
                        ? "bg-success/10 text-success-foreground border border-success/20"
                        : doc.ai_status === "generated"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : doc.ai_status === "uploaded"
                        ? "bg-muted text-muted-foreground border border-border"
                        : "bg-warning/10 text-warning-foreground border border-warning/20"
                    }`}>
                      {doc.ai_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ClientProfile;
