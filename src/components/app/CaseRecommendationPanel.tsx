import { AlertCircle, ArrowRight, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type CaseRecommendation, type MissingInfoAction, normalizeCasePriority } from "@/lib/cases";

interface CaseRecommendationPanelProps {
  recommendations: CaseRecommendation[];
  missingItems: MissingInfoAction[];
  showWhy: boolean;
  busyKey: string | null;
  requestBusyKey?: string | null;
  requestStatusByLabel?: Record<string, string>;
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

export const CaseRecommendationPanel = ({
  recommendations,
  missingItems,
  showWhy,
  busyKey,
  requestBusyKey,
  requestStatusByLabel,
  onShowWhyChange,
  onAction,
  onRequestFromClient,
  onRequestAllFromClient,
}: CaseRecommendationPanelProps) => {
  return (
    <div className="space-y-4">
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
                      </div>
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
              Generate next steps to get legally precise actions for this case.
            </div>
          )}
        </div>
      </div>

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