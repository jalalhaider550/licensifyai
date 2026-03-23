import { Copy, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CaseDraftWorkspaceProps {
  open: boolean;
  title: string;
  content: string;
  onChange: (value: string) => void;
  onCopy: () => void;
  onClose: () => void;
}

export const CaseDraftWorkspace = ({ open, title, content, onChange, onCopy, onClose }: CaseDraftWorkspaceProps) => {
  if (!open) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">Generated from the current case context and ready for legal review.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Textarea value={content} onChange={(event) => onChange(event.target.value)} rows={18} className="mt-4 font-mono text-sm leading-relaxed" />
    </div>
  );
};