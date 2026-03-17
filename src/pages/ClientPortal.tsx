import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Building2, Users, Upload, FileText, MessageSquare,
  Send, CheckCircle2, AlertCircle, Loader2, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";

interface PortalData {
  client: any;
  directors: any[];
  shareholders: any[];
  documents: any[];
  messages: any[];
}

const ClientPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [data, setData] = useState<PortalData>({ client: null, directors: [], shareholders: [], documents: [], messages: [] });
  const [activeTab, setActiveTab] = useState("company");

  // Form states
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [newDirector, setNewDirector] = useState({ full_name: "", role: "Director" });
  const [newShareholder, setNewShareholder] = useState({ name: "", percentage: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    // Validate token
    const { data: tokenData, error } = await supabase
      .from("client_access_tokens")
      .select("*")
      .eq("token", token!)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !tokenData) {
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
    const [{ data: c }, { data: d }, { data: s }, { data: docs }, { data: msgs }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", cid).single(),
      supabase.from("directors").select("*").eq("client_id", cid),
      supabase.from("shareholders").select("*").eq("client_id", cid),
      supabase.from("documents").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
      supabase.from("portal_messages").select("*").eq("client_id", cid).order("created_at", { ascending: true }),
    ]);

    setData({ client: c, directors: d || [], shareholders: s || [], documents: docs || [], messages: msgs || [] });
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
      .channel(`portal-messages-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portal_messages", filter: `client_id=eq.${clientId}` }, (payload) => {
        setData((prev) => ({ ...prev, messages: [...prev.messages, payload.new] }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

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
      const filePath = `portal/${clientId}/${Date.now()}-${file.name}`;
      await supabase.storage.from("documents").upload(filePath, file);

      // Get user_id from the token's associated client
      const { data: tokenData } = await supabase
        .from("client_access_tokens")
        .select("user_id")
        .eq("token", token!)
        .single();

      await supabase.from("documents").insert({
        client_id: clientId,
        user_id: tokenData?.user_id || clientId,
        name: file.name,
        file_type: file.type,
        storage_path: filePath,
        ai_status: "pending",
      });

      await loadData(clientId);
      toast.success("Document uploaded successfully!");
    } catch (err: any) {
      toast.error("Upload failed");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    if (!clientId || !msgText.trim()) return;
    setSendingMsg(true);
    const { error } = await supabase.from("portal_messages").insert({
      client_id: clientId,
      sender_type: "client",
      message: msgText.trim(),
    });
    if (error) { toast.error("Failed to send message"); setSendingMsg(false); return; }
    setMsgText("");
    setSendingMsg(false);
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
        {/* Progress */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Data Collection Progress</h2>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 mb-4" />
          {missingItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">What's still needed:</p>
              {missingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          )}
          {missingItems.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              All required information has been provided!
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="company" className="text-xs"><Building2 className="h-3 w-3 mr-1" /> Company</TabsTrigger>
            <TabsTrigger value="people" className="text-xs"><Users className="h-3 w-3 mr-1" /> People</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Documents</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" /> Messages</TabsTrigger>
          </TabsList>

          {/* Company Info Tab */}
          <TabsContent value="company" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Registration Number</Label>
                  <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="e.g. 12345678" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Registered Address</Label>
                  <Input value={form.registered_address} onChange={(e) => setForm({ ...form, registered_address: e.target.value })} placeholder="Full registered address" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Email</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Services / Business Description</Label>
                  <Textarea
                    value={form.business_description}
                    onChange={(e) => setForm({ ...form, business_description: e.target.value })}
                    placeholder="Describe your fintech services, business model, and target market..."
                    rows={4}
                  />
                </div>
              </div>
              <Button onClick={saveCompanyInfo} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Save Company Information
              </Button>
            </div>
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people" className="space-y-4 mt-4">
            {/* Directors */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Directors</h3>
              {data.directors.length > 0 && (
                <div className="space-y-2">
                  {data.directors.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <span className="font-medium text-foreground">{d.full_name}</span>
                        <span className="ml-2 text-muted-foreground">({d.role})</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Director name" value={newDirector.full_name} onChange={(e) => setNewDirector({ ...newDirector, full_name: e.target.value })} className="flex-1" />
                <Input placeholder="Role" value={newDirector.role} onChange={(e) => setNewDirector({ ...newDirector, role: e.target.value })} className="w-32" />
                <Button size="sm" onClick={addDirector} disabled={!newDirector.full_name.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Shareholders */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Shareholders</h3>
              {data.shareholders.length > 0 && (
                <div className="space-y-2">
                  {data.shareholders.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="ml-2 text-muted-foreground">({s.percentage}%)</span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Shareholder name" value={newShareholder.name} onChange={(e) => setNewShareholder({ ...newShareholder, name: e.target.value })} className="flex-1" />
                <Input type="number" placeholder="%" value={newShareholder.percentage || ""} onChange={(e) => setNewShareholder({ ...newShareholder, percentage: Number(e.target.value) })} className="w-20" />
                <Button size="sm" onClick={addShareholder} disabled={!newShareholder.name.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Upload Documents</h3>
              <p className="text-xs text-muted-foreground">
                Upload passports, company documents, and business plans. Accepted formats: PDF, Word.
              </p>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : "hover:border-primary/50 hover:bg-primary/5"}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                )}
                <p className="text-sm font-medium text-foreground">{uploading ? "Uploading..." : "Click to upload or drag & drop"}</p>
                <p className="text-xs text-muted-foreground mt-1">PDF or Word documents</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />

              {data.documents.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Uploaded Documents</h4>
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="flex-1 truncate text-foreground">{doc.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${doc.ai_status === "processed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {doc.ai_status === "processed" ? "Processed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border bg-card flex flex-col" style={{ height: "400px" }}>
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Messages</h3>
                <p className="text-xs text-muted-foreground">Communicate with your legal team</p>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {data.messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Send a message to your legal team.</p>
                )}
                {data.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender_type === "client"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender_type === "client" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <Button size="sm" onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortal;
