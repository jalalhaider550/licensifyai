import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listActivePresence, heartbeatPresence, clearPresence, PresenceRow } from "@/lib/firmWorkspace";

interface Props {
  caseId: string;
}

export function CasePresenceIndicator({ caseId }: Props) {
  const [people, setPeople] = useState<PresenceRow[]>([]);

  useEffect(() => {
    let mounted = true;
    let interval: any;

    const tick = async () => {
      await heartbeatPresence(caseId);
      const list = await listActivePresence(caseId, 90);
      if (mounted) setPeople(list);
    };

    tick();
    interval = setInterval(tick, 25000);

    const channel = supabase
      .channel(`presence:${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "case_presence", filter: `case_id=eq.${caseId}` }, () => {
        listActivePresence(caseId, 90).then((l) => mounted && setPeople(l));
      })
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
      clearPresence(caseId).catch(() => {});
    };
  }, [caseId]);

  if (!people.length) return null;

  return (
    <div className="flex -space-x-2">
      {people.slice(0, 6).map((p) => {
        const initials = (p.display_name || "L")
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <div
            key={p.id}
            title={`${p.display_name} · active now`}
            className="h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: p.color }}
          >
            {initials}
          </div>
        );
      })}
      {people.length > 6 && (
        <div className="h-7 w-7 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-medium">
          +{people.length - 6}
        </div>
      )}
    </div>
  );
}
