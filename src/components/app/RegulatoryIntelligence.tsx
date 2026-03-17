import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Brain, Loader2,
  TrendingUp, BarChart3, Lightbulb, AlertCircle, Wand2, Scale,
  MessageSquareWarning, HelpCircle, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisData {
  simulatedReview: {
    outcome: string;
    concerns: string[];
    expectedQuestions: string[];
    recommendation: string;
  };
  approvalScore: {
    overall: number;
    breakdown: Record<string, { score: number; detail: string }>;
    improvements: string[];
  };
  strategyRecommendation: {
    recommendedStrategy: string;
    reasoning: string;
    alternatives: string[];
    timeline: string;
  };
  issues: Array<{ issue: string; severity: string; why: string; fix: string }>;
  benchmark: Record<string, { rating: string; detail: string }>;
  consistencyChecks: Array<{ conflict: string; sections: string[]; suggestion: string }>;
  decisionAdvice: {
    ready: boolean;
    summary: string;
    missing: string[];
    nextSteps: string[];
  };
}

interface Props {
  applicationData: any;
  jurisdiction: string;
  licenseType: string;
  documentContent?: string;
  onImprovedDocument?: (content: string) => void;
}

const severityColor = (s: string) => {
  if (s === "critical") return "text-destructive bg-destructive/10 border-destructive/20";
  if (s === "warning") return "text-warning bg-warning/10 border-warning/20";
  return "text-primary bg-primary/10 border-primary/20";
};

const ratingColor = (r: string) => {
  if (r === "Strong") return "text-success";
  if (r === "Average") return "text-warning";
  return "text-destructive";
};

