import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FolderOpen, FileText, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Doc {
  id: string;
  name: string;
  file_type: string | null;
  ai_status: string | null;
  created_at: string;
  client_id: string;
  client_name?: string;
}

const Documents = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, file_type, ai_status, created_at, client_id")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load documents");
      } else {
        // fetch client names
        const clientIds = [...new Set((data || []).map((d) => d.client_id))];
        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from("clients")
            .select("id, company_name")
            .in("id", clientIds);
          const clientMap = new Map(
            (clients || []).map((c) => [c.id, c.company_name])
          );
          setDocs(
            (data || []).map((d) => ({
              ...d,
              client_name: clientMap.get(d.client_id) || "Unknown",
            }))
          );
        } else {
          setDocs(data || []);
        }
      }
    };
    fetch();
  }, [user]);

  const filtered = docs.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.client_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel = (status: string | null) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-accent/10 text-accent-foreground border border-accent/20">
            Extracted
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-warning/10 text-warning-foreground border border-warning/20">
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
            Pending
          </span>
        );
    }
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All uploaded documents across your clients.
          </p>
        </div>

        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents or clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-sm"
          />
        </div>

        <div className="rounded-sm border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              {docs.length === 0
                ? "No documents uploaded yet. Upload documents from a client profile."
                : "No documents matching your search."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Document</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Client</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Status</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{doc.client_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{doc.file_type || "—"}</td>
                    <td className="px-4 py-3">{statusLabel(doc.ai_status)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Documents;
