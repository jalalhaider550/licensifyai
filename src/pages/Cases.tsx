import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { CreateCaseDialog } from "@/components/app/CreateCaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, BriefcaseBusiness, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatRelativeDate, getCaseTypeLabel } from "@/lib/cases";

interface CaseRow {
  id: string;
  title: string;
  case_type: string;
  client_name: string;
  status: string;
  progress_percentage: number;
  updated_at: string;
}

const Cases = () => {
  const { user } = useAuth();
  const db = supabase as any;
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadCases = async () => {
    const { data, error } = await db
      .from("cases")
      .select("id, title, case_type, client_name, status, progress_percentage, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load cases");
      return;
    }

    setCases(data || []);
  };

  useEffect(() => {
    if (user) loadCases();
  }, [user]);

  const filteredCases = useMemo(
    () =>
      cases.filter((item) => {
        const value = `${item.title} ${item.client_name} ${item.case_type}`.toLowerCase();
        return value.includes(search.toLowerCase());
      }),
    [cases, search],
  );

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Cases</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Run all legal work inside cases while keeping licensing workflows intact.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Case
          </Button>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Case layer</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Intake, documents, AI summary, and next-step decisions now sit above client and licensing workspaces.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Existing licensing features remain unchanged.
            </div>
          </div>
        </div>

        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cases…" className="pl-9" />
        </div>

        {filteredCases.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <h3 className="font-display text-lg font-semibold text-foreground">No cases yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first case to start the AI intake and decision workflow.</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Case
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCases.map((item) => (
              <Link
                key={item.id}
                to={`/cases/${item.id}`}
                className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {getCaseTypeLabel(item.case_type)}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.status}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Client: {item.client_name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{item.progress_percentage || 0}% complete</span>
                  </div>
                  <Progress value={item.progress_percentage || 0} className="h-2" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Updated {formatRelativeDate(item.updated_at)}</p>
              </Link>
            ))}
          </div>
        )}

        <CreateCaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={(caseId) => {
            loadCases();
            navigate(`/cases/${caseId}`);
          }}
        />
      </div>
    </AppShell>
  );
};

export default Cases;