import { useState, useRef, useCallback, useEffect } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Sparkles, Copy,
  Download, Save, ChevronDown, Type, Wand2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface RichDocumentEditorProps {
  content: string;
  title: string;
  onChange: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onExportWord?: () => void;
  onExportPdf?: () => void;
  onAiAction?: (action: string, selectedText: string) => Promise<string | null>;
  isSaving?: boolean;
  isAiProcessing?: boolean;
  readOnly?: boolean;
}

const AI_ACTIONS = [
  { key: "rewrite", label: "Rewrite clause", icon: Wand2 },
  { key: "simplify", label: "Simplify language", icon: Type },
  { key: "formal", label: "Make more formal", icon: FileText },
  { key: "expand", label: "Expand clause", icon: Sparkles },
  { key: "add_clause", label: "Add protective clause", icon: List },
];

export function RichDocumentEditor({
  content,
  title,
  onChange,
  onTitleChange,
  onSave,
  onExportWord,
  onExportPdf,
  onAiAction,
  isSaving,
  isAiProcessing,
  readOnly,
}: RichDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save with debounce
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html);

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      onSave?.();
    }, 3000);
  }, [onChange, onSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // Sync content from parent only on initial load
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    setSelectedText(selection?.toString() || "");
  };

  const handleAiAction = async (actionKey: string) => {
    if (!onAiAction || !selectedText.trim()) {
      toast.info("Select text first, then choose an AI action.");
      return;
    }

    const result = await onAiAction(actionKey, selectedText);
    if (result && editorRef.current) {
      document.execCommand("insertText", false, result);
      handleInput();
      toast.success("AI edit applied");
    }
  };

  const handleCopy = async () => {
    const text = editorRef.current?.innerText || "";
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Content copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        {onTitleChange ? (
          <input
            className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Document title"
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">{title}</span>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          {onSave && (
            <Button size="sm" variant="outline" onClick={onSave} disabled={isSaving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          )}
          {onExportWord && (
            <Button size="sm" variant="outline" onClick={onExportWord}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Word
            </Button>
          )}
          {onExportPdf && (
            <Button size="sm" variant="outline" onClick={onExportPdf}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-3 py-1.5 bg-muted/30">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("bold")} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("italic")} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("underline")} title="Underline">
            <Underline className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("formatBlock", "h1")} title="Heading 1">
            <Heading1 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("formatBlock", "h2")} title="Heading 2">
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("formatBlock", "h3")} title="Heading 3">
            <Heading3 className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("insertUnorderedList")} title="Bullet list">
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("insertOrderedList")} title="Numbered list">
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("justifyLeft")} title="Align left">
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("justifyCenter")} title="Align center">
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("justifyRight")} title="Align right">
            <AlignRight className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("undo")} title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => execCommand("redo")} title="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          {onAiAction && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={isAiProcessing}>
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    AI Edit
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {AI_ACTIONS.map((action) => (
                    <DropdownMenuItem key={action.key} onClick={() => handleAiAction(action.key)}>
                      <action.icon className="mr-2 h-3.5 w-3.5" />
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedText && (
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {selectedText.length} chars selected
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className="min-h-[400px] max-h-[70vh] overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground outline-none prose prose-sm max-w-none
          prose-headings:font-display prose-headings:text-foreground
          prose-h1:text-xl prose-h1:font-bold prose-h1:mb-3
          prose-h2:text-lg prose-h2:font-semibold prose-h2:mb-2
          prose-h3:text-base prose-h3:font-semibold prose-h3:mb-1.5
          prose-p:mb-2 prose-ul:mb-2 prose-ol:mb-2 prose-li:mb-0.5"
        onInput={handleInput}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        spellCheck
      />

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border px-4 py-1.5 bg-muted/20">
        <span className="text-[10px] text-muted-foreground">
          {readOnly ? "Read only" : "Editing"} · Auto-save enabled
        </span>
        {isSaving && (
          <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>
        )}
      </div>
    </div>
  );
}