const outcomeStyle = (o: string) => {
  if (o?.includes("Approval")) return { icon: CheckCircle2, color: "text-success", bg: "bg-success/10 border-success/20" };
  if (o?.includes("High Risk")) return { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" };
  return { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/20" };
};

export function RegulatoryIntelligence({ applicationData, jurisdiction, licenseType, documentContent, onImprovedDocument }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("regulatory-analysis", {
        body: {
          action: "full-analysis",
          applicationData,
          jurisdiction,
          licenseType,
          documentContent: documentContent?.slice(0, 15000),
        },
      });
      if (error) throw error;

      const content = data.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      setAnalysis(parsed);
      toast.success("Regulatory analysis complete!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const makeItPass = async () => {
    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("regulatory-analysis", {
        body: {
          action: "make-it-pass",
          applicationData,
          jurisdiction,
          licenseType,
          documentContent: documentContent?.slice(0, 15000),
        },
      });
      if (error) throw error;
      onImprovedDocument?.(data.content || "");
      toast.success("Document improved and ready for review!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Improvement failed");
    } finally {
      setImproving(false);
    }
  };

  if (!analysis) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Regulatory Intelligence</h3>
            <p className="text-xs text-muted-foreground">AI-powered analysis, scoring, and recommendations</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Run a comprehensive regulatory analysis to simulate how regulators would review this application, identify weaknesses, predict questions, and get actionable recommendations.
        </p>
        <Button onClick={runAnalysis} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing Application…" : "Run Regulatory Analysis"}
        </Button>
      </div>
    );
  }

  const oc = outcomeStyle(analysis.simulatedReview?.outcome);
  const OutcomeIcon = oc.icon;

  return (
    <div className="space-y-4">
      {/* Top summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Approval Score */}
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Approval Likelihood</p>
          <p className={`font-display text-3xl font-bold ${
            analysis.approvalScore.overall >= 70 ? "text-success" :
            analysis.approvalScore.overall >= 40 ? "text-warning" : "text-destructive"
          }`}>{analysis.approvalScore.overall}%</p>
          <Progress value={analysis.approvalScore.overall} className="mt-2 h-1.5" />
        </div>

        {/* Simulated Outcome */}
        <div className={`rounded-xl border p-4 text-center ${oc.bg}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Simulated Outcome</p>
          <div className="flex items-center justify-center gap-2">
            <OutcomeIcon className={`h-5 w-5 ${oc.color}`} />
            <p className={`font-display text-sm font-bold ${oc.color}`}>{analysis.simulatedReview.outcome}</p>
          </div>
        </div>

        {/* Decision */}
        <div className={`rounded-xl border p-4 text-center ${
          analysis.decisionAdvice.ready ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"
        }`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Decision</p>
          <p className={`font-display text-sm font-bold ${analysis.decisionAdvice.ready ? "text-success" : "text-destructive"}`}>
            {analysis.decisionAdvice.ready ? "Ready to Submit" : "Not Ready"}
          </p>
        </div>
      </div>

      {/* Make It Pass button */}
      {!analysis.decisionAdvice.ready && documentContent && (
        <Button onClick={makeItPass} disabled={improving} className="w-full" variant="default">
          {improving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {improving ? "Improving Application…" : "\"Make It Pass\" — Auto-Improve Application"}
        </Button>
      )}

      {/* Tabbed detail view */}
      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="scores" className="text-xs flex-1 min-w-[80px]"><BarChart3 className="mr-1 h-3 w-3" /> Scores</TabsTrigger>
          <TabsTrigger value="issues" className="text-xs flex-1 min-w-[80px]"><AlertCircle className="mr-1 h-3 w-3" /> Issues</TabsTrigger>
          <TabsTrigger value="questions" className="text-xs flex-1 min-w-[80px]"><HelpCircle className="mr-1 h-3 w-3" /> Questions</TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs flex-1 min-w-[80px]"><Lightbulb className="mr-1 h-3 w-3" /> Strategy</TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs flex-1 min-w-[80px]"><Scale className="mr-1 h-3 w-3" /> Benchmark</TabsTrigger>
          <TabsTrigger value="advice" className="text-xs flex-1 min-w-[80px]"><MessageSquareWarning className="mr-1 h-3 w-3" /> Advise Me</TabsTrigger>
        </TabsList>

        {/* Scores Tab */}
        <TabsContent value="scores">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h4 className="font-display text-sm font-semibold text-foreground">Approval Score Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(analysis.approvalScore.breakdown).map(([key, val]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className={`text-xs font-bold ${val.score >= 7 ? "text-success" : val.score >= 4 ? "text-warning" : "text-destructive"}`}>
                      {val.score}/10
                    </span>
                  </div>
                  <Progress value={val.score * 10} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">{val.detail}</p>
                </div>
              ))}
            </div>
            {analysis.approvalScore.improvements?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">How to Improve</h5>
                <ul className="space-y-1.5">
                  {analysis.approvalScore.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">
              Detected Issues ({analysis.issues?.length || 0})
            </h4>
            {analysis.issues?.length > 0 ? analysis.issues.map((issue, i) => (
              <div key={i} className={`rounded-lg border p-3 ${severityColor(issue.severity)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">{issue.severity}</span>
                </div>
                <p className="text-sm font-medium mb-1">{issue.issue}</p>
                <p className="text-xs opacity-80 mb-2"><strong>Why:</strong> {issue.why}</p>
                <div className="flex items-start gap-1.5 text-xs">
                  <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                  <span><strong>Fix:</strong> {issue.fix}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No issues detected.</p>
            )}
            {/* Consistency checks */}
            {analysis.consistencyChecks?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 text-warning" /> Consistency Warnings
                </h5>
                {analysis.consistencyChecks.map((c, i) => (
                  <div key={i} className="rounded-lg border border-warning/20 bg-warning/5 p-3 mb-2">
                    <p className="text-sm font-medium text-foreground">{c.conflict}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sections: {c.sections?.join(", ")}</p>
                    <p className="text-xs text-muted-foreground"><strong>Fix:</strong> {c.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Likely Regulator Questions</h4>
            <p className="text-xs text-muted-foreground">Questions the regulator is likely to ask after reviewing this application.</p>
            <div className="space-y-2">
              {analysis.simulatedReview.expectedQuestions?.map((q, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground">{q}</p>
                </div>
              ))}
            </div>
            {/* Concerns */}
            {analysis.simulatedReview.concerns?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Regulator Concerns</h5>
                <ul className="space-y-1.5">
                  {analysis.simulatedReview.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h4 className="font-display text-sm font-semibold text-foreground">Strategy Recommendation</h4>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Recommended</span>
              </div>
              <p className="text-sm font-medium text-foreground">{analysis.strategyRecommendation.recommendedStrategy}</p>
              <p className="text-xs text-muted-foreground mt-2">{analysis.strategyRecommendation.reasoning}</p>
              {analysis.strategyRecommendation.timeline && (
                <p className="text-xs text-muted-foreground mt-1"><strong>Timeline:</strong> {analysis.strategyRecommendation.timeline}</p>
              )}
            </div>
            {analysis.strategyRecommendation.alternatives?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Alternative Strategies</h5>
                <ul className="space-y-1.5">
                  {analysis.strategyRecommendation.alternatives.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Benchmark Tab */}
        <TabsContent value="benchmark">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Benchmark Comparison</h4>
            <p className="text-xs text-muted-foreground">How this application compares to typical approved applications.</p>
            <div className="space-y-2">
              {Object.entries(analysis.benchmark || {}).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <div>
                    <span className="text-sm font-medium text-foreground capitalize">{key}</span>
                    <p className="text-xs text-muted-foreground">{val.detail}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase ${ratingColor(val.rating)}`}>
                    {val.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Advise Me Tab */}
        <TabsContent value="advice">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className={`h-5 w-5 ${analysis.decisionAdvice.ready ? "text-success" : "text-destructive"}`} />
              <h4 className="font-display text-sm font-semibold text-foreground">Decision Advisory</h4>
            </div>
            <div className={`rounded-lg border p-4 ${
              analysis.decisionAdvice.ready ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"
            }`}>
              <p className={`text-sm font-semibold ${analysis.decisionAdvice.ready ? "text-success" : "text-destructive"}`}>
                {analysis.decisionAdvice.ready ? "✓ Client is ready for submission" : "✗ Client is NOT ready for submission"}
              </p>
              <p className="text-sm text-foreground mt-2">{analysis.decisionAdvice.summary}</p>
            </div>
            {analysis.decisionAdvice.missing?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">What's Missing</h5>
                <ul className="space-y-1.5">
                  {analysis.decisionAdvice.missing.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.decisionAdvice.nextSteps?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Next Steps</h5>
                <ol className="space-y-1.5">
                  {analysis.decisionAdvice.nextSteps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Re-run and recommendation */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Brain className="mr-1 h-3 w-3" />}
          Re-Run Analysis
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          <strong>Recommendation:</strong> {analysis.simulatedReview.recommendation}
        </p>
      </div>
    </div>
  );
}
