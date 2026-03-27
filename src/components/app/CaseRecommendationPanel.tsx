import { AlertCircle, ArrowRight, Brain, ChevronDown, ChevronRight, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { type CaseRecommendation, type MissingInfoAction, normalizeCasePriority } from "@/lib/cases";

interface StrategicAnalysis {
  caseSummary?: { facts?: string; parties?: string[]; jurisdiction?: string; assumptions?: string[] };
  keyLegalIssues?: { issue: string; significance: string }[];
  applicableLaws?: { statute: string; relevance: string; jurisdiction?: string }[];
  legalAnalysis?: { issue: string; rule: string; application: string; conclusion: string; confidence: string }[];
  recommendedStrategy?: { bestOption: string; alternatives?: string[]; reasoning: string };
  requiredDocuments?: { document: string; purpose: string; canGenerate?: boolean }[];
  risksAndConsiderations?: { type: string; risk: string; probability: string; mitigation: string }[];
  nextImmediateAction?: string;
}

interface CaseRecommendationPanelProps {
  recommendations: CaseRecommendation[];
  missingItems: MissingInfoAction[];
  showWhy: boolean;
  busyKey: string | null;
  requestBusyKey?: string | null;
  requestStatusByLabel?: Record<string, string>;
  strategicAnalysis?: StrategicAnalysis | null;
  onShowWhyChange: (value: boolean) => void;
  onAction: (item: CaseRecommendation | MissingInfoAction, key: string) => void;
  onRequestFromClient?: (item: MissingInfoAction, key: string) => void;
  onRequestAllFromClient?: (items: MissingInfoAction[], key: string) => void;
}

const priorityStyles = {
  high: "border-destructive/20 bg-destructive/10 text-destructive",
  medium: "border-warning/20 bg-warning/10 text-warning",
  low: "border-secondary bg-secondary text-secondary-foreground",
};

const SectionCollapsible = ({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-background">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors rounded-lg">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const CaseRecommendationPanel = ({
  recommendations,
  missingItems,
  showWhy,
  busyKey,
  requestBusyKey,
  requestStatusByLabel,
  strategicAnalysis,
  onShowWhyChange,
  onAction,
  onRequestFromClient,
  onRequestAllFromClient,
}: CaseRecommendationPanelProps) => {
  const analysis = strategicAnalysis;

  return (
    <div className="space-y-4">
      {/* Strategic Analysis Sections (collapsible) */}
      {analysis && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Legal Execution Brief</h3>
          </div>

          {/* Next Immediate Action - always visible */}
          {analysis.nextImmediateAction && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Next immediate action</p>
              <p className="text-sm text-foreground">{analysis.nextImmediateAction}</p>
            </div>
          )}

          <div className="space-y-2">
            {analysis.caseSummary?.facts && (
              <SectionCollapsible title="Case Summary" icon={Brain} defaultOpen>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{analysis.caseSummary.facts}</p>
                  {analysis.caseSummary.parties && analysis.caseSummary.parties.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Parties</p>
                      <p className="text-foreground">{analysis.caseSummary.parties.join(", ")}</p>
                    </div>
                  )}
                  {analysis.caseSummary.jurisdiction && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Jurisdiction</p>
                      <p className="text-foreground">{analysis.caseSummary.jurisdiction}</p>
                    </div>
                  )}
                </div>
              </SectionCollapsible>
            )}

            {analysis.keyLegalIssues && analysis.keyLegalIssues.length > 0 && (
              <SectionCollapsible title="Key Legal Issues" icon={AlertCircle}>
                <ul className="space-y-2 text-sm">
                  {analysis.keyLegalIssues.map((issue, i) => (
                    <li key={i} className="rounded bg-muted/30 p-2">
                      <p className="font-medium text-foreground">{issue.issue}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{issue.significance}</p>
                    </li>
                  ))}
                </ul>
              </SectionCollapsible>
            )}

            {analysis.applicableLaws && analysis.applicableLaws.length > 0 && (
              <SectionCollapsible title="Applicable Laws & References" icon={Scale}>
                <ul className="space-y-2 text-sm">
                  {analysis.applicableLaws.map((law, i) => (
                    <li key={i} className="rounded bg-muted/30 p-2">
                      <p className="font-mono text-xs font-semibold text-primary">{law.statute}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{law.relevance}</p>
                    </li>
                  ))}
                </ul>
              </SectionCollapsible>
            )}

            {analysis.legalAnalysis && analysis.legalAnalysis.length > 0 && (
              <SectionCollapsible title="Legal Analysis (IRAC)" icon={Brain}>
                <div className="space-y-3 text-sm">
                  {analysis.legalAnalysis.map((item, i) => (
                    <div key={i} className="rounded bg-muted/30 p-2 space-y-1">
                      <p className="font-medium text-foreground">{item.issue}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Rule:</span> {item.rule}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Application:</span> {item.application}</p>
                      <p className="text-xs text-foreground"><span className="font-semibold">Conclusion:</span> {item.conclusion} <span className="text-primary font-mono">({item.confidence})</span></p>
                    </div>
                  ))}
                </div>
              </SectionCollapsible>
            )}

            {analysis.recommendedStrategy && (
              <SectionCollapsible title="Recommended Strategy" icon={Sparkles} defaultOpen>
                <div className="space-y-2 text-sm">
                  <div className="rounded bg-primary/5 p-2">
                    <p className="text-xs font-semibold text-primary">Best option</p>
                    <p className="text-foreground">{analysis.recommendedStrategy.bestOption}</p>
                  </div>
                  {analysis.recommendedStrategy.alternatives && analysis.recommendedStrategy.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Alternatives</p>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {analysis.recommendedStrategy.alternatives.map((alt, i) => <li key={i}>{alt}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Reasoning:</span> {analysis.recommendedStrategy.reasoning}</p>
                </div>
              </SectionCollapsible>
            )}

            {analysis.risksAndConsiderations && analysis.risksAndConsiderations.length > 0 && (
              <SectionCollapsible title="Risks & Considerations" icon={AlertCircle}>
                <div className="space-y-2 text-sm">
                  {analysis.risksAndConsiderations.map((risk, i) => (
                    <div key={i} className="rounded bg-muted/30 p-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">{risk.type}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{risk.probability}</span>
                      </div>
                      <p className="text-foreground mt-1">{risk.risk}</p>
                      <p className="text-xs text-muted-foreground mt-0.5"><span className="font-semibold">Mitigation:</span> {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </SectionCollapsible>
            )}

            {analysis.requiredDocuments && analysis.requiredDocuments.length > 0 && (
              <SectionCollapsible title="Required Documents" icon={AlertCircle}>
                <ul className="space-y-1 text-sm">
                  {analysis.requiredDocuments.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2 rounded bg-muted/30 p-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{doc.document}</p>
                        <p className="text-xs text-muted-foreground">{doc.purpose}</p>
                      </div>
                      {doc.canGenerate && (
                        <span className="shrink-0 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Can generate</span>
                      )}
                    </li>
                  ))}
                </ul>
              </SectionCollapsible>
            )}
          </div>
        </div>
      )}

      {/* Action Steps */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">AI next actions</h3>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Why this?</p>
            <p className="text-xs text-muted-foreground">Show the legal reasoning behind each recommended action.</p>
          </div>
          <Switch checked={showWhy} onCheckedChange={onShowWhyChange} />
        </div>

        <div className="mt-4 space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((step, index) => {
              const priority = normalizeCasePriority(step.priority);
              const actionKey = `step-${index}-${step.title}`;

              return (
                <div key={actionKey} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${priorityStyles[priority]}`}>
                          {priority}
                        </span>
                        {step.phase && (
                          <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {step.phase.replace("-", " ")}
                          </span>
                        )}
                      </div>
                      {step.legalBasis && (
                        <p className="mt-1 font-mono text-[11px] text-primary/70">{step.legalBasis}</p>
                      )}
                      {showWhy && step.why ? <p className="mt-1 text-xs text-muted-foreground">{step.why}</p> : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => onAction(step, actionKey)}
                        disabled={busyKey === actionKey}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {busyKey === actionKey ? "Opening…" : step.actionLabel || "Open action"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Click "What should I do next?" to get a full legal execution brief with structured analysis and actionable next steps.
            </div>
          )}
        </div>
      </div>

      {/* Missing Information */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Missing information actions</h3>
          </div>
          {onRequestAllFromClient && missingItems.length > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestAllFromClient(missingItems, "missing-all-request")}
              disabled={requestBusyKey === "missing-all-request"}
            >
              {requestBusyKey === "missing-all-request" ? "Preparing…" : "Request all from Client"}
            </Button>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {missingItems.length > 0 ? (
            missingItems.map((item, index) => {
              const priority = normalizeCasePriority(item.priority);
              const actionKey = `missing-${index}-${item.label}`;

              return (
                <div key={actionKey} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${priorityStyles[priority]}`}>
                          {priority}
                        </span>
                        {requestStatusByLabel?.[item.label] ? (
                          <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            {requestStatusByLabel[item.label]}
                          </span>
                        ) : null}
                      </div>
                      {showWhy && item.why ? <p className="mt-1 text-xs text-muted-foreground">{item.why}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction(item, actionKey)}
                        disabled={busyKey === actionKey}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        {busyKey === actionKey ? "Opening…" : item.actionLabel || "Resolve"}
                      </Button>
                      {onRequestFromClient ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onRequestFromClient(item, `${actionKey}-request`)}
                          disabled={requestBusyKey === `${actionKey}-request`}
                        >
                          {requestBusyKey === `${actionKey}-request` ? "Preparing…" : "Request from Client"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              No major gaps detected right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
