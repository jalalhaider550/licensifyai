import { useState, useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { FileCheck, FilePlus, Download, Loader2, FileText, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import jsPDF from "jspdf";

interface Client {
  id: string;
  company_name: string;
  jurisdiction: string;
}

const documentTypes = [
  { id: "aml", name: "AML Policy", description: "Anti-Money Laundering policy document tailored to your client's business model." },
  { id: "compliance", name: "Compliance Manual", description: "Comprehensive compliance procedures and controls framework." },
  { id: "risk", name: "Risk Management Framework", description: "Risk assessment and mitigation strategies for regulatory requirements." },
  { id: "business-plan", name: "Business Plan", description: "Regulatory-focused business plan for license applications." },
  { id: "governance", name: "Governance Documentation", description: "Corporate governance structure and key personnel documentation." },
];

const ComplianceDocuments = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clients")
      .select("id, company_name, jurisdiction")
      .order("company_name")
      .then(({ data }) => setClients(data || []));
  }, [user]);

  const handleGenerate = async (docType: typeof documentTypes[0]) => {
    if (!selectedClient) {
      toast.error("Please select a client first");
      return;
    }

    setGenerating(docType.id);

    try {
      // Fetch client data
      const [clientRes, directorsRes, shareholdersRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", selectedClient).single(),
        supabase.from("directors").select("*").eq("client_id", selectedClient),
        supabase.from("shareholders").select("*").eq("client_id", selectedClient),
      ]);

      const clientData = clientRes.data;
      const directors = directorsRes.data || [];
      const shareholders = shareholdersRes.data || [];

      if (!clientData) {
        toast.error("Client data not found");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
        body: {
          documentType: docType.id,
          documentName: docType.name,
          client: {
            company_name: clientData.company_name,
            jurisdiction: clientData.jurisdiction,
            registration_number: clientData.registration_number,
            registered_address: clientData.registered_address,
            services: clientData.services,
            contact_email: clientData.contact_email,
            contact_phone: clientData.contact_phone,
            incorporation_date: clientData.incorporation_date,
          },
          directors: directors.map(d => ({ full_name: d.full_name, role: d.role })),
          shareholders: shareholders.map(s => ({ name: s.name, percentage: s.percentage })),
        },
      });

      if (error) throw error;

      setEditorTitle(`${docType.name} — ${clientData.company_name}`);
      setEditorContent(data.content || "Document generation failed. Please try again.");
      setEditorOpen(true);
      toast.success(`${docType.name} generated successfully`);
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate document");
    } finally {
      setGenerating(null);
    }
  };

  const exportAsWord = async () => {
    const paragraphs = editorContent.split("\n").map(line => {
      if (line.startsWith("# ")) {
        return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
      }
      if (line.startsWith("## ")) {
        return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
      }
      if (line.startsWith("### ")) {
        return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
      }
      return new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
        spacing: { after: 120 },
      });
    });

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

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
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 20, y);
      y += 5;
    }

    pdf.save(`${editorTitle.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`);
    toast.success("Exported as PDF");
  };

  const selectedClientName = clients.find(c => c.id === selectedClient)?.company_name;

  return (
    <AppShell>
      <div className="p-6 lg:p-10">
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
                    <Download className="mr-1 h-3 w-3" />
                    Word
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportAsPDF}>
                    <Download className="mr-1 h-3 w-3" />
                    PDF
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
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Compliance Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and manage regulatory compliance documents using AI.
          </p>
        </div>

        {/* Client selector */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <label className="text-sm font-medium text-foreground block mb-2">Select Client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name} ({c.jurisdiction})</option>
            ))}
          </select>
          {selectedClient && (
            <p className="mt-2 text-xs text-muted-foreground">
              Documents will be generated using <span className="font-medium text-foreground">{selectedClientName}</span>'s profile data.
            </p>
          )}
        </div>

        {/* Document types */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documentTypes.map((docType) => (
            <div
              key={docType.id}
              className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{docType.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{docType.description}</p>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => handleGenerate(docType)}
                  disabled={generating === docType.id || !selectedClient}
                  className="w-full"
                >
                  {generating === docType.id ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FilePlus className="mr-1 h-3 w-3" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-base font-semibold text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select a client above and click Generate on any document type. The AI will use your client's stored company data —
            including directors, shareholders, services, and jurisdiction — to create a structured first draft. You can then
            review and edit the document in the built-in editor before exporting as Word or PDF.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default ComplianceDocuments;
