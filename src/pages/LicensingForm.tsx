import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Upload, FileText, Building2, Users, Briefcase, Shield,
  DollarSign, Loader2, Brain, AlertTriangle, Download, X, Check,
  PoundSterling, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import jsPDF from "jspdf";

const LICENSE_META: Record<string, { name: string; jurisdiction: "UK" | "US"; authority: string; currency: string; currencySymbol: string }> = {
  "uk-pi": { name: "Payment Institution License", jurisdiction: "UK", authority: "FCA", currency: "GBP", currencySymbol: "£" },
  "uk-emi": { name: "Electronic Money Institution License", jurisdiction: "UK", authority: "FCA", currency: "GBP", currencySymbol: "£" },
  "uk-crypto": { name: "Crypto Asset Registration", jurisdiction: "UK", authority: "FCA", currency: "GBP", currencySymbol: "£" },
  "us-msb": { name: "MSB Registration", jurisdiction: "US", authority: "FinCEN", currency: "USD", currencySymbol: "$" },
  "us-mtl": { name: "Money Transmitter License", jurisdiction: "US", authority: "State Regulators", currency: "USD", currencySymbol: "$" },
};

interface DirectorEntry { name: string; nationality: string; role: string }
interface ShareholderEntry { name: string; percentage: string; country: string }

const SECTIONS = ["firm", "activities", "directors", "shareholders", "financial", "compliance", "upload"] as const;
type Section = (typeof SECTIONS)[number];
const SECTION_LABELS: Record<Section, string> = {
  firm: "Firm Details",
  activities: "Business Activities",
  directors: "Directors & Management",
  shareholders: "Shareholders / Ownership",
  financial: "Financial Information",
  compliance: "Compliance & AML",
  upload: "Document Upload & AI",
};
const SECTION_ICONS: Record<Section, React.ElementType> = {
  firm: Building2,
  activities: Briefcase,
  directors: Users,
  shareholders: Users,
  financial: DollarSign,
  compliance: Shield,
  upload: Upload,
};

