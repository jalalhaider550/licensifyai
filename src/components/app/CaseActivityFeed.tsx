import { useEffect, useState } from "react";
import { CaseActivityEntry, listActivity } from "@/lib/firmWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface Props {
  caseId: string;
}

const TYPE_LABELS: Record<string, string> = {
  case_shared: "shared the case",
  case_handoff: "transferred ownership",
  comment_added: "left a comment",
  document_created: "created a document",
  document_edited: "edited a document",
  document_uploaded: "uploaded a file",
  filing_submitted: "submitted a filing",
  research_run: "ran research",
  version_restored: "restored a version",
  joined: "joined the case",
};

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function CaseActivityFeed({ caseId }: Props) {
  const [items, setItems] = useState<CaseActivityEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    listActivity(caseId).then((l) => mounted && setItems(l));
    const channel = supabase
      .channel(`activity:${caseId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_activity_log", filter: `case_id=eq.${caseId}` },
        () => listActivity(caseId).then((l) => mounted && setItems(l)),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
        <Activity className="h-4 w-4" /> Activity
      </div>
      <div className="max-h-96 overflow-auto divide-y">
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">No activity yet.</div>
        )}
        {items.map((a) => (
          <div key={a.id} className="px-4 py-2.5 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{a.actor_name || "Someone"}</span>
              <span className="text-muted-foreground">{TYPE_LABELS[a.action_type] || a.action_type}</span>
              <span className="ml-auto text-muted-foreground">{relTime(a.created_at)}</span>
            </div>
            {a.description && <div className="mt-0.5 text-muted-foreground">{a.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
