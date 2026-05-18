import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Shield, Search } from "lucide-react";

type Profile = {
  user_id: string;
  firm_name: string | null;
  display_name: string | null;
  plan: string;
  created_at: string;
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user, authLoading]);

  const loadProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, firm_name, display_name, plan, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadProfiles(); }, [isAdmin]);

  const togglePlan = async (p: Profile) => {
    const next = p.plan === "pro" ? "free_trial" : "pro";
    setUpdatingId(p.user_id);
    const { error } = await supabase
      .from("profiles")
      .update({ plan: next })
      .eq("user_id", p.user_id);
    setUpdatingId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(`Set to ${next}`);
      setProfiles((prev) => prev.map((x) => x.user_id === p.user_id ? { ...x, plan: next } : x));
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (p.firm_name ?? "").toLowerCase().includes(q)
      || (p.display_name ?? "").toLowerCase().includes(q)
      || p.user_id.toLowerCase().includes(q);
  });

  if (authLoading || isAdmin === null) {
    return <AppShell><div className="p-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div></AppShell>;
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-10 max-w-md mx-auto text-center">
          <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin — User profiles</h1>
            <p className="text-sm text-muted-foreground mt-1">{profiles.length} total profiles</p>
          </div>
          <Button variant="outline" onClick={loadProfiles} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by firm name, display name, or user id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Firm</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No profiles found</td></tr>
                  ) : filtered.map((p) => (
                    <tr key={p.user_id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.firm_name || "—"}</div>
                        {p.display_name && <div className="text-xs text-muted-foreground">{p.display_name}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.plan === "pro" ? "default" : "secondary"}>{p.plan}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{p.user_id}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant={p.plan === "pro" ? "outline" : "default"}
                          onClick={() => togglePlan(p)}
                          disabled={updatingId === p.user_id}
                        >
                          {updatingId === p.user_id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : p.plan === "pro" ? "Downgrade" : "Upgrade to Pro"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
