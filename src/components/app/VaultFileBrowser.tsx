import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Search,
  FileText,
  Trash2,
  Download,
  Tag as TagIcon,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  VaultFile,
  deleteVaultFile,
  getVaultFileSignedUrl,
  listVaultFiles,
  searchFiles,
  updateVaultFileTags,
  uploadVaultFile,
} from "@/lib/vault";

interface VaultFileBrowserProps {
  projectId: string;
}

export function VaultFileBrowser({ projectId }: VaultFileBrowserProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFiles(await listVaultFiles(projectId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true);
    try {
      for (const file of arr) {
        await uploadVaultFile(projectId, file);
      }
      toast.success(`${arr.length} file(s) uploaded`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleDownload = async (file: VaultFile) => {
    if (!file.storage_path) return;
    try {
      const url = await getVaultFileSignedUrl(file.storage_path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Failed to fetch file");
    }
  };

  const handleDelete = async (file: VaultFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await deleteVaultFile(file);
      refresh();
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const addTag = async (file: VaultFile) => {
    const tag = prompt("Add tag");
    if (!tag) return;
    const tags = Array.from(new Set([...file.tags, tag.trim()]));
    await updateVaultFileTags(file.id, tags);
    refresh();
  };

  const removeTag = async (file: VaultFile, tag: string) => {
    const tags = file.tags.filter((t) => t !== tag);
    await updateVaultFileTags(file.id, tags);
    refresh();
  };

  const filtered = searchFiles(files, query);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, descriptions, tags…"
            className="pl-8 h-9 text-xs"
          />
        </div>
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-4 text-center text-xs transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        }`}
      >
        Drag & drop files here to upload to this project
      </div>

      <ScrollArea className="h-[420px] pr-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-8 text-center">
            {files.length === 0 ? "No files yet. Upload to start." : "No files match your search."}
          </p>
        )}
        <ul className="space-y-2">
          {filtered.map((f) => (
            <li key={f.id} className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(f.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>
                  )}
                  <div className="flex items-center gap-1 flex-wrap mt-1.5">
                    {f.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] gap-1 cursor-pointer"
                        onClick={() => removeTag(f, tag)}
                        title="Click to remove"
                      >
                        <TagIcon className="h-2.5 w-2.5" />
                        {tag}
                      </Badge>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px]"
                      onClick={() => addTag(f)}
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" /> tag
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(f)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
