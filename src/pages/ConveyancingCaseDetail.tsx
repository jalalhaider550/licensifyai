import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, CheckCircle2, Circle, AlertTriangle, Loader2,
  Send, FileText, Sparkles, Home, LinkIcon, ClipboardList, BarChart3,
  RefreshCw, ShieldAlert, ChevronDown, ChevronUp,
} from "lucide-react";
import { ConveyancingIntakeForm } from "@/components/app/ConveyancingIntakeForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const STEP_CONFIG = [
  { key: "client_intake", label: "Client Intake", aiAction: "Analyse intake" },
  { key: "contract_pack", label: "Contract Pack", aiAction: "Generate contract pack" },
  { key: "searches", label: "Searches", aiAction: "Run searches analysis" },
  { key: "enquiries", label: "Enquiries", aiAction: "Generate enquiries" },
  { key: "mortgage", label: "Mortgage", aiAction: "Review mortgage" },
  { key: "report", label: "Report", aiAction: "Generate report" },
  { key: "exchange", label: "Exchange", aiAction: "Prepare exchange" },
  { key: "completion", label: "Completion", aiAction: "Prepare completion" },
  { key: "post_completion", label: "Post-Completion", aiAction: "Post-completion tasks" },
];

interface StepData {
  id: string;
  step_key: string;
  status: string;
  missing_items: string[];
  ai_output: any;
  completed_at: string | null;
}

interface CaseData {
  id: string;
  property_address: string;
  postcode: string;
  client_type: string;
  client_name: string;
  transaction_type: string;
  price: number;
  tenure: string;
  property_category: string;
  mortgage_status: string;
  current_step: string;
  status: string;
  readiness_score: number;
  notes: string;
  other_side_name: string;
  other_side_firm: string;
  target_completion_date: string | null;
  intake_token: string | null;
  estate_agent: string;
  referral_source: string;
}

interface AISection {
  title: string;
  content: string;
}

