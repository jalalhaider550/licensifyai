import { BellRing, ExternalLink, Link2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/cases";
import { getCaseInfoRequestStatusClasses, getCaseInfoRequestStatusLabel } from "@/lib/caseInfoRequests";

interface CaseInfoRequestsPanelProps {
  requests: any[];
  reminderBusyId: string | null;
  onCopyLink: (request: any) => void;
  onSendEmail: (request: any) => void;
  onSendReminder: (request: any) => void;
  onOpenRequest: (request: any) => void;
}

export const CaseInfoRequestsPanel = ({
  requests,
  reminderBusyId,
  onCopyLink,
  onSendEmail,
  onSendReminder,
  onOpenRequest,
}: CaseInfoRequestsPanelProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Client information requests</h3>
          <p className="mt-1 text-sm text-muted-foreground">Track secure requests, reminders, and submissions for missing case information.</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {requests.length} active
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No client requests yet. Use “Request from Client” on a missing item to collect documents or details automatically.
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{request.title}</p>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getCaseInfoRequestStatusClasses(request.status)}`}>
                      {getCaseInfoRequestStatusLabel(request.status)}
                    </span>
                  </div>
                  {request.request_message ? <p className="text-sm text-muted-foreground">{request.request_message}</p> : null}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Created {formatRelativeDate(request.created_at)}</span>
                    {request.last_reminded_at ? <span>Last reminder {formatRelativeDate(request.last_reminded_at)}</span> : null}
                    {request.submitted_at ? <span>Submitted {formatRelativeDate(request.submitted_at)}</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onCopyLink(request)}>
                    <Link2 className="mr-2 h-4 w-4" /> Copy link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onSendEmail(request)}>
                    <Mail className="mr-2 h-4 w-4" /> Email client
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onSendReminder(request)} disabled={reminderBusyId === request.id}>
                    <BellRing className="mr-2 h-4 w-4" /> {reminderBusyId === request.id ? "Sending…" : "Send reminder"}
                  </Button>
                  <Button size="sm" onClick={() => onOpenRequest(request)}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Open form
                  </Button>
                </div>
              </div>

              {Array.isArray(request.items) && request.items.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {request.items.map((item: any) => (
                    <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{item.label}</p>
                          {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getCaseInfoRequestStatusClasses(item.status)}`}>
                          {getCaseInfoRequestStatusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
