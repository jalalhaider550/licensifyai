import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  FileUp,
  Loader2,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";

interface ReviewRisk {
  severity: "high" | "medium" | "low";
  description: string;
}

interface DocumentReview {
  summary: string;
  missingClauses: string[];
  risks: ReviewRisk[];
  improvements: string[];
}

interface SubClause {
  number: string;
  body: string;
}

interface DocumentClause {
  number: string;
  title: string;
  body: string;
  subClauses?: SubClause[];
}

interface DocumentWarning {
  type: string;
  message: string;
}

export interface ReviewedDocument {
  title: string;
  date: string;
  parties: Record<string, string>;
  recitals: string;
  definitions: { term: string; definition: string }[];
  clauses: DocumentClause[];
  governingLaw: string;
  signatureBlock: string;
  warnings: DocumentWarning[];
}

interface Props {
  documentType: string;
  onDocumentReviewed: (doc: ReviewedDocument, review: DocumentReview, originalText: string) => void;
  onCancel: () => void;
}

type ImprovementMode = "improve" | "strict" | "balanced" | "favor_party_a" | "add_missing";

const MODES: { value: ImprovementMode; label: string; icon: React.ReactNode }[] = [
  { value: "improve", label: "Improve Document", icon: <Sparkles className="h-4 w-4" /> },
  { value: "strict", label: "Make it Strict", icon: <Shield className="h-4 w-4" /> },
  { value: "balanced", label: "Balance Terms", icon: null },
  { value: "favor_party_a", label: "Favor Party A", icon: null },
  { value: "add_missing", label: "Add Missing Clauses", icon: null },
];

const severityColor: Record<string, string> = {
  high: "text-destructive",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

export const DocumentUploadReview = ({ documentType, onDocumentReviewed, onCancel }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<DocumentReview | null>(null);
  const [selectedMode, setSelectedMode] = useState<ImprovementMode>("improve");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selected.size > maxSize) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const validExt = [".pdf", ".docx", ".txt"];
    const ext = selected.name.toLowerCase().slice(selected.name.lastIndexOf("."));

    if (!validTypes.includes(selected.type) && !validExt.includes(ext)) {
      toast.error("Unsupported file type. Please upload a PDF, Word (.docx), or Text file.");
      return;
    }

    setFile(selected);
    setReview(null);
    setExtracting(true);

    try {
      const text = await extractTextFromFile(selected);
      if (!text.trim()) {
        toast.error("Could not extract text from this document. It may be scanned or image-based.");
        setFile(null);
        return;
      }
      setExtractedText(text);
      toast.success("Document uploaded and parsed successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Unable to read document. Please upload a valid PDF or Word file.");
      setFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleReviewAndImprove = async (mode: ImprovementMode) => {
    if (!extractedText) return;
    setSelectedMode(mode);
    setReviewing(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-legal-document", {
        body: {
          action: "review-document",
          documentText: extractedText.slice(0, 30000), // Limit to avoid token overflow
          documentType,
          improvementMode: mode,
        },
      });

      if (error) {
        if (error.message?.includes("402")) {
          toast.error("Your AI balance is used up. Please top up in Settings → Cloud & AI balance.", { duration: 8000 });
          return;
        }
        if (error.message?.includes("429")) {
          toast.error("AI rate limit reached. Please wait a moment and try again.", { duration: 6000 });
          return;
        }
        throw error;
      }

      if (!data?.success) {
        if (data?.errorType === "credits_exhausted") {
          toast.error("Your AI balance is used up. Please top up in Settings → Cloud & AI balance.", { duration: 8000 });
          return;
        }
        throw new Error(data?.error || "Failed to review document");
      }

      const parsed = data.document;

      if (parsed.review) {
        setReview(parsed.review);
      }

      if (parsed.improvedDocument) {
        onDocumentReviewed(parsed.improvedDocument, parsed.review, extractedText);
      } else {
        // Fallback: treat the whole response as the document
        onDocumentReviewed(parsed, parsed.review, extractedText);
      }

      toast.success("Document reviewed and improved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to review document");
    } finally {
      setReviewing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setExtractedText(null);
    setReview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              Upload Existing Document
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a PDF, Word, or Text file for AI-powered legal review and improvement.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <Separator />

        {!file ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Click to upload document</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT — Max 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileUp className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile} disabled={extracting || reviewing}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {extracting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting document content…
              </div>
            )}

            {/* Extracted text preview */}
            {extractedText && !extracting && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Document Preview</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-[12]">
                    {extractedText.slice(0, 2000)}
                    {extractedText.length > 2000 && "…"}
                  </p>
                </div>

                <Separator />

                {/* AI Review Actions */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Choose how AI should process this document:</p>
                  <div className="flex flex-wrap gap-2">
                    {MODES.map((mode) => (
                      <Button
                        key={mode.value}
                        variant={selectedMode === mode.value && reviewing ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleReviewAndImprove(mode.value)}
                        disabled={reviewing}
                      >
                        {reviewing && selectedMode === mode.value ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : mode.icon ? (
                          <span className="mr-1">{mode.icon}</span>
                        ) : null}
                        {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {reviewing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is reviewing and improving your document… This may take up to 60 seconds.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Results (shown inline before navigation to workspace) */}
      {review && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-foreground">AI Legal Review</h3>

          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
            <p className="text-sm text-foreground">{review.summary}</p>
          </div>

          {review.missingClauses?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Missing Clauses</p>
              <ul className="space-y-1">
                {review.missingClauses.map((c, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.risks?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Risk Analysis</p>
              <ul className="space-y-1.5">
                {review.risks.map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className={`text-xs font-bold uppercase ${severityColor[r.severity] || "text-muted-foreground"}`}>
                      [{r.severity}]
                    </span>
                    <span className="text-foreground">{r.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.improvements?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Suggested Improvements</p>
              <ul className="space-y-1">
                {review.improvements.map((imp, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
