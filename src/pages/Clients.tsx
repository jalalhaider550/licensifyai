import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ArrowRight, FolderOpen, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AddClientDialog } from "@/components/app/AddClientDialog";

interface Client {
  id: string;
  company_name: string;
  jurisdiction: string;
  status: string;
  updated_at: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-primary/10 text-primary border border-primary/20",
  pending: "bg-warning/10 text-warning-foreground border border-warning/20",
  completed: "bg-success/10 text-success-foreground border border-success/20",
};

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name, jurisdiction, status, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load clients");
    } else {
      setClients(data || []);
    }
  };

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const filtered = clients.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a client to upload documents and generate a business plan.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Client
          </Button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Document workflow</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a client profile, upload a PDF or Word document, and Licensify AI will read it and generate the business plan in the editor.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1"><FolderOpen className="h-3.5 w-3.5" /> Upload</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1"><Brain className="h-3.5 w-3.5" /> AI Generate</span>
            </div>
          </div>
        </div>

        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-sm border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {clients.length === 0
              ? "No clients yet. Add your first client to get started."
              : "No clients matching your search."}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:hidden">
              {filtered.map((client) => (
                <div key={client.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">{client.company_name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground font-mono">{client.jurisdiction} · {timeAgo(client.updated_at)}</p>
                    </div>
                    <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusStyles[client.status] || ""}`}>
                      {client.status}
                    </span>
                  </div>
                  <Button asChild size="sm" className="mt-4 w-full">
                    <Link to={`/clients/${client.id}`}>
                      Open Client & Upload Documents <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-hidden rounded-sm border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Jurisdiction</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => (
                    <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{client.company_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.jurisdiction}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusStyles[client.status] || ""}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{timeAgo(client.updated_at)}</td>
                      <td className="px-4 py-3">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/clients/${client.id}`}>
                            Open Client <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <AddClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClientAdded={fetchClients}
      />
    </AppShell>
  );
};

export default Clients;
