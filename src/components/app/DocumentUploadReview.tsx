import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  FileUp,
  Gavel,
  Loader2,
  Scale,
  Shield,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";

interface ClauseBreakdown {
  clauseName: string;
  whatItDoes: string;
  strength: "strong" | "weak" | "moderate";
  favors: string;
  riskLevel: "high" | "medium" | "low";
  analysis: string;
}

interface CaseReference {
  caseName: string;
  year: string;
  principle: string;
  relevance: string;
}

interface ImprovementItem {
  clause: string;
  currentIssue: string;
  suggestedFix: string;
}

interface ReviewRisk {
  severity: "high" | "medium" | "low";
  description: string;
}

interface DocumentReview {
  summary: string;
  caseSummary?: {
    parties?: { partyA?: string; partyB?: string };
    documentType?: string;
    jurisdiction?: string;
    purpose?: string;
  };
  clauseByClauseBreakdown?: ClauseBreakdown[];
  keyIssues?: string[];
  applicableLaws?: {
    statutes?: string[];
    caseReferences?: CaseReference[];
  };
  legalAnalysis?: string | {
    overallStrength?: string;
    enforceability?: string;
    commercialFairness?: string;
    riskExposure?: string;
  };
  missingClauses: string[];
  risks: ReviewRisk[];
  improvements: (string | ImprovementItem)[];
  riskLevel?: "high" | "medium" | "low";
  strengthScore?: number;
  redFlags?: string[];
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

const riskBadge: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

export const DocumentUploadReview = ({ documentType, onDocumentReviewed, onCancel }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<DocumentReview | null>(null);
  const [selectedMode, setSelectedMode] = useState<ImprovementMode>("improve");
  const [userInstruction, setUserInstruction] = useState("");
  const [generatingFromDoc, setGeneratingFromDoc] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [improvedText, setImprovedText] = useState<string | null>(null);
  const [pendingDoc, setPendingDoc] = useState<{ doc: ReviewedDocument; review: DocumentReview | null; originalText: string } | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to review when it appears
  useEffect(() => {
    if (review && reviewSectionRef.current) {
      reviewSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [review]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxSize = 10 * 1024 * 1024;
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
    setImprovedText(null);
    setShowComparison(false);
    setExtracting(true);

    try {
      const text = await extractTextFromFile(selected);
      if (!text.trim()) {
        toast.error("Could not extract text from this document. It may be scanned or image-based.");
        setFile(null);
        return;
      }
      setExtractedText(text);
      toast.success("Document uploaded — starting AI review…");
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
    setReviewError(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-legal-document", {
        body: {
          action: "review-document",
          documentText: extractedText.slice(0, 30000),
          documentType,
          improvementMode: mode,
          userInstruction: userInstruction.trim() || undefined,
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
        const improvedLines = parsed.improvedDocument.clauses
          ?.map((c: DocumentClause) => `${c.number}. ${c.title}\n${c.body}`)
          .join("\n\n") || "";
        setImprovedText(improvedLines);
        setPendingDoc({ doc: parsed.improvedDocument, review: parsed.review, originalText: extractedText });
      } else {
        setPendingDoc({ doc: parsed, review: parsed.review, originalText: extractedText });
      }

      toast.success("Document reviewed and improved successfully");
    } catch (err: any) {
      console.error(err);
      setReviewError(true);
      toast.error(err.message || "Failed to review document");
    } finally {
      setReviewing(false);
    }
  };

  const handleGenerateFromDocument = async () => {
    if (!extractedText) return;
    if (!userInstruction.trim()) {
      toast.error("Please enter an instruction for what you want to generate.");
      return;
    }
    setGeneratingFromDoc(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-legal-document", {
        body: {
          action: "generate-from-document",
          documentText: extractedText.slice(0, 30000),
          documentType,
          userInstruction: userInstruction.trim(),
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
        throw new Error(data?.error || "Failed to generate document");
      }

      const doc = data.document;
      onDocumentReviewed(doc, null as any, extractedText);
      toast.success("New document generated from your upload");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate document");
    } finally {
      setGeneratingFromDoc(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setExtractedText(null);
    setReview(null);
    setImprovedText(null);
    setShowComparison(false);
    setUserInstruction("");
    setReviewError(false);
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

            {!extracting && reviewing && !review && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Analyzing contract…</p>
                  <p className="text-xs text-muted-foreground">AI is performing a full legal review. This may take up to 60 seconds.</p>
                </div>
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

                {/* Review Contract Button - Primary CTA */}
                {!review && (
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-2">
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handleReviewAndImprove("improve")}
                      disabled={reviewing || generatingFromDoc}
                    >
                      {reviewing ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Gavel className="mr-2 h-5 w-5" />
                      )}
                      {reviewing ? "Analyzing contract…" : "Review Contract"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      AI will perform a full legal review with strength score, risk rating, and clause-by-clause analysis.
                    </p>
                  </div>
                )}

                {/* Review error with retry */}
                {reviewError && !reviewing && !review && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <XCircle className="h-4 w-4 shrink-0" />
                      Review failed. Please try again.
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleReviewAndImprove("improve")}>
                      Retry Review
                    </Button>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">What do you want to do with this document?</p>
                  <Textarea
                    value={userInstruction}
                    onChange={(e) => setUserInstruction(e.target.value)}
                    rows={2}
                    placeholder='e.g. "Make this stricter", "Convert to NDA", "Add payment terms", "Make UK compliant"'
                    className="border-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: AI will combine your instruction with the selected mode below.
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Choose how AI should process this document:</p>
                  <div className="flex flex-wrap gap-2">
                    {MODES.map((mode) => (
                      <Button
                        key={mode.value}
                        variant={selectedMode === mode.value && reviewing ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleReviewAndImprove(mode.value)}
                        disabled={reviewing || generatingFromDoc}
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

                <div className="pt-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateFromDocument}
                    disabled={reviewing || generatingFromDoc || !userInstruction.trim()}
                  >
                    {generatingFromDoc ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-1 h-4 w-4" />
                    )}
                    Generate New Document from This
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requires an instruction above (e.g. "Convert to NDA", "Create service agreement from these terms").
                  </p>
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

      {review && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          {/* Header with badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              Full Legal Review
            </h3>
            <div className="flex items-center gap-2">
              {review.riskLevel && (
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${riskBadge[review.riskLevel] || riskBadge.medium}`}>
                  Risk: {review.riskLevel}
                </span>
              )}
              {typeof review.strengthScore === "number" && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
                  Strength: {review.strengthScore}/10
                </span>
              )}
            </div>
          </div>

          {/* 1. Case Summary */}
          {review.caseSummary && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> 1. Case Summary
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {review.caseSummary.parties?.partyA && (
                  <div><span className="font-medium text-muted-foreground">Party A:</span> <span className="text-foreground">{review.caseSummary.parties.partyA}</span></div>
                )}
                {review.caseSummary.parties?.partyB && (
                  <div><span className="font-medium text-muted-foreground">Party B:</span> <span className="text-foreground">{review.caseSummary.parties.partyB}</span></div>
                )}
                {review.caseSummary.documentType && (
                  <div><span className="font-medium text-muted-foreground">Type:</span> <span className="text-foreground">{review.caseSummary.documentType}</span></div>
                )}
                {review.caseSummary.jurisdiction && (
                  <div><span className="font-medium text-muted-foreground">Jurisdiction:</span> <span className="text-foreground">{review.caseSummary.jurisdiction}</span></div>
                )}
              </div>
              {review.caseSummary.purpose && (
                <p className="text-sm text-foreground">{review.caseSummary.purpose}</p>
              )}
            </div>
          )}

          {/* 2. Clause-by-Clause Breakdown */}
          {review.clauseByClauseBreakdown && review.clauseByClauseBreakdown.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Scale className="h-4 w-4" /> 2. Clause-by-Clause Breakdown
              </p>
              <div className="space-y-3">
                {review.clauseByClauseBreakdown.map((clause, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-semibold text-foreground">{clause.clauseName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskBadge[clause.riskLevel] || riskBadge.medium}`}>
                          {clause.riskLevel}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          clause.strength === "strong" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" :
                          clause.strength === "weak" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                          "border-amber-500/30 bg-amber-500/10 text-amber-600"
                        }`}>
                          {clause.strength}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                          Favors: {clause.favors}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{clause.whatItDoes}</p>
                    <p className="text-xs text-foreground border-t border-border pt-1.5">{clause.analysis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Key Legal Issues */}
          {review.keyIssues && review.keyIssues.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> 3. Key Legal Issues
              </p>
              <ul className="space-y-1">
                {review.keyIssues.map((issue, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Applicable Laws & Case References */}
          {review.applicableLaws && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> 4. Applicable Laws & Case References
              </p>
              {review.applicableLaws.statutes && review.applicableLaws.statutes.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Statutes</p>
                  <ul className="space-y-0.5">
                    {review.applicableLaws.statutes.map((s, i) => (
                      <li key={i} className="text-sm text-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.applicableLaws.caseReferences && review.applicableLaws.caseReferences.length > 0 && (
                <div className="space-y-2">
                  {review.applicableLaws.caseReferences.map((ref, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{ref.caseName} ({ref.year})</p>
                      <p className="text-xs text-muted-foreground italic">{ref.principle}</p>
                      <p className="text-xs text-foreground mt-1">→ {ref.relevance}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Legal Analysis */}
          {review.legalAnalysis && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Scale className="h-4 w-4" /> 5. Legal Analysis
              </p>
              {typeof review.legalAnalysis === "string" ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.legalAnalysis}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {review.legalAnalysis.overallStrength && (
                    <div><span className="font-medium text-muted-foreground">Overall Strength:</span> <span className="text-foreground">{review.legalAnalysis.overallStrength}</span></div>
                  )}
                  {review.legalAnalysis.enforceability && (
                    <div><span className="font-medium text-muted-foreground">Enforceability:</span> <span className="text-foreground">{review.legalAnalysis.enforceability}</span></div>
                  )}
                  {review.legalAnalysis.commercialFairness && (
                    <div><span className="font-medium text-muted-foreground">Commercial Fairness:</span> <span className="text-foreground">{review.legalAnalysis.commercialFairness}</span></div>
                  )}
                  {review.legalAnalysis.riskExposure && (
                    <div><span className="font-medium text-muted-foreground">Risk Exposure:</span> <span className="text-foreground">{review.legalAnalysis.riskExposure}</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. Recommended Improvements */}
          {review.improvements?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> 6. Recommended Improvements
              </p>
              <div className="space-y-2">
                {review.improvements.map((imp, i) => (
                  <div key={i} className="text-sm">
                    {typeof imp === "string" ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{imp}</span>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border p-2.5 space-y-1">
                        <p className="font-medium text-foreground">{imp.clause}</p>
                        <p className="text-xs text-destructive">Issue: {imp.currentIssue}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Fix: {imp.suggestedFix}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Missing Clauses */}
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

          {/* 8. Red Flags */}
          {review.redFlags && review.redFlags.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" /> 8. Red Flags
              </p>
              <ul className="space-y-1.5">
                {review.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Analysis */}
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

          {/* Executive Summary */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Executive Summary</p>
            <p className="text-sm text-foreground">{review.summary}</p>
          </div>
          {/* Proceed Button */}
          {pendingDoc && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => {
                  onDocumentReviewed(pendingDoc.doc, pendingDoc.review as DocumentReview, pendingDoc.originalText);
                }}
              >
                <FileText className="mr-1 h-4 w-4" />
                Proceed to Edit Document
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Open the document editor to make changes, add clauses, and download.</p>
            </div>
          )}
        </div>
      )}

      {extractedText && improvedText && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison((p) => !p)}
          >
            <ArrowRightLeft className="mr-1 h-4 w-4" />
            {showComparison ? "Hide Comparison" : "Compare Original vs Improved"}
          </Button>

          {showComparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original Document</p>
                <div className="max-h-80 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {extractedText.slice(0, 5000)}
                    {extractedText.length > 5000 && "\n\n… [truncated]"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">AI Improved Version</p>
                <div className="max-h-80 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {improvedText.slice(0, 5000)}
                    {improvedText.length > 5000 && "\n\n… [truncated]"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
