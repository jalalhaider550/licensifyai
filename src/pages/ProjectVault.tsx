import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Folder, FolderPlus, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  VaultProject,
  createVaultProject,
  deleteVaultProject,
  getVaultProject,
  listVaultProjects,
} from "@/lib/vault";
import { VaultFileBrowser } from "@/components/app/VaultFileBrowser";

export default function ProjectVault() {
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<VaultProject | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const refresh = async () => {
    try {
      setProjects(await listVaultProjects());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const proj = await createVaultProject({ name: name.trim(), description: desc.trim() });
      setProjects((prev) => [proj, ...prev]);
      setName("");
      setDesc("");
      setOpen(false);
      toast.success("Project created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (p: VaultProject) => {
    if (!confirm(`Delete project "${p.name}" and all its files?`)) return;
    try {
      await deleteVaultProject(p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      if (active?.id === p.id) setActive(null);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (active) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> All projects
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Folder className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{active.name}</h2>
            </div>
            {active.description && (
              <p className="text-xs text-muted-foreground mb-4">{active.description}</p>
            )}
            <VaultFileBrowser projectId={active.id} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold">Project Vault</h1>
            <p className="text-sm text-muted-foreground">
              Group documents into isolated, searchable projects with tags and drag-and-drop uploads.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="mr-1.5 h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create vault project</DialogTitle>
                <DialogDescription>
                  Files in this project are isolated from other projects.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea
                  placeholder="Description (optional)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Folder className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold mb-1">No projects yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first vault project to start organising files.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
              >
                <button onClick={() => setActive(p)} className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Folder className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{p.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
