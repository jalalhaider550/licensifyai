import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, History, RotateCcw, GitCompare, Trash2, Sparkles, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DocumentVersion,
  computeLineDiff,
  deleteDocumentVersion,
  listDocumentVersions,
  saveDocumentVersion,
  AuthorType,
} from "@/lib/documentVersions";

interface VersionHistoryPanelProps {
  documentType: string;
  documentId: string;
  currentTitle: string;
  currentContent: string;
  onRestore?: (version: DocumentVersion) => void;
  defaultAuthorType?: AuthorType;
}

export function VersionHistoryPanel({
  documentType,
  documentId,
  currentTitle,
  currentContent,
  onRestore,
  defaultAuthorType = "user",
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [compareIds, setCompareIds] = useState<{ a?: string; b?: string }>({});
  const [diffOpen, setDiffOpen] = useState(false);

  const refresh = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const list = await listDocumentVersions(documentType, documentId);
      setVersions(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, documentId]);

  const handleSave = async () => {
    try {
      await saveDocumentVersion({
        documentType,
        documentId,
        title: currentTitle,
        content: currentContent,
        changeSummary: summary,
        authorType: defaultAuthorType,
      });
      toast.success("Version saved");
      setSummary("");
      setSaveOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save version");
    }
  };

  const handleRestore = (v: DocumentVersion) => {
    if (!onRestore) {
      toast.info("Restore is not available for this document.");
      return;
    }
    onRestore(v);
    toast.success(`Restored version ${v.version_number}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this version permanently?")) return;
    try {
      await deleteDocumentVersion(id);
      refresh();
    } catch {
      toast.error("Failed to delete version");
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.a === id) return { ...prev, a: undefined };
      if (prev.b === id) return { ...prev, b: undefined };
      if (!prev.a) return { ...prev, a: id };
      if (!prev.b) return { ...prev, b: id };
      return { a: id, b: undefined };
    });
  };

  const versionA = versions.find((v) => v.id === compareIds.a);
  const versionB = versions.find((v) => v.id === compareIds.b);
  const diffRows = versionA && versionB ? computeLineDiff(versionA.content, versionB.content) : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Version History</h3>
          <Badge variant="secondary" className="text-[10px]">{versions.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!compareIds.a || !compareIds.b}
            onClick={() => setDiffOpen(true)}
          >
            <GitCompare className="mr-1.5 h-3.5 w-3.5" /> Compare
          </Button>
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save new version</DialogTitle>
                <DialogDescription>Snapshot the current content with an optional change summary.</DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Change summary (optional) — what changed and why?"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save version</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="h-[320px] pr-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && versions.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No versions yet. Click "Save version" to create the first snapshot.
          </p>
        )}
        <ul className="space-y-2">
          {versions.map((v) => {
            const selected = compareIds.a === v.id || compareIds.b === v.id;
            return (
              <li
                key={v.id}
                className={`rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">v{v.version_number}</span>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {v.author_type === "ai" ? <Sparkles className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                        {v.author_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    {v.change_summary && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{v.change_summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant={selected ? "default" : "ghost"}
                      className="h-7 px-2 text-[10px]"
                      onClick={() => toggleCompare(v.id)}
                    >
                      {selected ? "✓" : "Pick"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px]"
                      onClick={() => handleRestore(v)}
                      title="Restore"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
                      onClick={() => handleDelete(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Compare v{versionA?.version_number} → v{versionB?.version_number}
            </DialogTitle>
            <DialogDescription>Line-by-line differences. Removed in red, added in green.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded border border-border bg-muted/20 p-3">
            <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap">
              {diffRows.map((row, idx) => (
                <div
                  key={idx}
                  className={
                    row.type === "added"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : row.type === "removed"
                      ? "bg-red-500/10 text-red-700 dark:text-red-300"
                      : ""
                  }
                >
                  <span className="select-none mr-2 text-muted-foreground">
                    {row.type === "added" ? "+" : row.type === "removed" ? "−" : " "}
                  </span>
                  {row.text || " "}
                </div>
              ))}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
