import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  BriefcaseBusiness,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";
import { ClientLicensingWorkspace } from "@/components/app/ClientLicensingWorkspace";
import { ClientLegalCaseWorkspace } from "@/components/app/ClientLegalCaseWorkspace";

interface PortalData {
  client: any;
  cases: any[];
  caseActions: any[];
  caseDocuments: any[];
  directors: any[];
  shareholders: any[];
  documents: any[];
  messages: any[];
}

const ClientPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const documentInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [data, setData] = useState<PortalData>({ client: null, cases: [], caseActions: [], caseDocuments: [], directors: [], shareholders: [], documents: [], messages: [] });
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<"licensing" | "legal">("licensing");
  const [activeTab, setActiveTab] = useState("company");

  // Form states
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendingAttachment, setSendingAttachment] = useState(false);
  const [newDirector, setNewDirector] = useState({ full_name: "", role: "Director" });
  const [newShareholder, setNewShareholder] = useState({ name: "", percentage: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Editable client fields
  const [form, setForm] = useState({
    company_name: "",
    registration_number: "",
    registered_address: "",
    contact_email: "",
    contact_phone: "",
    services: [] as string[],
    business_description: "",
  });

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    validateAndLoad();
  }, [token]);

  const validateAndLoad = async () => {
    // Validate token via security-definer RPC (does not expose token list)
    const { data: rows, error } = await (supabase as any).rpc("validate_client_access_token", { _token: token! });
    const tokenData = Array.isArray(rows) ? rows[0] : rows;

    if (error || !tokenData?.client_id) {
      setValid(false);
      setLoading(false);
      return;
    }

    setValid(true);
    setClientId(tokenData.client_id);
    await loadData(tokenData.client_id);
    setLoading(false);
  };

  const loadData = async (cid: string) => {
    const [{ data: c }, { data: d }, { data: s }, { data: docs }, { data: msgs }, { data: cases }, { data: caseActions }, { data: caseDocs }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", cid).single(),
      supabase.from("directors").select("*").eq("client_id", cid),
      supabase.from("shareholders").select("*").eq("client_id", cid),
      supabase.from("documents").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
      supabase.from("portal_messages").select("*").eq("client_id", cid).order("created_at", { ascending: true }),
      (supabase as any).rpc("get_client_portal_cases", { _token: token }),
      supabase.from("case_actions").select("*").order("created_at", { ascending: false }),
      supabase.from("case_documents").select("*").order("created_at", { ascending: false }),
    ]);

    const nextCases = cases || [];
    setData({ client: c, cases: nextCases, caseActions: caseActions || [], caseDocuments: caseDocs || [], directors: d || [], shareholders: s || [], documents: docs || [], messages: msgs || [] });
    setSelectedCaseId((current) => current || nextCases[0]?.id || "");
    if (c) {
      setForm({
        company_name: c.company_name || "",
        registration_number: c.registration_number || "",
        registered_address: c.registered_address || "",
        contact_email: c.contact_email || "",
        contact_phone: c.contact_phone || "",
        services: c.services || [],
        business_description: "",
      });
    }
  };

  // Realtime messages
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`portal-messages-${clientId}-${selectedCaseId || "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portal_messages", filter: `client_id=eq.${clientId}` }, (payload) => {
        if (selectedCaseId && payload.new.case_id !== selectedCaseId) return;
        setData((prev) => ({ ...prev, messages: [...prev.messages, payload.new] }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, selectedCaseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  const saveCompanyInfo = async () => {
    if (!clientId) return;
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        company_name: form.company_name,
        registration_number: form.registration_number,
        registered_address: form.registered_address,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        services: form.services,
      })
      .eq("id", clientId);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Company information saved!");
  };

  const addDirector = async () => {
    if (!clientId || !newDirector.full_name.trim()) return;
    const { error } = await supabase.from("directors").insert({
      client_id: clientId,
      full_name: newDirector.full_name,
      role: newDirector.role || "Director",
    });
    if (error) { toast.error("Failed to add director"); return; }
    setNewDirector({ full_name: "", role: "Director" });
    await loadData(clientId);
    toast.success("Director added!");
  };

  const addShareholder = async () => {
    if (!clientId || !newShareholder.name.trim()) return;
    const { error } = await supabase.from("shareholders").insert({
      client_id: clientId,
      name: newShareholder.name,
      percentage: newShareholder.percentage,
    });
    if (error) { toast.error("Failed to add shareholder"); return; }
    setNewShareholder({ name: "", percentage: 0 });
    await loadData(clientId);
    toast.success("Shareholder added!");
  };

  const uploadFile = async (file: File) => {
    if (!clientId) return;
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { toast.error("Please upload PDF or Word files only."); return; }

    setUploading(true);
    try {
      const extractedText = await extractTextFromFile(file);
      const filePath = `portal/${clientId}/${Date.now()}-${file.name}`;
      await supabase.storage.from("documents").upload(filePath, file);

      // Re-validate token via RPC to get the linked lawyer's user_id
      const { data: tokenRows } = await (supabase as any).rpc("validate_client_access_token", { _token: token! });
      const tokenData = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;

      if (selectedCaseId) {
        await supabase.from("case_documents").insert({
          case_id: selectedCaseId,
          user_id: tokenData?.user_id,
          name: file.name,
          document_category: "supporting",
          file_type: file.type,
          storage_path: filePath,
          raw_text: extractedText.slice(0, 20000),
          ai_status: "processed",
          uploaded_by: "client",
          client_visible: true,
        });
      } else {
        await supabase.from("documents").insert({
          client_id: clientId,
          user_id: tokenData?.user_id || clientId,
          name: file.name,
          file_type: file.type,
          storage_path: filePath,
          ai_status: "pending",
        });
      }

      await loadData(clientId);
      toast.success("Document uploaded successfully!");
    } catch (err: any) {
      toast.error("Upload failed");
    }
    setUploading(false);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const sendMessage = async () => {
    if (!clientId || !msgText.trim()) return;
    setSendingMsg(true);
    const { error } = await supabase.from("portal_messages").insert({
      client_id: clientId,
      case_id: selectedCaseId || null,
      sender_type: "client",
      sender_name: data.client?.company_name || "Client",
      message: msgText.trim(),
      attachments: [],
    });
    if (error) { toast.error("Failed to send message"); setSendingMsg(false); return; }
    setMsgText("");
    setSendingMsg(false);
  };

  const sendAttachment = async (file: File) => {
    if (!clientId || !token) return;
    setSendingAttachment(true);

    try {
      const extractedText = await extractTextFromFile(file).catch(() => "");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("case-collaboration", {
        body: {
          action: "upload-file",
          target: "message_attachment",
          portalToken: token,
          caseId: selectedCaseId || null,
          fileName: file.name,
          contentType: file.type,
          fileData: base64,
          extractedText,
        },
      });

      if (uploadError) throw uploadError;

      const { error } = await supabase.from("portal_messages").insert({
        client_id: clientId,
        case_id: selectedCaseId || null,
        sender_type: "client",
        sender_name: data.client?.company_name || "Client",
        message: `Attached ${file.name}`,
        attachments: [uploadData.attachment],
      });

      if (error) throw error;
      toast.success("Attachment sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send attachment");
    } finally {
      setSendingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const openAttachment = async (storagePath: string) => {
    const { data: downloadData, error } = await supabase.functions.invoke("case-collaboration", {
      body: { action: "get-download-url", portalToken: token, caseId: selectedCaseId || null, storagePath },
    });

    if (error) {
      toast.error("Failed to open attachment");
      return;
    }

    window.open(downloadData.signedUrl, "_blank", "noopener,noreferrer");
  };

  // Calculate progress
  const getProgress = () => {
    let total = 6;
    let done = 0;
    if (form.company_name) done++;
    if (form.registration_number) done++;
    if (form.registered_address) done++;
    if (form.contact_email) done++;
    if (data.directors.length > 0) done++;
    if (data.documents.length > 0) done++;
    return Math.round((done / total) * 100);
  };

  const getMissingItems = () => {
    const items: string[] = [];
    if (!form.registration_number) items.push("Add company registration number");
    if (!form.registered_address) items.push("Add registered address");
    if (!form.contact_email) items.push("Add contact email");
    if (data.directors.length === 0) items.push("Add at least one director");
    if (data.shareholders.length === 0) items.push("Add shareholders");
    if (data.documents.length === 0) items.push("Upload required documents (passport, company docs)");
    return items;
  };

  const progress = getProgress();
  const missingItems = getMissingItems();
  const licensingCases = useMemo(() => data.cases.filter((item) => item.case_type === "licensing"), [data.cases]);
  const legalCases = useMemo(() => data.cases.filter((item) => item.case_type !== "licensing"), [data.cases]);
  const selectedCase = data.cases.find((item) => item.id === selectedCaseId) || null;
  const workspaceCases = selectedWorkspace === "licensing" ? licensingCases : legalCases;
  const visibleMessages = selectedCaseId ? data.messages.filter((msg) => msg.case_id === selectedCaseId) : data.messages;
  const visibleCaseDocuments = selectedCaseId ? data.caseDocuments.filter((doc) => doc.case_id === selectedCaseId) : [];
  const visibleCaseActions = selectedCaseId ? data.caseActions.filter((item) => item.case_id === selectedCaseId && item.is_client_action) : [];

  useEffect(() => {
    if (!data.cases.length) {
      setSelectedWorkspace("licensing");
      setActiveTab("company");
      return;
    }

    const currentCase = data.cases.find((item) => item.id === selectedCaseId);
    if (currentCase) {
      const nextWorkspace = currentCase.case_type === "licensing" ? "licensing" : "legal";
      setSelectedWorkspace(nextWorkspace);
      setActiveTab((prev) => (nextWorkspace === "licensing" ? (prev === "summary" || prev === "next-steps" || prev === "actions" ? "company" : prev) : (prev === "company" || prev === "people" ? "summary" : prev)));
      return;
    }

    const fallbackCase = legalCases[0] || licensingCases[0] || data.cases[0];
    if (fallbackCase) {
      setSelectedCaseId(fallbackCase.id);
      setSelectedWorkspace(fallbackCase.case_type === "licensing" ? "licensing" : "legal");
      setActiveTab(fallbackCase.case_type === "licensing" ? "company" : "summary");
    }
  }, [data.cases, legalCases, licensingCases, selectedCaseId]);

  const handleWorkspaceChange = (workspace: "licensing" | "legal") => {
    setSelectedWorkspace(workspace);
    const nextCase = (workspace === "licensing" ? licensingCases : legalCases)[0] || null;
    setSelectedCaseId(nextCase?.id || "");
    setActiveTab(workspace === "licensing" ? "company" : "summary");
  };

  const handleCaseChange = (caseId: string) => {
    const nextCase = data.cases.find((item) => item.id === caseId);
    setSelectedCaseId(caseId);
    if (nextCase) {
      const nextWorkspace = nextCase.case_type === "licensing" ? "licensing" : "legal";
      setSelectedWorkspace(nextWorkspace);
      setActiveTab(nextWorkspace === "licensing" ? "company" : "summary");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid or Expired Link</h1>
          <p className="text-muted-foreground text-sm">
            This access link is invalid or has expired. Please contact your law firm for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm">Licensify AI — Client Portal</h1>
            <p className="text-xs text-muted-foreground">{data.client?.company_name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleWorkspaceChange("licensing")}
            className={`rounded-xl border p-4 text-left transition-colors ${selectedWorkspace === "licensing" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Licensing</p>
                <p className="text-xs text-muted-foreground">Permits, compliance, and licensing submissions.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{licensingCases.length} case{licensingCases.length === 1 ? "" : "s"}</p>
          </button>

          <button
            type="button"
            onClick={() => handleWorkspaceChange("legal")}
            disabled={!legalCases.length}
            className={`rounded-xl border p-4 text-left transition-colors ${selectedWorkspace === "legal" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"} ${!legalCases.length ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <BriefcaseBusiness className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Legal Cases</p>
                <p className="text-xs text-muted-foreground">Drafting, disputes, legal documents, and case actions.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{legalCases.length} case{legalCases.length === 1 ? "" : "s"}</p>
          </button>
        </div>

        {selectedWorkspace === "legal" ? (
          <ClientLegalCaseWorkspace
            activeTab={activeTab}
            selectedCase={selectedCase}
            selectedCaseId={selectedCaseId}
            caseOptions={workspaceCases}
            caseActions={visibleCaseActions}
            caseDocuments={visibleCaseDocuments}
            messages={visibleMessages}
            messageText={msgText}
            uploading={uploading}
            sendingAttachment={sendingAttachment}
            sendingMessage={sendingMsg}
            messagesEndRef={messagesEndRef}
            onCaseChange={handleCaseChange}
            onOpenAttachment={openAttachment}
            onRequestAttachmentUpload={() => attachmentInputRef.current?.click()}
            onRequestDocumentUpload={() => documentInputRef.current?.click()}
            onSendMessage={sendMessage}
            onTabChange={setActiveTab}
            onMessageTextChange={setMsgText}
          />
        ) : (
          <ClientLicensingWorkspace
            activeTab={activeTab}
            caseOptions={workspaceCases}
            clientDocuments={data.documents}
            companyForm={form}
            messages={visibleMessages}
            missingItems={missingItems}
            newDirector={newDirector}
            newShareholder={newShareholder}
            progress={progress}
            saving={saving}
            selectedCaseId={selectedCaseId}
            sendingAttachment={sendingAttachment}
            sendingMessage={sendingMsg}
            uploading={uploading}
            visibleCaseDocuments={visibleCaseDocuments}
            messagesEndRef={messagesEndRef}
            messageText={msgText}
            people={{ directors: data.directors, shareholders: data.shareholders }}
            onAddDirector={addDirector}
            onAddShareholder={addShareholder}
            onCaseChange={handleCaseChange}
            onCompanyFormChange={setForm}
            onMessageTextChange={setMsgText}
            onNewDirectorChange={setNewDirector}
            onNewShareholderChange={setNewShareholder}
            onOpenAttachment={openAttachment}
            onRequestAttachmentUpload={() => attachmentInputRef.current?.click()}
            onRequestDocumentUpload={() => documentInputRef.current?.click()}
            onSaveCompanyInfo={saveCompanyInfo}
            onSendMessage={sendMessage}
            onTabChange={setActiveTab}
          />
        )}

        <input ref={documentInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file); }} />
        <input ref={attachmentInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) sendAttachment(file); }} />
      </div>
    </div>
  );
};

export default ClientPortal;
