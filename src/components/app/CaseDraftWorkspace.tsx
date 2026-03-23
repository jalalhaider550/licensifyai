import { CheckCircle2, Copy, Download, FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CaseDraftWorkspaceProps {
  open: boolean;
  title: string;
  content: string;
  isSaving?: boolean;
  onChange: (value: string) => void;
  onCopy: () => void;
  onSaveDraft?: () => void;
  onApprove?: () => void;
  onExportWord?: () => void;
  onExportPdf?: () => void;
  onClose: () => void;
}

export const CaseDraftWorkspace = ({
  open,
  title,
  content,
  isSaving,
  onChange,
  onCopy,
  onSaveDraft,
  onApprove,
  onExportWord,
  onExportPdf,
  onClose,
}: CaseDraftWorkspaceProps) => {
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
          {onSaveDraft ? (
            <Button size="sm" variant="outline" onClick={onSaveDraft} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
          ) : null}
          {onExportWord ? (
            <Button size="sm" variant="outline" onClick={onExportWord}>
              <Download className="mr-2 h-4 w-4" /> Word
            </Button>
          ) : null}
          {onExportPdf ? (
            <Button size="sm" variant="outline" onClick={onExportPdf}>
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          ) : null}
          {onApprove ? (
            <Button size="sm" onClick={onApprove} disabled={isSaving}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          ) : null}
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