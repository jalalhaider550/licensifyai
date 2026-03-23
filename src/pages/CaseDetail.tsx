import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { extractTextFromFile } from "@/lib/documentParser";
import {
  CASE_DOCUMENT_CATEGORIES,
  type CaseRecommendation,
  formatRelativeDate,
  getCaseTypeLabel,
  normalizeFacts,
} from "@/lib/cases";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const parseContentJson = (payload: any) => {
  const content = payload?.content || "{}";
  try {
    const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
    return jsonMatch ? JSON.parse(jsonMatch[0]) : typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return {};
  }
};

const CaseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const db = supabase as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [caseItem, setCaseItem] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [linkedClient, setLinkedClient] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [summary, setSummary] = useState("");
  const [factsText, setFactsText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [docCategory, setDocCategory] = useState("supporting");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const loadCase = async () => {
    if (!id) return;

    const [{ data: caseData, error: caseError }, { data: activityData }, { data: documentData }] = await Promise.all([
      db.from("cases").select("*").eq("id", id).single(),
      db.from("case_activities").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      db.from("case_documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
    ]);

    if (caseError || !caseData) {
      toast.error("Case not found");
      setLoading(false);
      return;
    }

    setCaseItem(caseData);
    setActivities(activityData || []);
    setDocuments(documentData || []);
    setTitle(caseData.title || "");
    setClientName(caseData.client_name || "");
    setOpponent(caseData.opponent || "");
    setSummary(caseData.case_summary || "");
    setFactsText((caseData.key_facts || []).join("\n"));

    if (caseData.client_id) {
      const { data: clientData } = await db.from("clients").select("id, company_name").eq("id", caseData.client_id).single();
      setLinkedClient(clientData || null);
    } else {
      setLinkedClient(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user && id) loadCase();
  }, [id, user]);

  const previousActions = useMemo(
    () =>
      activities.slice(0, 10).map((activity) => ({
        title: activity.title,
        content: activity.content,
        type: activity.activity_type,
        created_at: activity.created_at,
      })),
    [activities],
  );

  const documentContext = useMemo(
    () =>
      documents.map((doc) => ({
        name: doc.name,
        category: doc.document_category,
        extracted_data: doc.extracted_data,
        raw_text: (doc.raw_text || "").slice(0, 5000),
      })),
    [documents],
  );

  const recommendations = (caseItem?.last_recommendations || []) as CaseRecommendation[];
  const missingItems = caseItem?.ai_context?.missingItems || [];

  const refreshCaseUnderstanding = async (payloadOverrides?: Record<string, any>, silent = false) => {
    if (!caseItem) return null;

    const payload = {
      caseType: caseItem.case_type,
      caseData: {
        title,
        client_name: clientName,
        opponent,
        case_summary: summary,
        key_facts: normalizeFacts(factsText),
        ...(caseItem.intake_data || {}),
        ...(payloadOverrides || {}),
      },
      documents: documentContext,
      previousActions,
    };

    const { data, error } = await supabase.functions.invoke("case-ai", {
      body: {
        action: "summarize-case",
        ...payload,
      },
    });

    if (error) throw error;

    const parsed = parseContentJson(data);

    const updatePayload = {
      title: title || parsed.title || caseItem.title,
      client_name: clientName,
      opponent: opponent || null,
      case_summary: parsed.summary || summary,
      key_facts: normalizeFacts(parsed.keyFacts || factsText),
      intake_data: payload.caseData,
      ai_context: {
        ...(caseItem.ai_context || {}),
        missingItems: parsed.missingItems || [],
        lastSummaryAt: new Date().toISOString(),
      },
      progress_percentage: parsed.progressPercentage ?? caseItem.progress_percentage ?? 0,
      status: "active",
    };

    const { data: updatedCase, error: updateError } = await db
      .from("cases")
      .update(updatePayload)
      .eq("id", caseItem.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    setCaseItem(updatedCase);
    setSummary(updatedCase.case_summary || "");
    setFactsText((updatedCase.key_facts || []).join("\n"));

    if (!silent) {
      toast.success("Case context updated");
    }

    return updatedCase;
  };

  const handleSave = async () => {
    if (!caseItem || !user) return;
    setSaving(true);

    try {
      const updated = await refreshCaseUnderstanding(undefined, true);

      await db.from("case_activities").insert({
        case_id: caseItem.id,
        user_id: user.id,
        activity_type: "edit",
        title: "Case information updated",
        content: "Case summary, parties, or key facts were edited.",
        metadata: { summary_length: summary.length, facts_count: normalizeFacts(factsText).length },
      });

      setCaseItem(updated || caseItem);
      await loadCase();
      toast.success("Case saved");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save case");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !caseItem || !user) return;

    try {
      await db.from("case_activities").insert({
        case_id: caseItem.id,
        user_id: user.id,
        activity_type: "note",
        title: "Case note added",
        content: noteText.trim(),
        metadata: {},
      });
      setNoteText("");
      await loadCase();
      toast.success("Note added");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add note");
    }
  };

  const handleGenerateNextSteps = async () => {
    if (!caseItem || !user) return;
    setThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke("case-ai", {
        body: {
          action: "next-steps",
          caseType: caseItem.case_type,
          caseSummary: summary,
          keyFacts: normalizeFacts(factsText),
          documents: documentContext,
          previousActions,
        },
      });

      if (error) throw error;

      const parsed = parseContentJson(data);

      const { data: updatedCase, error: updateError } = await db
        .from("cases")
        .update({
          last_recommendations: parsed.steps || [],
          ai_context: {
            ...(caseItem.ai_context || {}),
            missingItems: parsed.missingItems || missingItems,
            lastDecisionAt: new Date().toISOString(),
          },
        })
        .eq("id", caseItem.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      await db.from("case_activities").insert({
        case_id: caseItem.id,
        user_id: user.id,
        activity_type: "decision",
        title: "Generated next steps",
        content: "AI generated a practical next-step list for this case.",
        metadata: { steps: parsed.steps || [] },
      });

      setCaseItem(updatedCase);
      await loadCase();
      toast.success("Next steps updated");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate next steps");
    } finally {
      setThinking(false);
    }
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !caseItem || !user) return;
    setUploading(true);

    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 20) {
        throw new Error("The document appears empty or unreadable.");
      }

      const filePath = `${user.id}/cases/${caseItem.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: createdDocument, error: insertError } = await db
        .from("case_documents")
        .insert({
          case_id: caseItem.id,
          user_id: user.id,
          name: file.name,
          document_category: docCategory,
          file_type: file.type,
          storage_path: filePath,
          raw_text: text.slice(0, 20000),
          ai_status: "processing",
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      const { data: extractionData, error: extractionError } = await supabase.functions.invoke("case-ai", {
        body: {
          action: "extract-case-data",
          caseType: caseItem.case_type,
          documentName: file.name,
          documentCategory: docCategory,
          documentText: text.slice(0, 20000),
        },
      });

      if (extractionError) throw extractionError;
      const extracted = parseContentJson(extractionData);

      await db
        .from("case_documents")
        .update({
          extracted_data: extracted,
          ai_status: "processed",
        })
        .eq("id", createdDocument.id);

      await db.from("case_activities").insert({
        case_id: caseItem.id,
        user_id: user.id,
        activity_type: "document",
        title: "Document uploaded",
        content: `${file.name} was uploaded and analyzed.`,
        metadata: { document_category: docCategory, extracted },
      });

      await loadCase();
      await refreshCaseUnderstanding(
        {
          extracted_document_summary: extracted.summary,
          extracted_document_facts: extracted.keyFacts,
        },
        true,
      );
      await loadCase();
      toast.success("Document uploaded and analyzed");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  if (!caseItem) {
    return (
      <AppShell>
        <div className="p-8 text-center text-muted-foreground">Case not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <Link to="/cases" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to Cases
        </Link>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                {getCaseTypeLabel(caseItem.case_type)}
              </span>
              <span className="text-xs text-muted-foreground">{caseItem.status}</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Client: {clientName}{opponent ? ` · Opponent: ${opponent}` : ""}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => refreshCaseUnderstanding(undefined)}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh AI Context
            </Button>
            <Button onClick={handleGenerateNextSteps} disabled={thinking}>
              {thinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              What should I do next?
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">Case understanding</h2>
              <span className="text-sm text-muted-foreground">{caseItem.progress_percentage || 0}% complete</span>
            </div>
            <Progress value={caseItem.progress_percentage || 0} className="h-2" />
            <p className="mt-3 text-sm text-muted-foreground">
              AI keeps the case summary, facts, and next-step reasoning updated as you edit data or upload documents.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold text-foreground">Connected workspaces</h2>
            <div className="mt-3 flex flex-col gap-2">
              {linkedClient ? (
                <Button asChild variant="outline" className="justify-between">
                  <Link to={`/clients/${linkedClient.id}`}>
                    Open client workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">No client linked yet.</p>
              )}
              {linkedClient && caseItem.case_type === "licensing" && (
                <Button asChild>
                  <Link to={`/select-license/${linkedClient.id}?caseId=${caseItem.id}`}>
                    Start licensing inside case <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Case title</Label>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client name</Label>
                    <Input value={clientName} onChange={(event) => setClientName(event.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Opponent</Label>
                    <Input value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Case summary</Label>
                    <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Key facts</Label>
                    <Textarea
                      value={factsText}
                      onChange={(event) => setFactsText(event.target.value)}
                      rows={6}
                      placeholder="One fact per line"
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Case Info
                </Button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-semibold text-foreground">AI next steps</h3>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Why this?</p>
                      <p className="text-xs text-muted-foreground">Show brief reasoning for each recommended step.</p>
                    </div>
                    <Switch checked={showWhy} onCheckedChange={setShowWhy} />
                  </div>

                  <div className="mt-4 space-y-3">
                    {recommendations.length > 0 ? (
                      recommendations.map((step, index) => (
                        <div key={`${step.title}-${index}`} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{step.title}</p>
                              {showWhy && step.why && <p className="mt-1 text-xs text-muted-foreground">{step.why}</p>}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        Generate next steps to get 3–5 practical actions for this case.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-semibold text-foreground">Missing info guidance</h3>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {missingItems.length > 0 ? (
                      missingItems.map((item: string) => (
                        <li key={item} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                        No major gaps detected right now.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Case documents</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Upload PDF or Word files and Licensify will extract parties, dates, clauses, and key facts into the case context.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="min-w-[220px] space-y-2">
                    <Label>Document category</Label>
                    <Select value={docCategory} onValueChange={setDocCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CASE_DOCUMENT_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="opacity-0">Upload</Label>
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleUploadDocument} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload Document
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{doc.name}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {doc.document_category} · {doc.ai_status} · Uploaded {formatRelativeDate(doc.created_at)}
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                          {doc.file_type || "Unknown"}
                        </span>
                      </div>
                      {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <div className="grid gap-3 sm:grid-cols-2 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">Parties</p>
                              <p className="mt-1 text-foreground">{(doc.extracted_data.parties || []).join(", ") || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dates</p>
                              <p className="mt-1 text-foreground">{(doc.extracted_data.dates || []).join(", ") || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">Clauses</p>
                              <p className="mt-1 text-foreground">{(doc.extracted_data.clauses || []).join(", ") || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">Key facts</p>
                              <p className="mt-1 text-foreground">{(doc.extracted_data.keyFacts || []).join(" · ") || "—"}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No case documents yet.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-foreground">Add note</h3>
                <Textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={6} className="mt-3" placeholder="Add a note or internal update…" />
                <Button className="mt-3" onClick={handleAddNote} disabled={!noteText.trim()}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Save Note
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-foreground">Notes / activity timeline</h3>
                <div className="mt-4 space-y-3">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                          <span className="text-xs text-muted-foreground">{formatRelativeDate(activity.created_at)}</span>
                        </div>
                        {activity.content && <p className="mt-2 text-sm text-muted-foreground">{activity.content}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No activity yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default CaseDetail;