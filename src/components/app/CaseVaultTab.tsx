import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FolderPlus, Folder } from "lucide-react";
import { toast } from "sonner";
import { VaultProject, createVaultProject, listVaultProjects } from "@/lib/vault";
import { VaultFileBrowser } from "@/components/app/VaultFileBrowser";

interface CaseVaultTabProps {
  caseId: string;
  caseTitle: string;
}

export function CaseVaultTab({ caseId, caseTitle }: CaseVaultTabProps) {
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const refresh = async () => {
    try {
      const all = await listVaultProjects();
      setProjects(all.filter((p) => p.case_id === caseId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleCreate = async () => {
    const name = newName.trim() || `${caseTitle} files`;
    setCreating(true);
    try {
      const proj = await createVaultProject({ name, case_id: caseId });
      setProjects((prev) => [proj, ...prev]);
      setNewName("");
      toast.success("Vault project created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading vault…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Folder className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-semibold mb-1">No vault project yet for this case</p>
        <p className="text-xs text-muted-foreground mb-4">
          Create an isolated, searchable file project linked to this matter.
        </p>
        <div className="flex gap-2 max-w-sm mx-auto">
          <Input
            placeholder={`${caseTitle} files`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 text-xs"
          />
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Folder className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">{p.name}</h4>
          </div>
          <VaultFileBrowser projectId={p.id} />
        </div>
      ))}
    </div>
  );
}
