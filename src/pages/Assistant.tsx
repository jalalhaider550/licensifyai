import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Send,
  Sparkles,
  Paperclip,
  X,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  listVaultProjects,
  listVaultFiles,
  getVaultFileSignedUrl,
  VaultProject,
  VaultFile,
} from "@/lib/vault";
import { saveDocumentVersion } from "@/lib/documentVersions";
import { supabase } from "@/integrations/supabase/client";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

const TEXT_EXTS = ["txt", "md", "markdown", "json", "csv", "log", "html", "xml"];

function isTextual(file: VaultFile): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return TEXT_EXTS.includes(ext) || (file.mime_type?.startsWith("text/") ?? false);
}

export default function Assistant() {
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [filesByProject, setFilesByProject] = useState<Record<string, VaultFile[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorOriginal, setEditorOriginal] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [attached, setAttached] = useState<VaultFile[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const ps = await listVaultProjects();
        setProjects(ps);
        if (ps.length > 0) setExpanded({ [ps[0].id]: true });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleProject = async (p: VaultProject) => {
    const next = !expanded[p.id];
    setExpanded((e) => ({ ...e, [p.id]: next }));
    if (next && !filesByProject[p.id]) {
      try {
        const files = await listVaultFiles(p.id);
        setFilesByProject((m) => ({ ...m, [p.id]: files }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    }
  };

  const openFile = async (f: VaultFile) => {
    setActiveFile(f);
    if (!isTextual(f) || !f.storage_path) {
      setEditorContent("");
      setEditorOriginal("");
      return;
    }
    setEditorLoading(true);
    try {
      const url = await getVaultFileSignedUrl(f.storage_path, 600);
      const text = await fetch(url).then((r) => r.text());
      setEditorContent(text);
      setEditorOriginal(text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setEditorLoading(false);
    }
  };

  const attachFile = async (f: VaultFile) => {
    if (attached.some((a) => a.id === f.id)) return;
    setAttached([...attached, f]);
  };

  const removeAttached = (id: string) => setAttached(attached.filter((a) => a.id !== id));

  const saveEditorVersion = async () => {
    if (!activeFile) return;
    try {
      await saveDocumentVersion({
        documentId: activeFile.id,
        documentType: "vault_file",
        title: activeFile.name,
        content: editorContent,
        changeSummary: "Edited via Assistant workspace",
      });
      setEditorOriginal(editorContent);
      toast.success("Version saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    // Build file context: explicitly attached + editor content if open
    const fileContext: { name: string; content: string }[] = [];
    for (const f of attached) {
      if (!isTextual(f) || !f.storage_path) {
        fileContext.push({ name: f.name, content: `[Binary file — ${f.mime_type || "unknown"}]` });
        continue;
      }
      try {
        const url = await getVaultFileSignedUrl(f.storage_path, 600);
        const content = await fetch(url).then((r) => r.text());
        fileContext.push({ name: f.name, content });
      } catch {
        fileContext.push({ name: f.name, content: "[Failed to load]" });
      }
    }
    if (activeFile && editorContent && !attached.some((a) => a.id === activeFile.id)) {
      fileContext.push({ name: `${activeFile.name} (open in editor)`, content: editorContent });
    }

    const newMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setStreaming(true);

    let assistantSoFar = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          file_context: fileContext,
          model,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 402) toast.error(err.error || "AI credits exhausted. Top up to continue.");
        else if (resp.status === 429) toast.error(err.error || "Rate limit reached. Try again shortly.");
        else toast.error(err.error || "AI failed");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantSoFar += delta;
              setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const insertReply = () => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    setEditorContent((c) => c + (c ? "\n\n" : "") + last.content);
  };

  const dirty = activeFile && editorContent !== editorOriginal;

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
        {/* File tree */}
        <aside className="w-64 shrink-0 border-r bg-muted/20 overflow-y-auto">
          <div className="px-3 py-3 border-b flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Files</h2>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => setProjects(await listVaultProjects())}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-1">
            {projects.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">
                No vault projects. Create one from /vault.
              </p>
            )}
            {projects.map((p) => (
              <div key={p.id}>
                <button
                  onClick={() => toggleProject(p)}
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-medium hover:bg-muted rounded text-left"
                >
                  {expanded[p.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {expanded[p.id] ? <FolderOpen className="h-3.5 w-3.5 text-primary" /> : <Folder className="h-3.5 w-3.5 text-primary" />}
                  <span className="truncate flex-1">{p.name}</span>
                </button>
                {expanded[p.id] && (
                  <div className="ml-5">
                    {(filesByProject[p.id] || []).map((f) => (
                      <div
                        key={f.id}
                        className={`group flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer hover:bg-muted ${activeFile?.id === f.id ? "bg-primary/10 text-primary" : ""}`}
                        onClick={() => openFile(f)}
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate flex-1" title={f.name}>{f.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); attachFile(f); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Attach to chat"
                        >
                          <Paperclip className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(filesByProject[p.id] || []).length === 0 && (
                      <p className="px-2 py-1 text-[10px] text-muted-foreground italic">No files</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <section className="flex-1 flex flex-col min-w-0 border-r">
          <div className="border-b px-4 py-2 flex items-center gap-2 bg-card">
            {activeFile ? (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span className="text-sm font-medium truncate flex-1">{activeFile.name}</span>
                {dirty && <Badge variant="secondary" className="text-[10px]">unsaved</Badge>}
                {isTextual(activeFile) && (
                  <Button size="sm" variant="outline" onClick={saveEditorVersion} disabled={!dirty}>
                    <Save className="mr-1 h-3 w-3" /> Save version
                  </Button>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No file open. Click a file in the left panel.</span>
            )}
          </div>
          <div className="flex-1 overflow-auto bg-card">
            {editorLoading ? (
              <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : activeFile && !isTextual(activeFile) ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Binary file ({activeFile.mime_type || "unknown"}). Attach it to chat to discuss with AI.
              </div>
            ) : activeFile ? (
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="min-h-full h-full font-mono text-xs border-0 rounded-none focus-visible:ring-0 resize-none"
              />
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Select a file to view and edit.
              </div>
            )}
          </div>
        </section>

        {/* AI Chat */}
        <section className="w-[380px] shrink-0 flex flex-col bg-muted/10">
          <div className="border-b px-3 py-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Assistant</span>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-7 text-xs ml-auto w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Attached chips */}
          {attached.length > 0 && (
            <div className="px-3 py-2 border-b flex flex-wrap gap-1">
              {attached.map((f) => (
                <Badge key={f.id} variant="secondary" className="text-[10px] gap-1">
                  <Paperclip className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button onClick={() => removeAttached(f.id)}><X className="h-2.5 w-2.5" /></button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground p-4 text-center">
                Ask anything. Open a file or attach files to give the assistant context.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-xs ${m.role === "user" ? "text-foreground" : "text-foreground/90"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-muted-foreground">
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div className={`p-2 rounded ${m.role === "user" ? "bg-primary/10" : "bg-card border"}`}>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{m.content || (streaming && i === messages.length - 1 ? "…" : "")}</pre>
                </div>
                {m.role === "assistant" && m.content && activeFile && isTextual(activeFile) && i === messages.length - 1 && !streaming && (
                  <button onClick={insertReply} className="mt-1 text-[10px] text-primary hover:underline">
                    Insert into editor
                  </button>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <div className="border-t p-2 space-y-2 bg-card">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask the assistant… (Enter to send, Shift+Enter for newline)"
              rows={3}
              className="text-xs resize-none"
              disabled={streaming}
            />
            <Button onClick={sendMessage} disabled={streaming || !input.trim()} size="sm" className="w-full">
              {streaming ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Streaming…</> : <><Send className="mr-1 h-3 w-3" />Send</>}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
