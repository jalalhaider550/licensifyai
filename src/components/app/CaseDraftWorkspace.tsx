import { CheckCircle2, Copy, Download, FileText, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DownloadFallbackLink {
  url: string;
  fileName: string;
  label: string;
}

interface CaseDraftWorkspaceProps {
  open: boolean;
  title: string;
  content: string;
  isSaving?: boolean;
  exportLoadingFormat?: "pdf" | "docx" | null;
  downloadFallback?: DownloadFallbackLink | null;
  onChange: (value: string) => void;
  onCopy: () => void;
  onSaveDraft?: () => void;
  onApprove?: () => void;
  onExportWord?: () => void;
  onExportPdf?: () => void;
  onDismissDownloadFallback?: () => void;
  onClose: () => void;
}

export const CaseDraftWorkspace = ({
  open,
  title,
  content,
  isSaving,
  exportLoadingFormat,
  downloadFallback,
  onChange,
  onCopy,
  onSaveDraft,
  onApprove,
  onExportWord,
  onExportPdf,
  onDismissDownloadFallback,
  onClose,
}: CaseDraftWorkspaceProps) => {
  if (!open) return null;

  const isExportingWord = exportLoadingFormat === "docx";
  const isExportingPdf = exportLoadingFormat === "pdf";

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
            <Button size="sm" variant="outline" onClick={onExportWord} disabled={Boolean(exportLoadingFormat)}>
              {isExportingWord ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
              {isExportingWord ? "Generating document…" : "Word"}
            </Button>
          ) : null}
          {onExportPdf ? (
            <Button size="sm" variant="outline" onClick={onExportPdf} disabled={Boolean(exportLoadingFormat)}>
              {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
              {isExportingPdf ? "Generating document…" : "PDF"}
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

      {downloadFallback ? (
        <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              If your download didn&apos;t start automatically, use the fallback link below.
            </p>
            {onDismissDownloadFallback ? (
              <Button size="sm" variant="ghost" onClick={onDismissDownloadFallback}>
                Dismiss
              </Button>
            ) : null}
          </div>
          <a
            href={downloadFallback.url}
            download={downloadFallback.fileName}
            className="mt-2 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {downloadFallback.label}
          </a>
        </div>
      ) : null}
    </div>
  );
};