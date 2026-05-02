import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { listSharedWithMe } from "@/lib/firmWorkspace";
import { Badge } from "@/components/ui/badge";
import { Users, BriefcaseBusiness } from "lucide-react";

const PERM_LABEL: Record<string, string> = {
  viewer: "Viewer",
  contributor: "Contributor",
  editor: "Editor",
  co_owner: "Co-Owner",
};

export default function SharedWithMe() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSharedWithMe().then((l) => {
      setItems(l);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" /> Shared with me
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cases other lawyers in your firm have shared with you. Your private workspace is unaffected.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <BriefcaseBusiness className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-display text-base font-semibold mb-1">Nothing shared with you yet</h3>
            <p className="text-sm text-muted-foreground">When a lawyer shares a case with you it will appear here.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <Link
                key={c.id}
                to={`/cases/${c.id}`}
                className="rounded-lg border bg-card p-4 hover:border-primary/30 transition-colors block"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm truncate flex-1">{c.title}</h3>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    Shared
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground truncate">{c.client_name}</div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{PERM_LABEL[c._share_permission] || c._share_permission}</span>
                  <span>Updated {new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