const LicensingForm = () => {
  const { clientId, licenseType } = useParams();
  const { user } = useAuth();
  const meta = LICENSE_META[licenseType || ""] || LICENSE_META["uk-pi"];

  const [activeSection, setActiveSection] = useState<Section>("firm");
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firm, setFirm] = useState({ companyName: "", regNumber: "", address: "", website: "", contactEmail: "" });
  const [activities, setActivities] = useState({ services: "", targetCustomers: "", markets: "", revenueModel: "" });
  const [directors, setDirectors] = useState<DirectorEntry[]>([{ name: "", nationality: "", role: "Director" }]);
  const [shareholdersList, setShareholdersList] = useState<ShareholderEntry[]>([{ name: "", percentage: "", country: "" }]);
  const [financial, setFinancial] = useState({ capitalAmount: "", sourceOfFunds: "", expectedVolume: "" });
  const [compliance, setCompliance] = useState({ complianceOfficer: "", amlProgram: "", riskManagement: "" });

  // AI / upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");

  // Missing info
  const [missingItems, setMissingItems] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !clientId) return;
    const load = async () => {
      const [{ data: c }, { data: dirs }, { data: shs }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("directors").select("*").eq("client_id", clientId),
        supabase.from("shareholders").select("*").eq("client_id", clientId),
      ]);
      if (c) {
        setClient(c);
        setFirm({
          companyName: c.company_name || "",
          regNumber: c.registration_number || "",
          address: c.registered_address || "",
          website: "",
          contactEmail: c.contact_email || "",
        });
        if (c.services?.length) setActivities((a) => ({ ...a, services: c.services.join(", ") }));
      }
      if (dirs?.length) {
        setDirectors(dirs.map((d: any) => ({ name: d.full_name, nationality: "", role: d.role || "Director" })));
      }
      if (shs?.length) {
        setShareholdersList(shs.map((s: any) => ({ name: s.name, percentage: String(s.percentage), country: "" })));
      }
      setLoading(false);
    };
    load();
  }, [user, clientId]);

  // Compute missing items whenever form changes
  useEffect(() => {
    const missing: string[] = [];
    if (!firm.companyName) missing.push("Company name not provided");
    if (!firm.regNumber) missing.push("Company registration number missing");
    if (!firm.address) missing.push("Registered address missing");
    if (!firm.contactEmail) missing.push("Contact email missing");
    if (!activities.services) missing.push("Services offered not specified");
    if (!activities.revenueModel) missing.push("Revenue model not described");
    if (directors.every((d) => !d.name)) missing.push("No directors added");
    if (directors.some((d) => d.name && !d.nationality)) missing.push("Director nationality missing");
    if (shareholdersList.every((s) => !s.name)) missing.push("No shareholders added");
    if (!financial.capitalAmount) missing.push("Capital amount not provided");
    if (!financial.sourceOfFunds) missing.push("Source of funds not specified");
    if (!compliance.complianceOfficer) missing.push("Compliance / AML officer not assigned");
    if (!compliance.amlProgram) missing.push("AML program not described");
    setMissingItems(missing);
  }, [firm, activities, directors, shareholdersList, financial, compliance]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !clientId) return;
    setUploading(true);
    try {
      toast.info("Reading document…");
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 20) {
        toast.error("Document appears empty.");
        setUploading(false);
        return;
      }

      // Upload to storage
      const filePath = `${user.id}/${clientId}/license-${licenseType}-${Date.now()}-${file.name}`;
      await supabase.storage.from("documents").upload(filePath, file);
      await supabase.from("documents").insert({
        client_id: clientId,
        user_id: user.id,
        name: `${meta.name}: ${file.name}`,
        file_type: file.type,
        storage_path: filePath,
        ai_status: "pending",
      });

      // AI extraction via tool calling
      toast.info("AI is extracting business information…");
      const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
        body: {
          action: "extract-form-fields",
          documentText: text.slice(0, 30000),
          clientName: firm.companyName || client?.company_name,
          licenseType: meta.name,
        },
      });
      if (error) throw error;

      let parsed: any = {};
      try {
        const content = data.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch {
        parsed = {};
      }

      // Auto-fill form fields
      if (parsed.company_name) setFirm((f) => ({ ...f, companyName: parsed.company_name }));
      if (parsed.registration_number) setFirm((f) => ({ ...f, regNumber: parsed.registration_number }));
      if (parsed.address) setFirm((f) => ({ ...f, address: parsed.address }));
      if (parsed.website) setFirm((f) => ({ ...f, website: parsed.website }));
      if (parsed.contact_email) setFirm((f) => ({ ...f, contactEmail: parsed.contact_email }));
      if (parsed.services) setActivities((a) => ({ ...a, services: Array.isArray(parsed.services) ? parsed.services.join(", ") : parsed.services }));
      if (parsed.target_customers) setActivities((a) => ({ ...a, targetCustomers: parsed.target_customers }));
      if (parsed.markets) setActivities((a) => ({ ...a, markets: parsed.markets }));
      if (parsed.revenue_model) setActivities((a) => ({ ...a, revenueModel: parsed.revenue_model }));
      if (parsed.capital_amount) setFinancial((f) => ({ ...f, capitalAmount: parsed.capital_amount }));
      if (parsed.source_of_funds) setFinancial((f) => ({ ...f, sourceOfFunds: parsed.source_of_funds }));
      if (parsed.expected_volume) setFinancial((f) => ({ ...f, expectedVolume: parsed.expected_volume }));
      if (parsed.compliance_officer) setCompliance((c) => ({ ...c, complianceOfficer: parsed.compliance_officer }));
      if (parsed.aml_program) setCompliance((c) => ({ ...c, amlProgram: parsed.aml_program }));
      if (parsed.risk_management) setCompliance((c) => ({ ...c, riskManagement: parsed.risk_management }));
      if (Array.isArray(parsed.directors) && parsed.directors.length) {
        setDirectors(parsed.directors.map((d: any) => ({ name: d.name || "", nationality: d.nationality || "", role: d.role || "Director" })));
      }
      if (Array.isArray(parsed.shareholders) && parsed.shareholders.length) {
        setShareholdersList(parsed.shareholders.map((s: any) => ({ name: s.name || "", percentage: String(s.percentage || ""), country: s.country || "" })));
      }

      toast.success("Form fields auto-filled from document!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generateBusinessPlan = async () => {
    setGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
        body: {
          action: "generate-business-plan",
          client: {
            company_name: firm.companyName,
            jurisdiction: meta.jurisdiction,
            registration_number: firm.regNumber,
            registered_address: firm.address,
            services: activities.services.split(",").map((s) => s.trim()).filter(Boolean),
            contact_email: firm.contactEmail,
          },
          directors: directors.filter((d) => d.name).map((d) => ({ full_name: d.name, role: d.role })),
          shareholders: shareholdersList.filter((s) => s.name).map((s) => ({ name: s.name, percentage: Number(s.percentage) || 0 })),
          extractedData: {
            revenue_model: activities.revenueModel,
            target_customers: activities.targetCustomers,
            technology_platform: "",
            compliance_considerations: compliance.amlProgram,
            capital_amount: financial.capitalAmount,
            source_of_funds: financial.sourceOfFunds,
            compliance_officer: compliance.complianceOfficer,
          },
          licenseType: meta.name,
          currency: meta.currency,
        },
      });
      if (error) throw error;
      setEditorTitle(`${meta.name} — Business Plan — ${firm.companyName}`);
      setEditorContent(data.content || "Generation failed.");
      setEditorOpen(true);
      toast.success("Business plan generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate");
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
  };

  const exportAsPDF = () => {
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(editorContent, 170);
    let y = 20;
    pdf.setFontSize(10);
    for (const line of lines) {
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, 20, y);
      y += 5;
    }
    pdf.save(`${editorTitle.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const CurrencyIcon = meta.jurisdiction === "UK" ? PoundSterling : DollarSign;

  const addDirector = () => setDirectors([...directors, { name: "", nationality: "", role: "Director" }]);
  const addShareholder = () => setShareholdersList([...shareholdersList, { name: "", percentage: "", country: "" }]);

  const sectionComplete = (s: Section): boolean => {
    switch (s) {
      case "firm": return !!(firm.companyName && firm.regNumber && firm.address && firm.contactEmail);
      case "activities": return !!(activities.services && activities.revenueModel);
      case "directors": return directors.some((d) => d.name);
      case "shareholders": return shareholdersList.some((s) => s.name);
      case "financial": return !!(financial.capitalAmount && financial.sourceOfFunds);
      case "compliance": return !!(compliance.complianceOfficer && compliance.amlProgram);
      case "upload": return false;
    }
  };

  return (
    <AppShell>
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
                <Button size="sm" variant="outline" onClick={exportAsWord}><Download className="mr-1 h-3 w-3" /> Word</Button>
                <Button size="sm" variant="outline" onClick={exportAsPDF}><Download className="mr-1 h-3 w-3" /> PDF</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditorOpen(false)}><X className="h-4 w-4" /></Button>
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

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          to={`/select-license/${clientId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Back to License Selection
        </Link>

        <div className="mb-6">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{meta.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {meta.authority} · {meta.currency}
          </p>
        </div>

        {/* Missing items alert */}
        {missingItems.length > 0 && (
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">
                {missingItems.length} missing item{missingItems.length > 1 ? "s" : ""} for submission
              </h3>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2 text-xs text-muted-foreground">
              {missingItems.map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-warning shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar nav */}
          <nav className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {SECTIONS.map((s) => {
                const Icon = SECTION_ICONS[s];
                const complete = sectionComplete(s);
                const active = activeSection === s;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSection(s)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-all ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {SECTION_LABELS[s]}
                    {s !== "upload" && complete && <Check className="h-3 w-3 text-success ml-auto" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Form content */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              {activeSection === "firm" && (
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Firm Details</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Company Name</Label>
                      <Input value={firm.companyName} onChange={(e) => setFirm({ ...firm, companyName: e.target.value })} placeholder="NeoBank Ltd" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Registration Number</Label>
                      <Input value={firm.regNumber} onChange={(e) => setFirm({ ...firm, regNumber: e.target.value })} placeholder="12345678" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Registered Address</Label>
                      <Input value={firm.address} onChange={(e) => setFirm({ ...firm, address: e.target.value })} placeholder="1 Finsbury Square, London" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input value={firm.website} onChange={(e) => setFirm({ ...firm, website: e.target.value })} placeholder="https://…" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Email</Label>
                      <Input value={firm.contactEmail} onChange={(e) => setFirm({ ...firm, contactEmail: e.target.value })} placeholder="legal@company.com" />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "activities" && (
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Business Activities</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Services Offered</Label>
                      <Textarea value={activities.services} onChange={(e) => setActivities({ ...activities, services: e.target.value })} placeholder="Payment processing, e-wallets, cross-border transfers…" rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Target Customers</Label>
                      <Input value={activities.targetCustomers} onChange={(e) => setActivities({ ...activities, targetCustomers: e.target.value })} placeholder="SMEs, freelancers, consumers" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Markets Served</Label>
                      <Input value={activities.markets} onChange={(e) => setActivities({ ...activities, markets: e.target.value })} placeholder="UK, EU, International" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Revenue Model</Label>
                      <Textarea value={activities.revenueModel} onChange={(e) => setActivities({ ...activities, revenueModel: e.target.value })} placeholder="Transaction fees, subscription plans…" rows={2} />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "directors" && (
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Directors & Management</h2>
                  {directors.map((d, i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border p-3">
                      <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input value={d.name} onChange={(e) => { const n = [...directors]; n[i].name = e.target.value; setDirectors(n); }} placeholder="Jane Smith" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nationality</Label>
                        <Input value={d.nationality} onChange={(e) => { const n = [...directors]; n[i].nationality = e.target.value; setDirectors(n); }} placeholder="British" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Role</Label>
                        <Input value={d.role} onChange={(e) => { const n = [...directors]; n[i].role = e.target.value; setDirectors(n); }} placeholder="Director" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addDirector}>+ Add Director</Button>
                </div>
              )}

              {activeSection === "shareholders" && (
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Shareholders / Ownership</h2>
                  {shareholdersList.map((s, i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border p-3">
                      <div className="space-y-1.5">
                        <Label>Shareholder Name</Label>
                        <Input value={s.name} onChange={(e) => { const n = [...shareholdersList]; n[i].name = e.target.value; setShareholdersList(n); }} placeholder="John Doe" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ownership %</Label>
                        <Input value={s.percentage} onChange={(e) => { const n = [...shareholdersList]; n[i].percentage = e.target.value; setShareholdersList(n); }} placeholder="51" type="number" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Country of Residence</Label>
                        <Input value={s.country} onChange={(e) => { const n = [...shareholdersList]; n[i].country = e.target.value; setShareholdersList(n); }} placeholder="United Kingdom" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addShareholder}>+ Add Shareholder</Button>
                </div>
              )}

              {activeSection === "financial" && (
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Financial Information</h2>
                  <p className="text-xs text-muted-foreground">All values in {meta.currencySymbol} {meta.currency}.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Capital Amount ({meta.currencySymbol})</Label>
                      <div className="relative">
                        <CurrencyIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" value={financial.capitalAmount} onChange={(e) => setFinancial({ ...financial, capitalAmount: e.target.value })} placeholder="350,000" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Expected Transaction Volume ({meta.currencySymbol}/month)</Label>
                      <div className="relative">
                        <CurrencyIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" value={financial.expectedVolume} onChange={(e) => setFinancial({ ...financial, expectedVolume: e.target.value })} placeholder="1,000,000" />
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Source of Funds</Label>
                      <Textarea value={financial.sourceOfFunds} onChange={(e) => setFinancial({ ...financial, sourceOfFunds: e.target.value })} placeholder="Venture capital, retained profits…" rows={2} />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "compliance" && (
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Compliance & AML</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Compliance / AML Officer</Label>
                      <Input value={compliance.complianceOfficer} onChange={(e) => setCompliance({ ...compliance, complianceOfficer: e.target.value })} placeholder="Full name of MLRO / Compliance Officer" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>AML Program Summary</Label>
                      <Textarea value={compliance.amlProgram} onChange={(e) => setCompliance({ ...compliance, amlProgram: e.target.value })} placeholder="Describe KYC, CDD, transaction monitoring…" rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Risk Management Process</Label>
                      <Textarea value={compliance.riskManagement} onChange={(e) => setCompliance({ ...compliance, riskManagement: e.target.value })} placeholder="Describe risk assessment framework…" rows={3} />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "upload" && (
                <div className="space-y-5">
                  <h2 className="font-display text-lg font-semibold text-foreground">Document Upload & AI Auto-Fill</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload a document describing the fintech business model (PDF or Word). AI will read it and auto-fill the form fields above.
                  </p>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                  <button
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-all ${uploading ? "pointer-events-none opacity-60 border-primary" : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"}`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Brain className="h-8 w-8 animate-pulse text-primary" />
                        <p className="text-sm font-medium text-foreground">AI is reading and extracting data…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Drop your file here or <span className="text-primary underline">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT · Max 20 MB</p>
                      </div>
                    )}
                  </button>

                  <div className="border-t border-border pt-5">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Generate Business Plan</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Use the form data to generate a comprehensive regulatory business plan.
                    </p>
                    <Button onClick={generateBusinessPlan} disabled={generatingPlan || uploading} className="gap-2">
                      {generatingPlan ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                      ) : (
                        <><FileText className="h-4 w-4" /> Generate Business Plan</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Section navigation */}
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={SECTIONS.indexOf(activeSection) === 0}
                onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(activeSection) - 1])}
              >
                <ArrowLeft className="mr-1 h-3 w-3" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={SECTIONS.indexOf(activeSection) === SECTIONS.length - 1}
                onClick={() => setActiveSection(SECTIONS[SECTIONS.indexOf(activeSection) + 1])}
              >
                Next <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default LicensingForm;
