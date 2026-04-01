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
  Send, FileText, Sparkles, Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const STEP_CONFIG = [
  { key: "client_intake", label: "Client Intake", aiAction: "Request info" },
  { key: "contract_pack", label: "Contract Pack", aiAction: "Generate contract pack" },
  { key: "searches", label: "Searches", aiAction: "Order searches" },
  { key: "enquiries", label: "Enquiries", aiAction: "Generate enquiries" },
  { key: "mortgage", label: "Mortgage", aiAction: "Check mortgage status" },
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
  client_type: string;
  price: number;
  current_step: string;
  status: string;
  notes: string;
}

const statusIcon = (s: string) => {
  if (s === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (s === "blocked") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

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

  const currentStepData = steps.find((s) => s.step_key === activeStep);
  const currentConfig = STEP_CONFIG.find((s) => s.key === activeStep);

  const handleAiAction = async () => {
    if (!caseData || !currentConfig || !user) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("case-ai", {
        body: {
          action: "conveyancing-step",
          stepKey: activeStep,
          stepLabel: currentConfig.label,
          propertyAddress: caseData.property_address,
          clientType: caseData.client_type,
          price: caseData.price,
          caseId: id,
        },
      });

      if (error) throw error;

      const result = data?.result || data;
      if (result?.error) {
        toast({ title: result.error, variant: "destructive" });
      } else {
        // Save AI output to step
        if (currentStepData) {
          await supabase
            .from("conveyancing_steps" as any)
            .update({ ai_output: result, status: "done", completed_at: new Date().toISOString() } as any)
            .eq("id", currentStepData.id);
        }
        // Advance current step
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
      }
    } catch (err: any) {
      toast({ title: "AI action failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: message.trim() }]);
    setMessage("");
    // Simulate response (in real app would tie to case-collaboration)
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
          {caseData.price > 0 && <span className="text-sm text-muted-foreground">£{caseData.price.toLocaleString()}</span>}
        </div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left: Workflow Steps */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3">
              {STEP_CONFIG.map((step) => {
                const sd = steps.find((s) => s.step_key === step.key);
                const isActive = activeStep === step.key;
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
                    <span className="truncate">{step.label}</span>
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
              {/* Missing items */}
              {currentStepData?.missing_items && currentStepData.missing_items.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive mb-1">What's Missing</p>
                  <ul className="text-xs text-destructive/80 space-y-0.5">
                    {currentStepData.missing_items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI output */}
              {currentStepData?.ai_output && typeof currentStepData.ai_output === "object" && Object.keys(currentStepData.ai_output).length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-foreground mb-2">AI Output</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {typeof currentStepData.ai_output === "string"
                      ? currentStepData.ai_output
                      : JSON.stringify(currentStepData.ai_output, null, 2)}
                  </pre>
                </div>
              )}

              {/* AI Action button */}
              {currentConfig && currentStepData?.status !== "done" && (
                <Button onClick={handleAiAction} disabled={aiLoading} className="w-full gap-2">
                  {aiLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> {currentConfig.aiAction}</>
                  )}
                </Button>
              )}

              {currentStepData?.status === "done" && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Step Complete</p>
                </div>
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