const statusIcon = (s: string) => {
  if (s === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (s === "blocked") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

/* ── Render structured AI output sections ── */
function AISectionsDisplay({ data }: { data: any }) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!data) return null;

  const sections: AISection[] = data.sections || [];
  const riskLevel = data.riskLevel || data.overallRisk;
  const nextAction = data.nextAction;
  const validationFailed = data.validationFailed;

  if (sections.length === 0) return null;

  const riskColor = riskLevel === "HIGH" ? "text-destructive" : riskLevel === "MEDIUM" ? "text-yellow-600" : riskLevel === "LOW" ? "text-primary" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* Risk badge + validation warning */}
      {riskLevel && (
        <div className="flex items-center gap-2">
          {validationFailed ? (
            <Badge variant="destructive" className="gap-1 text-xs">
              <ShieldAlert className="h-3 w-3" /> Missing Data
            </Badge>
          ) : (
            <Badge variant="outline" className={`text-xs ${riskColor}`}>
              Risk: {riskLevel}
            </Badge>
          )}
          {data.completeness !== undefined && (
            <Badge variant="secondary" className="text-xs">Completeness: {data.completeness}%</Badge>
          )}
          {data.fallback && (
            <Badge variant="secondary" className="text-xs text-yellow-600">Fallback response</Badge>
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map((section, i) => {
        const isCollapsed = collapsed[i];
        return (
          <div key={i} className="rounded-lg border bg-card">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
              onClick={() => setCollapsed(prev => ({ ...prev, [i]: !prev[i] }))}
            >
              <span className="text-sm font-semibold text-foreground">{section.title}</span>
              {isCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            {!isCollapsed && (
              <div className="px-3 pb-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {section.content}
              </div>
            )}
          </div>
        );
      })}

      {/* Next action */}
      {nextAction && !validationFailed && (
        <div className="rounded-lg border-primary/30 bg-primary/5 border p-3">
          <p className="text-xs font-semibold text-primary mb-0.5">Next Action</p>
          <p className="text-xs text-foreground">{nextAction}</p>
        </div>
      )}

      {/* Deadlines */}
      {data.deadlines && data.deadlines.length > 0 && (
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">Key Deadlines</p>
          {data.deadlines.map((d: any, i: number) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{d.task}</span>
              <span className="font-medium text-foreground">{d.deadline}</span>
            </div>
          ))}
        </div>
      )}

      {/* Searches required */}
      {data.searchesRequired && data.searchesRequired.length > 0 && (
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">Searches Required</p>
          {data.searchesRequired.map((s: any, i: number) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{s.name}</span>
              <div className="flex gap-2">
                <Badge variant={s.priority === "essential" ? "destructive" : "secondary"} className="text-[10px]">{s.priority}</Badge>
                <span className="text-foreground">{s.estimatedCost}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConveyancingCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [activeStep, setActiveStep] = useState<string>("client_intake");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      setLoading(true);
      const [caseRes, stepsRes] = await Promise.all([
        supabase.from("conveyancing_cases" as any).select("*").eq("id", id).single(),
        supabase.from("conveyancing_steps" as any).select("*").eq("case_id", id).order("created_at", { ascending: true }),
      ]);
      if (caseRes.error) {
        toast({ title: "Case not found", variant: "destructive" });
        navigate("/conveyancing");
        return;
      }
      setCaseData(caseRes.data as any);
      setSteps((stepsRes.data as any[]) || []);
      setActiveStep((caseRes.data as any).current_step || "client_intake");
      setLoading(false);
    };
    load();
  }, [user, id]);

  // When active step changes, load existing AI output
  useEffect(() => {
    const stepData = steps.find(s => s.step_key === activeStep);
    if (stepData?.ai_output && typeof stepData.ai_output === "object" && Object.keys(stepData.ai_output).length > 0) {
      setAiResult(stepData.ai_output);
    } else {
      setAiResult(null);
    }
  }, [activeStep, steps]);

  const currentStepData = steps.find((s) => s.step_key === activeStep);
  const currentConfig = STEP_CONFIG.find((s) => s.key === activeStep);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const totalMissing = steps.reduce((acc, s) => acc + (s.missing_items?.length || 0), 0);

  const handleAiAction = async () => {
    if (!caseData || !currentConfig || !user) return;
    setAiLoading(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("conveyancing-ai", {
        body: {
          step: activeStep,
          caseId: id,
          propertyAddress: caseData.property_address,
          postcode: caseData.postcode,
          clientName: caseData.client_name,
          clientType: caseData.client_type,
          transactionType: caseData.transaction_type,
          price: caseData.price,
          tenure: caseData.tenure,
          propertyCategory: caseData.property_category,
          mortgageStatus: caseData.mortgage_status,
          otherSideName: caseData.other_side_name,
          otherSideFirm: caseData.other_side_firm,
          estateAgent: caseData.estate_agent,
          targetCompletionDate: caseData.target_completion_date,
        },
      });

      if (error) throw error;

      const result = data?.data;
      if (!result) {
        throw new Error(data?.error || "No data returned from AI");
      }

      setAiResult(result);

      // If validation failed, don't mark step as done
      if (result.validationFailed) {
        toast({ title: "Missing information", description: `Please add: ${result.missingFields?.join(", ")}`, variant: "destructive" });
        return;
      }

      // Store AI output and mark step done
      if (currentStepData) {
        await supabase
          .from("conveyancing_steps" as any)
          .update({ ai_output: result, status: "done", completed_at: new Date().toISOString() } as any)
          .eq("id", currentStepData.id);
      }

      // Advance to next step
      const stepIndex = STEP_CONFIG.findIndex((s) => s.key === activeStep);
      if (stepIndex < STEP_CONFIG.length - 1) {
        const nextStep = STEP_CONFIG[stepIndex + 1].key;
        await supabase
          .from("conveyancing_cases" as any)
          .update({ current_step: nextStep } as any)
          .eq("id", id);
        setCaseData((prev) => prev ? { ...prev, current_step: nextStep } : prev);
      }

      // Refresh steps
      const { data: refreshed } = await supabase
        .from("conveyancing_steps" as any)
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: true });
      setSteps((refreshed as any[]) || []);
      toast({ title: `${currentConfig.label} completed` });

    } catch (err: any) {
      const errMsg = err?.message || "AI action failed";
      toast({ title: "AI Error", description: errMsg, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: message.trim() }]);
    setMessage("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "system", text: "Message received. This will be linked to the case timeline." }]);
    }, 600);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!caseData) return null;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/conveyancing")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Home className="h-4 w-4 text-primary shrink-0" />
            <h1 className="text-lg font-bold text-foreground truncate">{caseData.property_address}</h1>
          </div>
          <Badge variant="outline" className="capitalize">{caseData.client_type}</Badge>
          <Badge variant="secondary" className="capitalize">{caseData.transaction_type}</Badge>
          {caseData.price > 0 && <span className="text-sm text-muted-foreground">£{caseData.price.toLocaleString()}</span>}
        </div>

        {/* Post-creation banner */}
        {doneCount === 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Case Readiness: {caseData.readiness_score}%</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{totalMissing} items missing</Badge>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${caseData.readiness_score}%` }} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Next actions:</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
                  if (!caseData.intake_token) {
                    toast({ title: "No intake token found", variant: "destructive" });
                    return;
                  }
                  const link = `${window.location.origin}/conveyancing-intake?token=${caseData.intake_token}`;
                  try {
                    await navigator.clipboard.writeText(link);
                    toast({ title: "Client intake link copied to clipboard!" });
                  } catch {
                    prompt("Copy this link and send it to your client:", link);
                  }
                }}>
                  <LinkIcon className="h-3.5 w-3.5" /> Send Client Intake Link
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                  const step = caseData.client_type === "seller" ? "contract_pack" : "searches";
                  setActiveStep(step);
                }}>
                  <ClipboardList className="h-3.5 w-3.5" />
                  {caseData.client_type === "seller" ? "Prepare Contract Pack" : "Order Searches"}
                </Button>
              </div>
              {caseData.tenure === "leasehold" && (
                <p className="text-[11px] text-primary font-medium">⚡ Leasehold detected — additional enquiries will be flagged</p>
              )}
              {caseData.mortgage_status === "yes" && (
                <p className="text-[11px] text-primary font-medium">⚡ Mortgage confirmed — lender checks enabled</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Case info strip */}
        {caseData.client_name && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-b border-border pb-3">
            <span><strong className="text-foreground">Client:</strong> {caseData.client_name}</span>
            {caseData.other_side_name && <span><strong className="text-foreground">Other side:</strong> {caseData.other_side_name}</span>}
            {caseData.other_side_firm && <span><strong className="text-foreground">Firm:</strong> {caseData.other_side_firm}</span>}
            <span><strong className="text-foreground">Tenure:</strong> {caseData.tenure}</span>
            <span><strong className="text-foreground">Mortgage:</strong> {caseData.mortgage_status}</span>
            {caseData.target_completion_date && <span><strong className="text-foreground">Target:</strong> {new Date(caseData.target_completion_date).toLocaleDateString()}</span>}
          </div>
        )}

        {/* 3-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left: Workflow Steps */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Workflow ({doneCount}/{steps.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3">
              {STEP_CONFIG.map((step) => {
                const sd = steps.find((s) => s.step_key === step.key);
                const isActive = activeStep === step.key;
                const missing = sd?.missing_items?.length || 0;
                return (
                  <button
                    key={step.key}
                    onClick={() => setActiveStep(step.key)}
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {statusIcon(sd?.status || "pending")}
                    <span className="truncate flex-1">{step.label}</span>
                    {missing > 0 && sd?.status !== "done" && (
                      <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-1.5">{missing}</span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Center: Current Task */}
          <Card className="md:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {currentConfig?.label}
                {currentStepData && (
                  <Badge variant={currentStepData.status === "done" ? "default" : currentStepData.status === "blocked" ? "destructive" : "secondary"} className="text-[10px]">
                    {currentStepData.status}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show intake form for client_intake step */}
              {activeStep === "client_intake" && currentStepData?.status !== "done" && caseData ? (
                <ConveyancingIntakeForm
                  caseId={caseData.id}
                  caseData={{
                    property_address: caseData.property_address,
                    postcode: caseData.postcode,
                    client_name: caseData.client_name,
                    client_type: caseData.client_type,
                    price: caseData.price,
                    tenure: caseData.tenure,
                    property_category: caseData.property_category,
                    mortgage_status: caseData.mortgage_status,
                  }}
                  onComplete={async () => {
                    if (currentStepData) {
                      await supabase
                        .from("conveyancing_steps" as any)
                        .update({ status: "done", completed_at: new Date().toISOString() } as any)
                        .eq("id", currentStepData.id);
                    }
                    const nextStep = STEP_CONFIG[1].key;
                    await supabase
                      .from("conveyancing_cases" as any)
                      .update({ current_step: nextStep } as any)
                      .eq("id", id);
                    setCaseData((prev) => prev ? { ...prev, current_step: nextStep } : prev);
                    const { data: refreshed } = await supabase
                      .from("conveyancing_steps" as any)
                      .select("*")
                      .eq("case_id", id)
                      .order("created_at", { ascending: true });
                    setSteps((refreshed as any[]) || []);
                    setActiveStep(nextStep);
                  }}
                />
              ) : (
                <>
                  {/* Missing items */}
                  {currentStepData?.missing_items && currentStepData.missing_items.length > 0 && currentStepData.status !== "done" && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs font-semibold text-destructive mb-1">What's Missing</p>
                      <ul className="text-xs text-destructive/80 space-y-0.5">
                        {currentStepData.missing_items.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI Result — structured sections */}
                  {aiResult && <AISectionsDisplay data={aiResult} />}

                  {/* AI output from saved step data (when no live result) */}
                  {!aiResult && currentStepData?.ai_output && typeof currentStepData.ai_output === "object" && 
                   Object.keys(currentStepData.ai_output).length > 0 && currentStepData.ai_output.sections && (
                    <AISectionsDisplay data={currentStepData.ai_output} />
                  )}

                  {/* Legacy AI output (pre-upgrade data) */}
                  {!aiResult && currentStepData?.ai_output && typeof currentStepData.ai_output === "object" && 
                   Object.keys(currentStepData.ai_output).length > 0 && !currentStepData.ai_output.sections && (
                    <div className="rounded-lg border bg-muted/50 p-3 max-h-64 overflow-y-auto">
                      <p className="text-xs font-semibold text-foreground mb-2">AI Output</p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(currentStepData.ai_output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* AI Action buttons */}
                  {currentConfig && currentStepData?.status !== "done" && (
                    <div className="flex gap-2">
                      <Button onClick={handleAiAction} disabled={aiLoading} className="flex-1 gap-2">
                        {aiLoading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> {currentConfig.aiAction}</>
                        )}
                      </Button>
                      {aiResult?.validationFailed && (
                        <Button variant="outline" size="icon" onClick={handleAiAction} disabled={aiLoading} title="Retry">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Re-run for completed steps */}
                  {currentStepData?.status === "done" && (
                    <div className="space-y-3">
                      <div className="text-center py-2">
                        <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">Step Complete</p>
                      </div>
                      <Button variant="outline" onClick={handleAiAction} disabled={aiLoading} className="w-full gap-2 text-xs">
                        {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Re-run analysis
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Right: Documents + Chat */}
          <div className="md:col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Documents uploaded during each step will appear here.</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col" style={{ maxHeight: "320px" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Messages</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-3 pt-0 gap-2 min-h-0">
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-2">
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`rounded-lg px-3 py-2 text-xs ${m.role === "user" ? "bg-primary/10 text-foreground ml-4" : "bg-muted text-muted-foreground mr-4"}`}>
                        {m.text}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 pt-1">
                  <Textarea
                    placeholder="Type a message…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="text-xs min-h-[36px] max-h-[72px]"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSendMessage} disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
