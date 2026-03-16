import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Building2, Users as UsersIcon, Phone, Loader2, Download, X, Brain, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import jsPDF from "jspdf";

const ClientProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [directors, setDirectors] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Business model upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

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
        supabase.from("documents").select("*").eq("client_id", id),
      ]);
      setClient(c);
      setDirectors(d || []);
      setShareholders(s || []);
      setDocuments(docs || []);
      setLoading(false);
    };
    fetchData();
  }, [user, id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client || !user) return;

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

    setUploading(true);

    try {
      // Extract text from the document using proper parsers
      toast.info("Reading document content…");
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
        toast.error("The document appears to be empty or could not be read. Please try a different file.");
        setUploading(false);
        return;
      }

      // Upload file to storage for record keeping
      const filePath = `${user.id}/${id}/business-model-${Date.now()}-${file.name}`;
      await supabase.storage.from("documents").upload(filePath, file);

      // Store reference in documents table
      await supabase.from("documents").insert({
        client_id: id!,
        user_id: user.id,
        name: `Business Model: ${file.name}`,
        file_type: file.type,
        storage_path: filePath,
        ai_status: "pending",
      });

      // Refresh documents list
      const { data: updatedDocs } = await supabase.from("documents").select("*").eq("client_id", id!);
      setDocuments(updatedDocs || []);

      setUploading(false);
      setExtracting(true);
      toast.info("AI is analyzing your document…");

      // Send extracted text to AI for business model extraction
      const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
        body: {
          action: "extract-business-model",
          documentText: documentText.slice(0, 30000),
          clientName: client.company_name,
        },
      });

      if (error) throw error;

      // Parse the extracted data
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
      toast.success("Document analyzed! Now generating your business plan…");

      // Auto-generate business plan after extraction
      await generateBusinessPlan(parsed);
    } catch (err: any) {
      console.error("Upload/extract error:", err);
      toast.error(err.message || "Failed to process document");
      setUploading(false);
      setExtracting(false);
    }

    // Reset file input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      <div className="p-6 lg:p-8">
        {/* Editor overlay */}
        {editorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-sm font-semibold text-foreground">{editorTitle}</h2>
                </div>
                <div className="flex items-center gap-2">
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
                  className="w-full h-full resize-none p-6 text-sm leading-relaxed text-foreground bg-card font-mono focus:outline-none"
                  style={{ minHeight: "60vh" }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-3 w-3" /> Back to Clients
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{client.company_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground font-mono">
                {client.jurisdiction} {client.registration_number ? `· Reg. ${client.registration_number}` : ""}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || extracting || generatingPlan}>
                <Upload className="mr-1 h-4 w-4" /> Upload Business Document
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/compliance">
                  <FileText className="mr-1 h-4 w-4" /> Generate Documents
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
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

          <div className="rounded-xl border border-border bg-card p-5">
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

          <div className="rounded-xl border border-border bg-card p-5">
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

        {/* Business Model Document Upload */}
        <div id="business-model-upload" className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Business Model Document</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Upload a fintech business model file and Licensify AI will read it, extract key details, and generate a regulatory-ready business plan in the editor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || extracting || generatingPlan}
              className="gap-2"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading document…</>
              ) : extracting ? (
                <><Brain className="h-4 w-4 animate-pulse" /> Reading with AI…</>
              ) : generatingPlan ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating business plan…</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload Document</>
              )}
            </Button>
            <span className="text-xs text-muted-foreground self-center">Accepted: PDF, DOCX, DOC, TXT · Max 20MB</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Best results: upload a PDF or DOCX containing the company overview, services, revenue model, target customers, and compliance approach.
          </p>

          {/* Extracted Data Display */}
          {extractedData && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 mb-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI-Extracted Business Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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

          {/* Generate Business Plan Button */}
          <Button
            onClick={() => generateBusinessPlan()}
            disabled={generatingPlan}
            className="gap-2"
          >
            {generatingPlan ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating Business Plan…</>
            ) : (
              <><FileText className="h-4 w-4" /> Generate Business Plan</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {extractedData
              ? "AI will use the extracted data combined with client profile to generate a detailed business plan."
              : "You can generate a business plan from the client profile data, or upload a business document first for better results."}
          </p>
        </div>

        {/* Documents */}
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Documents</h2>
          <div className="rounded-xl border border-border bg-card">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No documents uploaded yet. Upload files to get started with AI extraction.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Status</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{doc.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.file_type || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          doc.ai_status === "verified"
                            ? "bg-success/10 text-success-foreground border border-success/20"
                            : doc.ai_status === "generated"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-warning/10 text-warning-foreground border border-warning/20"
                        }`}>
                          {doc.ai_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ClientProfile;
