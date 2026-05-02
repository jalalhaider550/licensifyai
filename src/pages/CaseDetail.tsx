import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCcw,
  Save,
  Scale,
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
import { CaseVaultTab } from "@/components/app/CaseVaultTab";
import { VersionHistoryPanel } from "@/components/app/VersionHistoryPanel";
import { ShareCaseDialog } from "@/components/app/ShareCaseDialog";
import { CasePresenceIndicator } from "@/components/app/CasePresenceIndicator";
import { CaseActivityFeed } from "@/components/app/CaseActivityFeed";
import { DocumentCommentsPanel } from "@/components/app/DocumentCommentsPanel";
import { logActivity } from "@/lib/firmWorkspace";
import { Share2 } from "lucide-react";
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
import { ClientInfoRequestDialog } from "@/components/app/ClientInfoRequestDialog";
import { CaseInfoRequestsPanel } from "@/components/app/CaseInfoRequestsPanel";
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
import {
  buildCaseInfoRequestLink,
  buildCaseInfoRequestMessage,
  getCaseInfoRequestStatusLabel,
} from "@/lib/caseInfoRequests";
import type { CaseRisk, CaseDeadline, LitigationData, CorporateData } from "@/lib/cases";
import { RiskPanel, DeadlinePanel, LitigationPanel, CorporatePanel } from "@/components/app/MatterSpecificPanels";
import {
  DualAnalysisPanel,
  ExpandedCaseLawPanel,
  AppliedLawPanel,
  EvidenceGapPanel,
  StrategyOptionsPanel,
  ProceduralIntelligencePanel,
  DraftAnythingPanel,
} from "@/components/app/AdvancedCasePanels";
import { RichDocumentEditor } from "@/components/app/RichDocumentEditor";
import { CaseCourtFilingPanel } from "@/components/app/CaseCourtFilingPanel";

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
  const [infoRequests, setInfoRequests] = useState<any[]>([]);

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
  const [strategicAnalysis, setStrategicAnalysis] = useState<any>(null);
  const [pendingUploadPrompt, setPendingUploadPrompt] = useState(false);
  const [workspaceProduct, setWorkspaceProduct] = useState<LegalWorkProduct | null>(null);
  const [workspaceActionType, setWorkspaceActionType] = useState("draft_document");
  const [persistingDraft, setPersistingDraft] = useState(false);
  const [exportLoadingFormat, setExportLoadingFormat] = useState<"pdf" | "docx" | null>(null);
  const [downloadFallback, setDownloadFallback] = useState<{ url: string; fileName: string; label: string } | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedMissingItems, setSelectedMissingItems] = useState<MissingInfoAction[]>([]);
  const [requestForm, setRequestForm] = useState({ title: "", requestMessage: "", instructions: "" });
  const [requestBusyKey, setRequestBusyKey] = useState<string | null>(null);
  const [requestSaving, setRequestSaving] = useState(false);
  const [reminderBusyId, setReminderBusyId] = useState<string | null>(null);
  const [latestRequestLink, setLatestRequestLink] = useState<{ title: string; url: string } | null>(null);

  // Advanced analysis panel state
  const [dualAnalysis, setDualAnalysis] = useState<any[] | null>(null);
  const [expandedCaseLaw, setExpandedCaseLaw] = useState<any[] | null>(null);
  const [appliedLaw, setAppliedLaw] = useState<any[] | null>(null);
  const [evidenceGaps, setEvidenceGaps] = useState<any[] | null>(null);
  const [strategyOptions, setStrategyOptions] = useState<any[] | null>(null);
  const [proceduralSteps, setProceduralSteps] = useState<any[] | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState<string | null>(null);
  const [draftAnythingLoading, setDraftAnythingLoading] = useState(false);

  const loadCase = async () => {
    if (!id) return;

    const [{ data: caseData, error: caseError }, { data: activityData }, { data: documentData }, { data: draftData }, { data: requestData }, { data: requestItemData }] = await Promise.all([
      db.from("cases").select("*").eq("id", id).single(),
      db.from("case_activities").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      db.from("case_documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      db.from("case_drafts").select("*").eq("case_id", id).order("version_number", { ascending: false }),
      db.from("case_info_requests").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      db.from("case_info_request_items").select("*").eq("case_id", id).order("sort_order", { ascending: true }),
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
    setInfoRequests(
      (requestData || []).map((request: any) => ({
        ...request,
        items: (requestItemData || []).filter((item: any) => item.request_id === request.id),
      })),
    );
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

  // Poll for AI-generated summary when it's pending
  useEffect(() => {
    if (!id || !user || !caseItem) return;
    const summaryPending = caseItem.case_metadata?.summaryPending === true;
    if (!summaryPending) return;

    const interval = setInterval(async () => {
      const { data } = await db.from("cases").select("case_summary, case_metadata, title, key_facts, progress_percentage, ai_context").eq("id", id).single();
      if (data && data.case_metadata?.summaryPending !== true) {
        setCaseItem((prev: any) => ({ ...prev, ...data }));
        setTitle(data.title || "");
        setSummary(data.case_summary || "");
        setFactsText((data.key_facts || []).join("\n"));
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, user, caseItem?.case_metadata?.summaryPending]);

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

  const [showJurisdictionChange, setShowJurisdictionChange] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const jurisdiction = useMemo(
    () => caseItem?.case_metadata?.jurisdiction || caseItem?.intake_data?.jurisdiction || linkedClient?.jurisdiction || "UK",
    [caseItem, linkedClient],
  );

  const recommendations = parseCaseRecommendations(caseItem?.last_recommendations) as CaseRecommendation[];
  const missingItems = parseMissingInfoActions(caseItem?.ai_context?.missingItems) as MissingInfoAction[];
  const requestStatusByLabel = useMemo(() => {
    const next: Record<string, string> = {};
    infoRequests.forEach((request) => {
      (request.items || []).forEach((item: any) => {
        if (!next[item.label]) {
          next[item.label] = getCaseInfoRequestStatusLabel(item.status || request.status);
        }
      });
    });
    return next;
  }, [infoRequests]);

  const getRequestMessage = (request: any) =>
    buildCaseInfoRequestMessage({
      link: buildCaseInfoRequestLink(request.token),
      requestTitle: request.title,
      companyName: linkedClient?.company_name || clientName,
    });

  const openRequestPage = (request: any) => {
    window.open(buildCaseInfoRequestLink(request.token), "_blank", "noopener,noreferrer");
  };

  const copyRequestLink = async (request: any) => {
    const link = buildCaseInfoRequestLink(request.token);

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Client request link copied");
      return true;
    } catch (error) {
      console.error(error);
      setLatestRequestLink({ title: request.title, url: link });
      toast.info("Copy was blocked, but the client link is shown below.");
      return false;
    }
  };

  const sendRequestEmail = (request: any) => {
    const email = linkedClient?.contact_email || "";
    const subject = encodeURIComponent(request.title);
    const body = encodeURIComponent(getRequestMessage(request));
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

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

  const buildAdvancedPayload = () => ({
    caseType: caseItem?.case_type,
    caseSummary: summary,
    keyFacts: normalizeFacts(factsText),
    documents: documentContext,
    previousActions,
    parties: [clientName, opponent].filter(Boolean),
    jurisdiction,
  });

  const runAdvancedAnalysis = async (action: string, setter: (data: any) => void, dataKey: string) => {
    if (!caseItem) return;
    setAdvancedLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("case-ai", {
        body: { action, ...buildAdvancedPayload() },
      });
      if (error) throw error;
      const parsed = parseContentJson(data);
      setter(parsed[dataKey] || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || `Failed to run ${action}`);
    } finally {
      setAdvancedLoading(null);
    }
  };

  const handleDualAnalysis = () => runAdvancedAnalysis("dual-analysis", setDualAnalysis, "positions");
  const handleExpandedCaseLaw = (depth: string, filters?: any) => {
    if (!caseItem) return;
    setAdvancedLoading("expanded-case-law");
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("case-ai", {
          body: { action: "expanded-case-law", depth, filters, ...buildAdvancedPayload() },
        });
        if (error) throw error;
        const parsed = parseContentJson(data);
        setExpandedCaseLaw(parsed.cases || []);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to search case law");
      } finally {
        setAdvancedLoading(null);
      }
    })();
  };
  const handleAppliedLaw = () => runAdvancedAnalysis("applied-law", setAppliedLaw, "laws");
  const handleEvidenceGaps = () => runAdvancedAnalysis("evidence-gaps", setEvidenceGaps, "gaps");
  const handleStrategyOptions = () => runAdvancedAnalysis("strategy-options", setStrategyOptions, "strategies");
  const handleProceduralIntelligence = () => runAdvancedAnalysis("procedural-intelligence", setProceduralSteps, "steps");

  const handleDraftAnything = async (request: string, options: any) => {
    if (!caseItem || !user) return;
    setDraftAnythingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("case-ai", {
        body: {
          action: "draft-anything",
          draftRequest: request,
          draftOptions: options,
          ...buildAdvancedPayload(),
        },
      });
      if (error) throw error;
      const parsed = parseContentJson(data);
      const product = parseLegalWorkProduct(parsed.content || "");
      const content = renderLegalWorkProductText(product);
      setActionWorkspaceTitle(parsed.title || request);
      setActionWorkspaceContent(content);
      setWorkspaceProduct(product);
      setWorkspaceActionType("draft_document");
      setActionWorkspaceOpen(true);
      toast.success("Document drafted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to draft document");
    } finally {
      setDraftAnythingLoading(false);
    }
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

  const buildRequestInstructions = (items: MissingInfoAction[]) => {
    if (items.length === 1) {
      return (
        items[0].why ||
        "Upload the requested documents or enter the missing information in the form, then add any helpful notes before submitting."
      );
    }

    return [
      "Please provide all of the following items in one submission:",
      ...items.map((item, index) => `${index + 1}. ${item.label}${item.why ? ` — ${item.why}` : ""}`),
      "You can upload documents, add details for each item, and include extra notes before submitting.",
    ].join("\n");
  };

  const handleOpenRequestDialog = (items: MissingInfoAction[], actionKey: string) => {
    setSelectedMissingItems(items);
    setRequestBusyKey(actionKey);
    setRequestForm({
      title: items.length === 1 ? items[0].label : "Request outstanding case information",
      requestMessage: "Please provide the requested documents using the link below.",
      instructions: buildRequestInstructions(items),
    });
    setRequestModalOpen(true);
    setTimeout(() => setRequestBusyKey(null), 0);
  };

  const handleOpenSingleRequestDialog = (item: MissingInfoAction, actionKey: string) => {
    handleOpenRequestDialog([item], actionKey);
  };

  const handleOpenBulkRequestDialog = (items: MissingInfoAction[], actionKey: string) => {
    handleOpenRequestDialog(items, actionKey);
  };

  const handleCreateClientRequest = async () => {
    if (!caseItem || !user || selectedMissingItems.length === 0) return;
    setRequestSaving(true);

    try {
      // Auto-create client if case has no linked client
      let clientId = caseItem.client_id;
      if (!clientId) {
        const { data: newClient, error: clientError } = await db
          .from("clients")
          .insert({
            user_id: user.id,
            company_name: caseItem.client_name || "Client",
            jurisdiction: "UK",
          })
          .select("id")
          .single();

        if (clientError || !newClient) {
          toast.error("Failed to create client record");
          setRequestSaving(false);
          return;
        }

        clientId = newClient.id;

        // Link the client to the case
        await db.from("cases").update({ client_id: clientId }).eq("id", caseItem.id);
        setCaseItem({ ...caseItem, client_id: clientId });
      }

      const { data: createdRequest, error: requestError } = await db
        .from("case_info_requests")
        .insert({
          case_id: caseItem.id,
          client_id: clientId,
          user_id: user.id,
          title: requestForm.title.trim(),
          request_message: requestForm.requestMessage.trim(),
          instructions: requestForm.instructions.trim(),
          status: "requested",
        })
        .select("*")
        .single();

      if (requestError) throw requestError;

      const { error: itemError } = await db.from("case_info_request_items").insert(
        selectedMissingItems.map((item) => ({
          request_id: createdRequest.id,
          case_id: caseItem.id,
          user_id: user.id,
          label: item.label,
          description: item.why || null,
          request_type: item.actionType === "upload_document" ? "document" : "text",
          document_category: item.documentCategory || null,
          status: "requested",
          metadata: {
            action_type: item.actionType,
            priority: item.priority,
          },
        })),
      );

      if (itemError) throw itemError;

      await Promise.all([
        db.from("case_actions").insert(
          selectedMissingItems.map((item) => ({
            case_id: caseItem.id,
            user_id: user.id,
            title: item.label,
            action_type: item.actionType === "upload_document" ? "upload_document" : "provide_information",
            priority: item.priority || "medium",
            status: "pending",
            is_client_action: true,
            description: requestForm.instructions.trim(),
            document_category: item.documentCategory || null,
            reasoning: item.why || null,
            metadata: {
              source: "case-info-request",
              request_id: createdRequest.id,
              request_scope: selectedMissingItems.length > 1 ? "bulk" : "single",
            },
            result_content: "",
          })),
        ),
        db.from("case_activities").insert({
          case_id: caseItem.id,
          user_id: user.id,
          activity_type: "client_request",
          title:
            selectedMissingItems.length === 1
              ? `Requested client information: ${selectedMissingItems[0].label}`
              : `Requested client information: ${selectedMissingItems.length} items`,
          content: requestForm.requestMessage.trim(),
          metadata: {
            request_id: createdRequest.id,
            requested_labels: selectedMissingItems.map((item) => item.label),
          },
        }),
      ]);

      setLatestRequestLink({
        title: createdRequest.title,
        url: buildCaseInfoRequestLink(createdRequest.token),
      });
      setRequestModalOpen(false);
      setSelectedMissingItems([]);
      await loadCase();
      void copyRequestLink(createdRequest);
      toast.success("Secure client request created");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create client request");
    } finally {
      setRequestSaving(false);
    }
  };

  const handleSendReminder = async (request: any) => {
    if (!caseItem || !user) return;
    setReminderBusyId(request.id);

    try {
      await Promise.all([
        db.from("case_info_requests").update({ last_reminded_at: new Date().toISOString() }).eq("id", request.id),
        db.from("case_activities").insert({
          case_id: caseItem.id,
          user_id: user.id,
          activity_type: "client_request_reminder",
          title: `Reminder sent for ${request.title}`,
          content: "A reminder was sent for the outstanding client information request.",
          metadata: { request_id: request.id },
        }),
      ]);

      await navigator.clipboard.writeText(getRequestMessage(request));
      toast.success("Reminder message copied");
      await loadCase();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send reminder");
    } finally {
      setReminderBusyId(null);
    }
  };

  const handleGenerateNextSteps = async () => {
    if (!caseItem || !user) return;

    // Validate minimum data before calling AI
    const hasSummary = summary && summary.trim().length > 10;
    const hasFacts = normalizeFacts(factsText).length > 0;
    const hasDocs = documents.length > 0;

    if (!hasSummary && !hasFacts && !hasDocs) {
      toast.error("Please add a case summary, key facts, or upload documents before generating next steps.");
      return;
    }

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
          existingMissingItems: missingItems,
        },
      });

      if (error) {
        const errorMessage = typeof error === "object" && error.message ? error.message : String(error);
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("No response received from AI service");
      }

      const parsed = parseContentJson(data);

      if (parsed.error) {
        toast.warning(parsed.error);
        return;
      }

      const parsedSteps = parseCaseRecommendations(parsed.steps || []);
      const parsedMissingItems = parseMissingInfoActions(parsed.missingItems || missingItems);
      const nextStatus = parsed.status || getComputedStatus(summary, factsText, parsedSteps.length, documents.length);

      // Store strategic analysis sections for collapsible display
      setStrategicAnalysis({
        caseSummary: parsed.caseSummary || null,
        keyLegalIssues: parsed.keyLegalIssues || [],
        applicableLaws: parsed.applicableLaws || [],
        caseReferences: parsed.caseReferences || [],
        legalAnalysis: parsed.legalAnalysis || [],
        recommendedStrategy: parsed.recommendedStrategy || null,
        requiredDocuments: parsed.requiredDocuments || [],
        risksAndConsiderations: parsed.risksAndConsiderations || [],
        nextImmediateAction: parsed.nextImmediateAction || null,
        timelineAndDeadlines: parsed.timelineAndDeadlines || null,
      });

      const { data: updatedCase, error: updateError } = await db
        .from("cases")
        .update({
          last_recommendations: parsedSteps,
          ai_context: {
            ...(caseItem.ai_context || {}),
            missingItems: parsedMissingItems,
            lastDecisionAt: new Date().toISOString(),
            strategicAnalysis: {
              caseSummary: parsed.caseSummary,
              keyLegalIssues: parsed.keyLegalIssues,
              applicableLaws: parsed.applicableLaws,
              caseReferences: parsed.caseReferences,
              legalAnalysis: parsed.legalAnalysis,
              recommendedStrategy: parsed.recommendedStrategy,
              requiredDocuments: parsed.requiredDocuments,
              risksAndConsiderations: parsed.risksAndConsiderations,
              nextImmediateAction: parsed.nextImmediateAction,
              timelineAndDeadlines: parsed.timelineAndDeadlines,
            },
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
        title: "Generated legal execution brief",
        content: "AI generated a structured legal execution brief with analysis, strategy, and actionable next steps.",
        metadata: { steps: parsedSteps },
      });

      setCaseItem(updatedCase);
      await loadCase();

      if (data.fallback) {
        toast.warning("AI was temporarily unavailable — showing basic recommendations. Click again to retry.");
      } else {
        toast.success("Next steps updated");
      }
    } catch (err: any) {
      console.error("handleGenerateNextSteps error:", err);
      const message = err?.message || "Failed to generate next steps";
      if (message.includes("Rate limit")) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else if (message.includes("usage limit") || message.includes("credits")) {
        toast.error("AI usage limit reached. Please add credits to continue.");
      } else {
        toast.error(message);
      }
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

  const buildDynamicFileName = (docTitle: string, format: string) => {
    const docType = slugifyFileName(docTitle || "Document").replace(/-/g, "_");
    const client = clientName?.trim()
      ? clientName.trim().replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
      : "LicensifyAI";
    const date = new Date().toISOString().split("T")[0];
    return `${docType}_${client}_${date}.${format}`;
  };

  const exportWorkspace = async (format: "pdf" | "docx") => {
    setExportLoadingFormat(format);

    try {
      const product = currentWorkspaceProduct();
      const fileName = buildDynamicFileName(actionWorkspaceTitle || product.title || "legal-draft", format);
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

      // Collaboration activity log (versioned)
      await logActivity(
        caseItem.id,
        status === "approved" ? "draft_approved" : "draft_saved",
        `${status === "approved" ? "Approved" : "Saved"} v${version} of "${actionWorkspaceTitle || product.title}"`,
        { version, status, document_type: workspaceActionType },
        "case_draft",
      );

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
              <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold tracking-wider text-accent-foreground">
                {jurisdiction}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Client: {clientName}{opponent ? ` · Opponent: ${opponent}` : ""}</span>
              <button
                onClick={() => setShowJurisdictionChange(!showJurisdictionChange)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Change Jurisdiction
              </button>
            </div>
            {showJurisdictionChange && (
              <div className="mt-2 flex items-center gap-2">
                <Select
                  value=""
                  onValueChange={async (val) => {
                    if (!caseItem) return;
                    const newJurisdiction = val;
                    const updatedMeta = { ...(caseItem.case_metadata || {}), jurisdiction: newJurisdiction };
                    const updatedIntake = { ...(caseItem.intake_data || {}), jurisdiction: newJurisdiction };
                    const { error } = await db
                      .from("cases")
                      .update({ case_metadata: updatedMeta, intake_data: updatedIntake })
                      .eq("id", caseItem.id);
                    if (error) {
                      toast.error("Failed to update jurisdiction");
                    } else {
                      setCaseItem({ ...caseItem, case_metadata: updatedMeta, intake_data: updatedIntake });
                      setShowJurisdictionChange(false);
                      toast.success(`Jurisdiction changed to ${newJurisdiction}`);
                    }
                  }}
                >
                  <SelectTrigger className="w-[220px] h-8 text-xs">
                    <SelectValue placeholder="Select new jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK (England & Wales)">UK (England & Wales)</SelectItem>
                    <SelectItem value="UK (Scotland)">UK (Scotland)</SelectItem>
                    <SelectItem value="UK (Northern Ireland)">UK (Northern Ireland)</SelectItem>
                    <SelectItem value="US (Federal)">US (Federal)</SelectItem>
                    <SelectItem value="US (State)">US (State)</SelectItem>
                    <SelectItem value="European Union">European Union</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setShowJurisdictionChange(false)} className="text-xs">
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CasePresenceIndicator caseId={caseItem.id} />
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" onClick={() => refreshCaseUnderstanding(undefined)}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh AI Context
            </Button>
            <Button
              onClick={handleGenerateNextSteps}
              disabled={thinking || (!summary?.trim() && normalizeFacts(factsText).length === 0 && documents.length === 0)}
              title={!summary?.trim() && normalizeFacts(factsText).length === 0 && documents.length === 0 ? "Add case details or documents first" : ""}
            >
              {thinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {thinking ? "Analysing…" : "What should I do next?"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const docAction: CaseRecommendation = {
                  title: "Generate Legal Document",
                  actionLabel: "Generate draft",
                  actionType: "draft_document",
                  draftType: "legal_document",
                  priority: "medium",
                  documentCategory: "correspondence",
                  why: "Generate a legal document based on current case data.",
                  legalBasis: "",
                  confidence: "MEDIUM",
                };
                handleCaseAction(docAction, "top-generate-doc");
              }}
              disabled={actionBusyKey === "top-generate-doc"}
            >
              {actionBusyKey === "top-generate-doc" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Document
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const strategyAction: CaseRecommendation = {
                  title: "Refine Legal Strategy",
                  actionLabel: "Generate strategy",
                  actionType: "generate_strategy",
                  draftType: "strategic_assessment",
                  priority: "medium",
                  documentCategory: "strategy",
                  why: "Generate a comprehensive legal strategy assessment based on current case data.",
                  legalBasis: "",
                  confidence: "MEDIUM",
                };
                handleCaseAction(strategyAction, "top-refine-strategy");
              }}
              disabled={actionBusyKey === "top-refine-strategy"}
            >
              {actionBusyKey === "top-refine-strategy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scale className="mr-2 h-4 w-4" />}
              Refine Strategy
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">Legal Execution Status</h2>
              <span className="text-sm text-muted-foreground">{caseItem.progress_percentage || 0}% complete</span>
            </div>
            <Progress value={caseItem.progress_percentage || 0} className="h-2" />
            <p className="mt-3 text-sm text-muted-foreground">
              AI maintains the case summary, legal analysis, and execution plan as you edit data or upload documents.
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
            <TabsTrigger value="risks">Risks & Deadlines</TabsTrigger>
            {(caseItem.case_type === "litigation" || caseItem.case_type === "contract_dispute") && (
              <TabsTrigger value="litigation">Litigation</TabsTrigger>
            )}
            {(caseItem.case_type === "corporate" || caseItem.case_type === "advisory") && (
              <TabsTrigger value="corporate">Corporate</TabsTrigger>
            )}
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="vault">Vault</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="court-filing">Court Filing</TabsTrigger>
          </TabsList>

          <TabsContent value="court-filing">
            <CaseCourtFilingPanel
              caseId={caseItem.id}
              clientId={caseItem.client_id}
              defaultJurisdiction={(caseItem.case_metadata?.jurisdiction === "US" ? "US" : "UK") as "UK" | "US"}
              defaultTitle={caseItem.title || ""}
              caseFacts={[summary, factsText].filter(Boolean).join("\n\n")}
            />
          </TabsContent>

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
                    {caseItem?.case_metadata?.summaryPending && !summary ? (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Generating summary…
                      </div>
                    ) : (
                      <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} />
                    )}
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
                  requestBusyKey={requestBusyKey}
                  requestStatusByLabel={requestStatusByLabel}
                  strategicAnalysis={strategicAnalysis || caseItem?.ai_context?.strategicAnalysis || null}
                  onShowWhyChange={setShowWhy}
                  onAction={handleCaseAction}
                  onRequestFromClient={handleOpenSingleRequestDialog}
                  onRequestAllFromClient={handleOpenBulkRequestDialog}
                />

                <CaseInfoRequestsPanel
                  requests={infoRequests}
                  reminderBusyId={reminderBusyId}
                  onCopyLink={copyRequestLink}
                  onSendEmail={sendRequestEmail}
                  onSendReminder={handleSendReminder}
                  onOpenRequest={openRequestPage}
                />

                {latestRequestLink ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Client link ready</p>
                        <p className="mt-1 text-sm text-muted-foreground">Share this secure form with the client for {latestRequestLink.title.toLowerCase()}.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyRequestLink({ title: latestRequestLink.title, token: latestRequestLink.url.split("token=")[1] || "" })}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copy link
                        </Button>
                        <Button size="sm" onClick={() => window.open(latestRequestLink.url, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Open form
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground break-all">
                      {latestRequestLink.url}
                    </div>
                  </div>
                ) : null}

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
                        <div className="flex items-center gap-2">
                          {doc.storage_path && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 3600);
                                  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                                  else toast.error("Failed to open document");
                                }}
                              >
                                <ExternalLink className="mr-1 h-3 w-3" /> Open
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 3600, { download: true });
                                  if (data?.signedUrl) {
                                    const a = document.createElement("a");
                                    a.href = data.signedUrl;
                                    a.download = doc.name;
                                    a.click();
                                  } else {
                                    toast.error("Failed to download document");
                                  }
                                }}
                              >
                                <Download className="mr-1 h-3 w-3" /> Download
                              </Button>
                            </>
                          )}
                          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            {doc.file_type || "Unknown"}
                          </span>
                        </div>
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

          {/* Risks & Deadlines Tab */}
          <TabsContent value="risks">
            <div className="grid gap-4 lg:grid-cols-2">
              <RiskPanel
                risks={(caseItem.risks || []) as CaseRisk[]}
                onAdd={async (risk) => {
                  const updatedRisks = [...(caseItem.risks || []), risk];
                  await db.from("cases").update({ risks: updatedRisks }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, risks: updatedRisks });
                  toast.success("Risk added");
                }}
                onRemove={async (riskId) => {
                  const updatedRisks = ((caseItem.risks || []) as CaseRisk[]).filter((r: CaseRisk) => r.id !== riskId);
                  await db.from("cases").update({ risks: updatedRisks }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, risks: updatedRisks });
                  toast.success("Risk removed");
                }}
              />
              <DeadlinePanel
                deadlines={(caseItem.deadlines || []) as CaseDeadline[]}
                onAdd={async (deadline) => {
                  const updated = [...(caseItem.deadlines || []), deadline];
                  await db.from("cases").update({ deadlines: updated }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, deadlines: updated });
                  toast.success("Deadline added");
                }}
                onRemove={async (deadlineId) => {
                  const updated = ((caseItem.deadlines || []) as CaseDeadline[]).filter((d: CaseDeadline) => d.id !== deadlineId);
                  await db.from("cases").update({ deadlines: updated }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, deadlines: updated });
                }}
                onComplete={async (deadlineId) => {
                  const updated = ((caseItem.deadlines || []) as CaseDeadline[]).map((d: CaseDeadline) =>
                    d.id === deadlineId ? { ...d, status: "completed" as const } : d
                  );
                  await db.from("cases").update({ deadlines: updated }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, deadlines: updated });
                  toast.success("Deadline completed");
                }}
              />
            </div>
          </TabsContent>

          {/* Litigation Tab */}
          {(caseItem.case_type === "litigation" || caseItem.case_type === "contract_dispute") && (
            <TabsContent value="litigation">
              <LitigationPanel
                data={(caseItem.case_metadata?.litigation || { timeline: [], evidence: [], filings: [], courtDates: [] }) as LitigationData}
                onChange={async (litData) => {
                  const updated = { ...(caseItem.case_metadata || {}), litigation: litData };
                  await db.from("cases").update({ case_metadata: updated }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, case_metadata: updated });
                }}
              />
            </TabsContent>
          )}

          {/* Corporate Tab */}
          {(caseItem.case_type === "corporate" || caseItem.case_type === "advisory") && (
            <TabsContent value="corporate">
              <CorporatePanel
                data={(caseItem.case_metadata?.corporate || { dueDiligence: [], obligations: [], entities: [] }) as CorporateData}
                onChange={async (corpData) => {
                  const updated = { ...(caseItem.case_metadata || {}), corporate: corpData };
                  await db.from("cases").update({ case_metadata: updated }).eq("id", caseItem.id);
                  setCaseItem({ ...caseItem, case_metadata: updated });
                }}
              />
            </TabsContent>
          )}

          {/* Advanced Analysis Tab */}
          <TabsContent value="analysis">
            <div className="space-y-4">
              <DraftAnythingPanel
                loading={draftAnythingLoading}
                onDraft={handleDraftAnything}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <DualAnalysisPanel
                  data={dualAnalysis}
                  loading={advancedLoading === "dual-analysis"}
                  onGenerate={handleDualAnalysis}
                />
                <StrategyOptionsPanel
                  data={strategyOptions}
                  loading={advancedLoading === "strategy-options"}
                  onGenerate={handleStrategyOptions}
                />
              </div>
              <ExpandedCaseLawPanel
                data={expandedCaseLaw}
                loading={advancedLoading === "expanded-case-law"}
                onGenerate={handleExpandedCaseLaw}
                onInsertIntoDocument={(entry) => {
                  const citation = `${entry.caseName} (${entry.year}): ${entry.principle}`;
                  setActionWorkspaceContent(prev => prev ? `${prev}\n\n${citation}` : citation);
                  toast.success("Case law inserted into document workspace");
                }}
                onAddToArgument={(entry) => {
                  const citation = `${entry.caseName} (${entry.year}): ${entry.principle}. Application: ${entry.application}`;
                  setActionWorkspaceContent(prev => prev ? `${prev}\n\n${citation}` : citation);
                  toast.success("Case law added to argument");
                }}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <AppliedLawPanel
                  data={appliedLaw}
                  loading={advancedLoading === "applied-law"}
                  onGenerate={handleAppliedLaw}
                />
                <EvidenceGapPanel
                  data={evidenceGaps}
                  loading={advancedLoading === "evidence-gaps"}
                  onGenerate={handleEvidenceGaps}
                />
              </div>
              <ProceduralIntelligencePanel
                data={proceduralSteps}
                loading={advancedLoading === "procedural-intelligence"}
                onGenerate={handleProceduralIntelligence}
              />
            </div>
          </TabsContent>

          {/* In-Browser Editor Tab */}
          <TabsContent value="editor">
            <RichDocumentEditor
              content={actionWorkspaceContent || "<p>Start drafting your document here, or generate one from the Overview tab.</p>"}
              title={actionWorkspaceTitle || "New Document"}
              onChange={setActionWorkspaceContent}
              onTitleChange={setActionWorkspaceTitle}
              onSave={() => persistWorkspaceDraft("draft")}
              onExportWord={() => exportWorkspace("docx")}
              onExportPdf={() => exportWorkspace("pdf")}
              onAiAction={async (action, selected) => {
                try {
                  const { data, error } = await supabase.functions.invoke("case-ai", {
                    body: {
                      action: "edit-clause",
                      editType: action,
                      selectedText: selected,
                      caseType: caseItem.case_type,
                      jurisdiction,
                    },
                  });
                  if (error) throw error;
                  const parsed = parseContentJson(data);
                  return parsed.revisedText || parsed.content || null;
                } catch (err: any) {
                  toast.error(err.message || "AI edit failed");
                  return null;
                }
              }}
              isSaving={persistingDraft}
            />
            {drafts.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Version History</h3>
                <div className="space-y-2">
                  {drafts.slice(0, 10).map((draft) => (
                    <div key={draft.id} className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                      <div>
                        <p className="text-xs font-medium text-foreground">{draft.title}</p>
                        <p className="text-[10px] text-muted-foreground">v{draft.version_number} · {draft.status} · {formatRelativeDate(draft.created_at)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        setActionWorkspaceTitle(draft.title);
                        setActionWorkspaceContent(draft.content);
                        setWorkspaceProduct(draft.metadata?.structured || null);
                        setActiveTab("editor");
                        toast.success("Loaded version " + draft.version_number);
                      }}>
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

          <TabsContent value="vault">
            <CaseVaultTab caseId={caseItem.id} caseTitle={caseItem.title} />
          </TabsContent>

          <TabsContent value="versions">
            <VersionHistoryPanel
              documentType="case"
              documentId={caseItem.id}
              currentTitle={caseItem.title}
              currentContent={caseItem.case_summary || ""}
            />
          </TabsContent>

          <TabsContent value="activity">
            <CaseActivityFeed caseId={caseItem.id} />
          </TabsContent>

          <TabsContent value="comments">
            <DocumentCommentsPanel caseId={caseItem.id} documentType="case" documentId={caseItem.id} />
          </TabsContent>
        </Tabs>
      </div>

      <ShareCaseDialog
        caseId={caseItem.id}
        caseOwnerId={caseItem.user_id}
        caseTitle={caseItem.title}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <ClientInfoRequestDialog
        open={requestModalOpen}
        saving={requestSaving}
        itemLabel={selectedMissingItems.length === 1 ? selectedMissingItems[0]?.label : undefined}
        itemCount={selectedMissingItems.length}
        values={requestForm}
        onOpenChange={(open) => {
          setRequestModalOpen(open);
          if (!open) setSelectedMissingItems([]);
        }}
        onValueChange={(field, value) => setRequestForm((current) => ({ ...current, [field]: value }))}
        onSubmit={handleCreateClientRequest}
      />
    </AppShell>
  );
};

export default CaseDetail;