import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
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
  deriveCaseStatus,
  formatRelativeDate,
  getCaseTypeLabel,
  normalizeCaseActionType,
  normalizeFacts,
  normalizeCaseStatus,
  parseCaseRecommendations,
  parseMissingInfoActions,
  type CaseRecommendation,
  type MissingInfoAction,
} from "@/lib/cases";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CaseRecommendationPanel } from "@/components/app/CaseRecommendationPanel";
import { CaseDraftWorkspace } from "@/components/app/CaseDraftWorkspace";
import { PortalMessages } from "@/components/app/PortalMessages";
import {
  createLegalDocxBlob,
  createLegalPdfBlob,
  parseLegalWorkProduct,
  renderLegalWorkProductText,
  slugifyFileName,
  type LegalWorkProduct,
} from "@/lib/legalDocuments";
import {
  prepareBrowserDownload,
  revokeBrowserDownload,
  triggerBrowserDownload,
} from "@/lib/fileDownloads";

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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const db = supabase as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [caseItem, setCaseItem] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [linkedClient, setLinkedClient] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);

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
  const [activeTab, setActiveTab] = useState("overview");
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
  const [actionWorkspaceTitle, setActionWorkspaceTitle] = useState("");
  const [actionWorkspaceContent, setActionWorkspaceContent] = useState("");
  const [actionWorkspaceOpen, setActionWorkspaceOpen] = useState(false);
  const [pendingUploadPrompt, setPendingUploadPrompt] = useState(false);
  const [workspaceProduct, setWorkspaceProduct] = useState<LegalWorkProduct | null>(null);
  const [workspaceActionType, setWorkspaceActionType] = useState("draft_document");
  const [persistingDraft, setPersistingDraft] = useState(false);
  const [exportLoadingFormat, setExportLoadingFormat] = useState<"pdf" | "docx" | null>(null);
  const [downloadFallback, setDownloadFallback] = useState<{ url: string; fileName: string; label: string } | null>(null);

  const loadCase = async () => {
    if (!id) return;

    const [{ data: caseData, error: caseError }, { data: activityData }, { data: documentData }, { data: draftData }] = await Promise.all([
      db.from("cases").select("*").eq("id", id).single(),
      db.from("case_activities").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      db.from("case_documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      db.from("case_drafts").select("*").eq("case_id", id).order("version_number", { ascending: false }),
    ]);

    if (caseError || !caseData) {
      toast.error("Case not found");
      setLoading(false);
      return;
    }

    setCaseItem(caseData);
    setActivities(activityData || []);
    setDocuments(documentData || []);
    setDrafts(draftData || []);
    setTitle(caseData.title || "");
    setClientName(caseData.client_name || "");
    setOpponent(caseData.opponent || "");
    setSummary(caseData.case_summary || "");
    setFactsText((caseData.key_facts || []).join("\n"));

    if (caseData.client_id) {
      const { data: clientData } = await db.from("clients").select("id, company_name, jurisdiction").eq("id", caseData.client_id).single();
      setLinkedClient(clientData || null);
    } else {
      setLinkedClient(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user && id) loadCase();
  }, [id, user]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "documents" || tab === "timeline" || tab === "overview") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "documents" && pendingUploadPrompt) {
      setPendingUploadPrompt(false);
      requestAnimationFrame(() => fileInputRef.current?.click());
    }
  }, [activeTab, pendingUploadPrompt]);

  useEffect(() => {
    return () => {
      revokeBrowserDownload(downloadFallback?.url);
    };
  }, [downloadFallback]);

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

  const jurisdiction = useMemo(
    () => linkedClient?.jurisdiction || caseItem?.intake_data?.jurisdiction || "UK",
    [caseItem, linkedClient],
  );

  const recommendations = parseCaseRecommendations(caseItem?.last_recommendations) as CaseRecommendation[];
  const missingItems = parseMissingInfoActions(caseItem?.ai_context?.missingItems) as MissingInfoAction[];

  const getComputedStatus = (
    nextSummary = summary,
    nextFacts: string | string[] = factsText,
    recommendationCount = recommendations.length,
    documentCount = documents.length,
  ) =>
    deriveCaseStatus({
      summary: nextSummary,
      keyFacts: nextFacts,
      recommendationCount,
      documentCount,
    });

  const refreshCaseUnderstanding = async (payloadOverrides?: Record<string, any>, silent = false) => {
    if (!caseItem) return null;

    const payload = {
      caseType: caseItem.case_type,
      caseData: {
        title,
        client_name: clientName,
        opponent,
        jurisdiction,
        case_summary: summary,
        key_facts: normalizeFacts(factsText),
        ...(caseItem.intake_data || {}),
        ...(payloadOverrides || {}),
      },
      documents: documentContext,
      previousActions,
      parties: [clientName, opponent].filter(Boolean),
      jurisdiction,
    };

    const { data, error } = await supabase.functions.invoke("case-ai", {
      body: {
        action: "summarize-case",
        ...payload,
      },
    });

    if (error) throw error;

    const parsed = parseContentJson(data);
    const nextSummary = parsed.summary || summary;
    const nextFacts = normalizeFacts(parsed.keyFacts || factsText);
    const nextMissingItems = parsed.missingItems || [];
    const nextStatus = parsed.status || getComputedStatus(nextSummary, nextFacts, recommendations.length, documents.length);

    const updatePayload = {
      title: title || parsed.title || caseItem.title,
      client_name: clientName,
      opponent: opponent || null,
      case_summary: nextSummary,
      key_facts: nextFacts,
      intake_data: payload.caseData,
      ai_context: {
        ...(caseItem.ai_context || {}),
        missingItems: nextMissingItems,
        lastSummaryAt: new Date().toISOString(),
      },
      progress_percentage: parsed.progressPercentage ?? caseItem.progress_percentage ?? 0,
      status: nextStatus,
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
          parties: [clientName, opponent].filter(Boolean),
          jurisdiction,
        },
      });

      if (error) throw error;

      const parsed = parseContentJson(data);
      const parsedSteps = parseCaseRecommendations(parsed.steps || []);
      const parsedMissingItems = parseMissingInfoActions(parsed.missingItems || missingItems);
      const nextStatus = parsed.status || getComputedStatus(summary, factsText, parsedSteps.length, documents.length);

      const { data: updatedCase, error: updateError } = await db
        .from("cases")
        .update({
          last_recommendations: parsedSteps,
          ai_context: {
            ...(caseItem.ai_context || {}),
            missingItems: parsedMissingItems,
            lastDecisionAt: new Date().toISOString(),
          },
          status: nextStatus,
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
        content: "AI generated legally actionable next steps for this case.",
        metadata: { steps: parsedSteps },
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
          jurisdiction: extracted.jurisdiction || jurisdiction,
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

  const handleCaseAction = async (item: CaseRecommendation | MissingInfoAction, actionKey: string) => {
    if (!caseItem || !user) return;

    setActionBusyKey(actionKey);

    try {
      switch (item.actionType) {
        case "upload_document": {
          setDocCategory(item.documentCategory || "supporting");
          setActiveTab("documents");
          setPendingUploadPrompt(true);
          toast.info("Choose the relevant file to improve the case record.");
          break;
        }
        case "draft_document":
        case "review_matter":
        case "generate_strategy":
        default: {
          const title = "title" in item ? item.title : item.label;
          const normalizedActionType = normalizeCaseActionType(item.actionType, title);
          const { data, error } = await supabase.functions.invoke("generate-compliance-doc", {
            body: {
              action: "generate-legal-draft",
              actionType: normalizedActionType,
              draftType: "draftType" in item ? item.draftType || title : title,
              caseType: caseItem.case_type,
              caseSummary: summary,
              keyFacts: normalizeFacts(factsText),
              parties: [clientName, opponent].filter(Boolean),
              jurisdiction,
              documents: documentContext,
              previousActions,
            },
          });

          if (error) throw error;

          const product = parseLegalWorkProduct(data.content || "");
          const generatedContent = renderLegalWorkProductText(product);
          setActionWorkspaceTitle(title);
          setActionWorkspaceContent(generatedContent);
          setActionWorkspaceOpen(true);
          setWorkspaceProduct(product);
          setWorkspaceActionType(normalizedActionType);

          await Promise.all([
            db.from("case_actions").insert({
              case_id: caseItem.id,
              user_id: user.id,
              title,
              action_type: normalizedActionType,
              priority: "priority" in item ? item.priority || "medium" : "medium",
              status: "completed",
              description: `Executed ${normalizedActionType} action.`,
              reasoning: item.why || null,
              result_content: generatedContent,
              document_category: item.documentCategory || null,
              metadata: { structured: product },
              completed_at: new Date().toISOString(),
            }),
            db.from("case_activities").insert({
              case_id: caseItem.id,
              user_id: user.id,
              activity_type: "action",
              title,
              content: `Opened legal action workspace for ${title}.`,
              metadata: { action_type: normalizedActionType },
            }),
          ]);

          const nextStatus = getComputedStatus(summary, factsText, recommendations.length, documents.length);
          await db.from("cases").update({ status: nextStatus }).eq("id", caseItem.id);
          await loadCase();
          toast.success("Legal action ready");
          break;
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to open legal action");
    } finally {
      setActionBusyKey(null);
    }
  };

  const handleCopyWorkspace = async () => {
    try {
      await navigator.clipboard.writeText(actionWorkspaceContent);
      toast.success("Draft copied");
    } catch {
      toast.error("Failed to copy draft");
    }
  };

  const currentWorkspaceProduct = () => {
    if (workspaceProduct) return { ...workspaceProduct, title: actionWorkspaceTitle } as LegalWorkProduct;
    return parseLegalWorkProduct(actionWorkspaceContent);
  };

  const exportWorkspace = async (format: "pdf" | "docx") => {
    setExportLoadingFormat(format);

    try {
      const product = currentWorkspaceProduct();
      const fileBase = slugifyFileName(actionWorkspaceTitle || product.title || "legal-draft");
      const fileName = `${fileBase}.${format}`;
      const mimeType =
        format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

      const blob = format === "docx" ? await createLegalDocxBlob(product) : await createLegalPdfBlob(product);

      revokeBrowserDownload(downloadFallback?.url);
      const preparedDownload = prepareBrowserDownload(blob, fileName, mimeType);
      setDownloadFallback({
        url: preparedDownload.url,
        fileName: preparedDownload.fileName,
        label: "Click here to download",
      });

      triggerBrowserDownload(preparedDownload);
      toast.success(format === "docx" ? "Word download started" : "PDF download started");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate document");
    } finally {
      setExportLoadingFormat(null);
    }
  };

  const persistWorkspaceDraft = async (status: "draft" | "approved") => {
    if (!caseItem || !user || !actionWorkspaceContent.trim()) return;
    setPersistingDraft(true);

    try {
      const product = currentWorkspaceProduct();
      const version = (drafts[0]?.version_number || 0) + 1;
      const storageBase = `${user.id}/case-drafts/${caseItem.id}/${Date.now()}-${slugifyFileName(actionWorkspaceTitle || product.title || "legal-draft")}`;
      let pdfStoragePath: string | null = null;
      let docxStoragePath: string | null = null;

      if (status === "approved") {
        const [pdfBlob, docxBlob] = await Promise.all([createLegalPdfBlob(product), createLegalDocxBlob(product)]);
        pdfStoragePath = `${storageBase}.pdf`;
        docxStoragePath = `${storageBase}.docx`;

        const [{ error: pdfError }, { error: docxError }] = await Promise.all([
          supabase.storage.from("documents").upload(pdfStoragePath, pdfBlob, { contentType: "application/pdf", upsert: true }),
          supabase.storage.from("documents").upload(docxStoragePath, docxBlob, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: true,
          }),
        ]);

        if (pdfError) throw pdfError;
        if (docxError) throw docxError;
      }

      await db.from("case_drafts").insert({
        case_id: caseItem.id,
        user_id: user.id,
        title: actionWorkspaceTitle || product.title,
        document_type: workspaceActionType,
        jurisdiction,
        version_number: version,
        status,
        content: actionWorkspaceContent,
        metadata: { structured: product },
        approved_at: status === "approved" ? new Date().toISOString() : null,
        approved_by: status === "approved" ? user.id : null,
        client_visible: status === "approved",
        pdf_storage_path: pdfStoragePath,
        docx_storage_path: docxStoragePath,
      });

      await db.from("case_activities").insert({
        case_id: caseItem.id,
        user_id: user.id,
        activity_type: status === "approved" ? "approval" : "draft",
        title: status === "approved" ? "Approved legal draft" : "Saved legal draft",
        content: `${actionWorkspaceTitle} was ${status === "approved" ? "approved" : "saved"}.`,
        metadata: { status, action_type: workspaceActionType },
      });

      await loadCase();
      toast.success(status === "approved" ? "Draft approved and saved" : "Draft saved");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to persist draft");
    } finally {
      setPersistingDraft(false);
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
              <span className="text-xs text-muted-foreground">{normalizeCaseStatus(caseItem.status)}</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Client: {clientName}{opponent ? ` · Opponent: ${opponent}` : ""}{jurisdiction ? ` · Jurisdiction: ${jurisdiction}` : ""}</p>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <CaseRecommendationPanel
                  recommendations={recommendations}
                  missingItems={missingItems}
                  showWhy={showWhy}
                  busyKey={actionBusyKey}
                  onShowWhyChange={setShowWhy}
                  onAction={handleCaseAction}
                />

                <CaseDraftWorkspace
                  open={actionWorkspaceOpen}
                  title={actionWorkspaceTitle}
                  content={actionWorkspaceContent}
                  isSaving={persistingDraft}
                  exportLoadingFormat={exportLoadingFormat}
                  downloadFallback={downloadFallback}
                  onChange={setActionWorkspaceContent}
                  onCopy={handleCopyWorkspace}
                  onSaveDraft={() => persistWorkspaceDraft("draft")}
                  onApprove={() => persistWorkspaceDraft("approved")}
                  onExportWord={() => exportWorkspace("docx")}
                  onExportPdf={() => exportWorkspace("pdf")}
                  onDismissDownloadFallback={() => {
                    revokeBrowserDownload(downloadFallback?.url);
                    setDownloadFallback(null);
                  }}
                  onClose={() => setActionWorkspaceOpen(false)}
                />

                {drafts.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-base font-semibold text-foreground">Saved versions</h3>
                    </div>
                    <div className="mt-4 space-y-3">
                      {drafts.slice(0, 5).map((draft) => (
                        <div key={draft.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{draft.title}</p>
                            <p className="text-xs text-muted-foreground">Version {draft.version_number} · {draft.status} · {formatRelativeDate(draft.created_at)}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionWorkspaceTitle(draft.title);
                              setActionWorkspaceContent(draft.content);
                              setWorkspaceActionType(draft.document_type || "draft_document");
                              setWorkspaceProduct(draft.metadata?.structured || null);
                              setActionWorkspaceOpen(true);
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" /> Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

              {linkedClient ? <PortalMessages clientId={linkedClient.id} caseId={caseItem.id} /> : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default CaseDetail;