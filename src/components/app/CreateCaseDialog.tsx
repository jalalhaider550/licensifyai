import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CASE_TYPES, type CaseTypeValue, getCaseTypeLabel, normalizeFacts } from "@/lib/cases";

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (caseId: string) => void;
}

interface ClientOption {
  id: string;
  company_name: string;
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const parseContentJson = (payload: any) => {
  const content = payload?.content || "{}";
  try {
    const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
    return jsonMatch ? JSON.parse(jsonMatch[0]) : typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return {};
  }
};

export const CreateCaseDialog = ({ open, onOpenChange, onCreated }: CreateCaseDialogProps) => {
  const { user } = useAuth();
  const db = supabase as any;
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [caseType, setCaseType] = useState<CaseTypeValue | "">("");
  const [linkedClientId, setLinkedClientId] = useState<string>("none");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [intakeData, setIntakeData] = useState<Record<string, any>>({});
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const linkedClient = useMemo(
    () => clients.find((client) => client.id === linkedClientId),
    [clients, linkedClientId],
  );

  useEffect(() => {
    if (!open || !user) return;

    db
      .from("clients")
      .select("id, company_name")
      .order("company_name")
      .then(({ data, error }: any) => {
        if (error) {
          toast.error("Failed to load clients");
          return;
        }
        setClients(data || []);
      });
  }, [db, open, user]);

  useEffect(() => {
    if (!open) {
      setCaseType("");
      setLinkedClientId("none");
      setMessages([]);
      setDraftAnswer("");
      setIntakeData({});
      setLoadingPrompt(false);
      setCreating(false);
      setIsComplete(false);
    }
  }, [open]);

  const runIntake = async (conversation: ChatMessage[], currentData: Record<string, any>) => {
    if (!caseType) return;
    setLoadingPrompt(true);

    try {
      const { data, error } = await supabase.functions.invoke("case-ai", {
        body: {
          action: "chat-intake",
          caseType,
          messages: conversation,
          currentData,
        },
      });

      if (error) throw error;

      const parsed = parseContentJson(data);
      const mergedIntake = {
        ...currentData,
        ...(parsed.structuredData || {}),
      };

      if (linkedClient?.company_name && !mergedIntake.client_name) {
        mergedIntake.client_name = linkedClient.company_name;
      }

      setIntakeData(mergedIntake);
      setIsComplete(Boolean(parsed.isComplete));

      if (parsed.nextQuestion) {
        setMessages([...conversation, { role: "assistant" as const, content: parsed.nextQuestion }]);
      } else {
        setMessages(conversation);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "AI intake failed");
    } finally {
      setLoadingPrompt(false);
    }
  };

  const startIntake = async () => {
    if (!caseType) {
      toast.error("Select a case type first");
      return;
    }

    const seededData = linkedClient?.company_name ? { client_name: linkedClient.company_name } : {};
    await runIntake([], seededData);
  };

  const sendAnswer = async () => {
    const value = draftAnswer.trim();
    if (!value || loadingPrompt) return;

    const nextConversation: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(nextConversation);
    setDraftAnswer("");
    await runIntake(nextConversation, intakeData);
  };

  const createCase = async () => {
    if (!user || !caseType) return;
    setCreating(true);

    try {
      const summaryPayload: Record<string, any> = {
        ...intakeData,
        client_name: intakeData.client_name || linkedClient?.company_name || "New client",
      };

      const { data: summaryData, error: summaryError } = await supabase.functions.invoke("case-ai", {
        body: {
          action: "summarize-case",
          caseType,
          caseData: summaryPayload,
          documents: [],
          previousActions: [],
        },
      });

      if (summaryError) throw summaryError;
      const summaryParsed = parseContentJson(summaryData);
      const title =
        summaryParsed.title ||
        `${getCaseTypeLabel(caseType)} — ${summaryPayload.client_name}`;

      const { data: createdCase, error: caseError } = await db
        .from("cases")
        .insert({
          user_id: user.id,
          client_id: linkedClientId !== "none" ? linkedClientId : null,
          title,
          case_type: caseType,
          client_name: summaryPayload.client_name,
          opponent: summaryPayload.opponent || null,
          case_summary: summaryParsed.summary || summaryPayload.case_summary || "",
          key_facts: normalizeFacts(summaryParsed.keyFacts || summaryPayload.key_facts),
          intake_data: summaryPayload,
          ai_context: {
            missingItems: summaryParsed.missingItems || [],
            lastSummaryAt: new Date().toISOString(),
            source: "chat_intake",
          },
          status: "active",
          progress_percentage: summaryParsed.progressPercentage || 20,
        })
        .select("id")
        .single();

      if (caseError) throw caseError;

      await db.from("case_activities").insert({
        case_id: createdCase.id,
        user_id: user.id,
        activity_type: "intake",
        title: "Case created via AI intake",
        content: `Created ${getCaseTypeLabel(caseType)} case with chat intake.`,
        metadata: { case_type: caseType },
      });

      toast.success("Case created");
      onOpenChange(false);
      onCreated?.(createdCase.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create case");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Plus className="h-4 w-4 text-primary" /> Create Case
          </DialogTitle>
          <DialogDescription>
            Start with AI chat intake, then Licensify will turn the answers into structured case data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Case type</Label>
            <Select value={caseType} onValueChange={(value) => setCaseType(value as CaseTypeValue)}>
              <SelectTrigger>
                <SelectValue placeholder="Select case type" />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Link existing client (optional)</Label>
            <Select value={linkedClientId} onValueChange={setLinkedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="No linked client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/40 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">AI intake</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The intake chat will collect client name, opponent, what happened, and the key facts for this {caseType ? getCaseTypeLabel(caseType).toLowerCase() : "new"} case.
                </p>
              </div>
            </div>
            <Button onClick={startIntake} className="mt-4" disabled={!caseType || loadingPrompt}>
              {loadingPrompt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
              Start AI Intake
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] rounded-xl px-3 py-2 text-sm ${
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "ml-auto bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {loadingPrompt && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Textarea
                value={draftAnswer}
                onChange={(event) => setDraftAnswer(event.target.value)}
                placeholder="Type your answer…"
                rows={3}
              />
              <Button onClick={sendAnswer} disabled={!draftAnswer.trim() || loadingPrompt} className="sm:self-end">
                Send
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Structured intake preview</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-foreground">{intakeData.client_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opponent</p>
                  <p className="text-foreground">{intakeData.opponent || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Case summary</p>
                  <p className="text-foreground">{intakeData.case_summary || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Key facts</p>
                  <ul className="mt-1 space-y-1 text-foreground">
                    {normalizeFacts(intakeData.key_facts).length > 0 ? (
                      normalizeFacts(intakeData.key_facts).map((fact) => <li key={fact}>• {fact}</li>)
                    ) : (
                      <li>—</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={createCase} disabled={!caseType || messages.length === 0 || loadingPrompt || creating || !isComplete}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};