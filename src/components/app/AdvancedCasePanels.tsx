import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  Gavel,
  Lightbulb,
  Loader2,
  MapPin,
  PenTool,
  Scale,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

/* ─── Types ─── */

interface DualPosition {
  issue: string;
  claimantPosition: string;
  claimantStrength: "High" | "Medium" | "Low";
  defendantPosition: string;
  defendantStrength: "High" | "Medium" | "Low";
  counterArguments: string[];
  rebuttals: string[];
  likelyJudicialView: string;
}

interface CaseLawEntry {
  caseName: string;
  year: string;
  principle: string;
  courtLevel: string;
  application: string;
  strengthRating: "High" | "Medium" | "Low";
  category: "leading" | "supporting" | "factually_similar" | "opposing";
  jurisdiction: string;
}

interface AppliedLawEntry {
  statute: string;
  section: string;
  elements: { element: string; factMapping: string; status: "satisfied" | "missing" | "risk" }[];
  additionalAngles: string[];
}

interface EvidenceGap {
  claim: string;
  mustProve: string[];
  existingEvidence: string[];
  missingEvidence: string[];
  suggestedDocuments: string[];
  clientQuestions: string[];
}

interface StrategyOption {
  type: "litigation" | "settlement" | "hybrid";
  description: string;
  probabilityOfSuccess: string;
  riskLevel: string;
  estimatedTime: string;
  estimatedCost: string;
  pros: string[];
  cons: string[];
}

interface ProceduralStep {
  step: string;
  deadline: string;
  status: "pending" | "completed" | "overdue";
  conditionalLogic: string;
}

/* ─── Collapsible Section Wrapper ─── */

const PanelSection = ({ title, icon: Icon, children, defaultOpen = false, badge }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-xl">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const strengthColor = (s: string) => {
  if (s === "High") return "text-green-600 bg-green-500/10 border-green-500/20";
  if (s === "Medium") return "text-amber-600 bg-amber-500/10 border-amber-500/20";
  return "text-red-600 bg-red-500/10 border-red-500/20";
};

/* ═══════════════════════════════════════════
   1. DUAL-SIDED ANALYSIS PANEL
   ═══════════════════════════════════════════ */

export function DualAnalysisPanel({ data, loading, onGenerate }: {
  data: DualPosition[] | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <PanelSection title="Dual-Sided Case Analysis" icon={Scale} badge={data ? `${data.length} issues` : undefined}>
      {!data ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Analyse each legal issue from both claimant and defendant perspectives.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scale className="mr-2 h-4 w-4" />}
            {loading ? "Analysing..." : "Generate Dual Analysis"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 mt-2">
          {data.map((pos, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-3">
              <p className="text-sm font-semibold text-foreground">{pos.issue}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Claimant</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${strengthColor(pos.claimantStrength)}`}>{pos.claimantStrength}</span>
                  </div>
                  <p className="text-xs text-foreground">{pos.claimantPosition}</p>
                </div>
                <div className="rounded-lg border p-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-destructive">Defendant</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${strengthColor(pos.defendantStrength)}`}>{pos.defendantStrength}</span>
                  </div>
                  <p className="text-xs text-foreground">{pos.defendantPosition}</p>
                </div>
              </div>
              {pos.counterArguments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Counter-arguments</p>
                  <ul className="space-y-0.5">{pos.counterArguments.map((a, j) => <li key={j} className="text-xs text-muted-foreground">• {a}</li>)}</ul>
                </div>
              )}
              {pos.rebuttals.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Rebuttals</p>
                  <ul className="space-y-0.5">{pos.rebuttals.map((r, j) => <li key={j} className="text-xs text-muted-foreground">• {r}</li>)}</ul>
                </div>
              )}
              <div className="rounded bg-primary/5 border border-primary/20 p-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Likely Judicial View</p>
                <p className="text-xs text-foreground">{pos.likelyJudicialView}</p>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Refresh Analysis
          </Button>
        </div>
      )}
    </PanelSection>
  );
}

/* ═══════════════════════════════════════════
   2. EXPANDED CASE LAW PANEL
   ═══════════════════════════════════════════ */

export function ExpandedCaseLawPanel({ data, loading, onGenerate, onInsertIntoDocument, onAddToArgument }: {
  data: CaseLawEntry[] | null;
  loading: boolean;
  onGenerate: (depth: string, filters?: any) => void;
  onInsertIntoDocument?: (entry: CaseLawEntry) => void;
  onAddToArgument?: (entry: CaseLawEntry) => void;
}) {
  const [depth, setDepth] = useState("standard");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(10);

  const filtered = (data || []).filter(e => {
    if (jurisdictionFilter !== "all" && e.jurisdiction !== jurisdictionFilter) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    return true;
  });

  const categoryLabels: Record<string, string> = {
    leading: "Leading Authorities",
    supporting: "Supporting Cases",
    factually_similar: "Factually Similar",
    opposing: "Opposing (Defence) Cases",
  };

  const grouped = ["leading", "supporting", "factually_similar", "opposing"].reduce((acc, cat) => {
    const items = filtered.filter(e => e.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, CaseLawEntry[]>);

  return (
    <PanelSection title="Case Law Library" icon={BookOpen} badge={data ? `${data.length} cases` : undefined}>
      <div className="space-y-3 mt-2">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider">Depth</Label>
            <Select value={depth} onValueChange={setDepth}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick (3-5)</SelectItem>
                <SelectItem value="standard">Standard (10-15)</SelectItem>
                <SelectItem value="deep">Deep (25-50)</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider">Jurisdiction</Label>
            <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="England & Wales">England & Wales</SelectItem>
                <SelectItem value="Scotland">Scotland</SelectItem>
                <SelectItem value="EU">EU</SelectItem>
                <SelectItem value="US">US</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="leading">Leading</SelectItem>
                <SelectItem value="supporting">Supporting</SelectItem>
                <SelectItem value="factually_similar">Factually similar</SelectItem>
                <SelectItem value="opposing">Opposing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => onGenerate(depth, { jurisdiction: jurisdictionFilter, category: categoryFilter })} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {data ? "Find Cases" : "Search Case Law"}
          </Button>
        </div>

        {data && Object.keys(grouped).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, entries]) => (
              <div key={cat}>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{categoryLabels[cat] || cat}</p>
                <div className="space-y-2">
                  {entries.slice(0, visibleCount).map((entry, i) => (
                    <div key={i} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{entry.caseName}</span>
                            <span className="text-xs text-muted-foreground">({entry.year})</span>
                            <Badge variant="outline" className="text-[9px]">{entry.courtLevel}</Badge>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${strengthColor(entry.strengthRating)}`}>{entry.strengthRating}</span>
                          </div>
                          <p className="text-xs text-foreground mt-1 italic">Principle: {entry.principle}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Application: {entry.application}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {onInsertIntoDocument && (
                          <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => onInsertIntoDocument(entry)}>
                            <FileText className="mr-1 h-3 w-3" /> Insert into document
                          </Button>
                        )}
                        {onAddToArgument && (
                          <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => onAddToArgument(entry)}>
                            <PenTool className="mr-1 h-3 w-3" /> Add to argument
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length > visibleCount && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setVisibleCount(c => c + 10)}>
                Load more ({filtered.length - visibleCount} remaining)
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onGenerate(depth, { jurisdiction: jurisdictionFilter, category: categoryFilter, findSimilar: true })} disabled={loading}>
              <Search className="mr-2 h-4 w-4" /> Find similar cases
            </Button>
          </div>
        ) : data && data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases found matching filters.</p>
        ) : null}
      </div>
    </PanelSection>
  );
}

/* ═══════════════════════════════════════════
   3. APPLIED LAW PANEL
   ═══════════════════════════════════════════ */

export function AppliedLawPanel({ data, loading, onGenerate }: {
  data: AppliedLawEntry[] | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  const statusColor = (s: string) => {
    if (s === "satisfied") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (s === "missing") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  };

  return (
    <PanelSection title="Applied Law Analysis" icon={Gavel} badge={data ? `${data.length} statutes` : undefined}>
      {!data ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Map relevant statutes to case facts and identify satisfied, missing, or at-risk legal elements.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
            {loading ? "Analysing..." : "Analyse Applied Law"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {data.map((law, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
              <div>
                <p className="text-sm font-semibold text-primary font-mono">{law.statute}</p>
                <p className="text-xs text-muted-foreground">Section: {law.section}</p>
              </div>
              <div className="space-y-1.5">
                {law.elements.map((el, j) => (
                  <div key={j} className="flex items-start gap-2 rounded bg-muted/30 p-2">
                    <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor(el.status)}`}>{el.status}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{el.element}</p>
                      <p className="text-xs text-muted-foreground">{el.factMapping}</p>
                    </div>
                  </div>
                ))}
              </div>
              {law.additionalAngles.length > 0 && (
                <div className="rounded bg-primary/5 border border-primary/20 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Additional Legal Angles</p>
                  <ul className="space-y-0.5">{law.additionalAngles.map((a, j) => <li key={j} className="text-xs text-foreground">• {a}</li>)}</ul>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}>
            <Sparkles className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      )}
    </PanelSection>
  );
}

/* ═══════════════════════════════════════════
   4. EVIDENCE GAP ENGINE
   ═══════════════════════════════════════════ */

export function EvidenceGapPanel({ data, loading, onGenerate }: {
  data: EvidenceGap[] | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <PanelSection title="Evidence Gap Engine" icon={Target} badge={data ? `${data.length} claims` : undefined}>
      {!data ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Identify what must be proven for each claim, what evidence exists, and what is missing.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
            {loading ? "Analysing..." : "Analyse Evidence Gaps"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {data.map((gap, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground">{gap.claim}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Must Prove</p>
                  <ul className="space-y-0.5">{gap.mustProve.map((m, j) => <li key={j} className="text-xs text-foreground">• {m}</li>)}</ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1">Existing Evidence</p>
                  <ul className="space-y-0.5">{gap.existingEvidence.length > 0 ? gap.existingEvidence.map((e, j) => <li key={j} className="text-xs text-foreground">• {e}</li>) : <li className="text-xs text-muted-foreground">None identified</li>}</ul>
                </div>
              </div>
              {gap.missingEvidence.length > 0 && (
                <div className="rounded bg-destructive/5 border border-destructive/20 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-1">Missing Evidence</p>
                  <ul className="space-y-0.5">{gap.missingEvidence.map((m, j) => <li key={j} className="text-xs text-foreground">• {m}</li>)}</ul>
                </div>
              )}
              {gap.suggestedDocuments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Suggested Documents</p>
                  <ul className="space-y-0.5">{gap.suggestedDocuments.map((d, j) => <li key={j} className="text-xs text-primary">• {d}</li>)}</ul>
                </div>
              )}
              {gap.clientQuestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Questions for Client</p>
                  <ul className="space-y-0.5">{gap.clientQuestions.map((q, j) => <li key={j} className="text-xs text-muted-foreground">• {q}</li>)}</ul>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}><Sparkles className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      )}
    </PanelSection>
  );
}

/* ═══════════════════════════════════════════
   5. STRATEGY OPTIONS PANEL
   ═══════════════════════════════════════════ */

export function StrategyOptionsPanel({ data, loading, onGenerate }: {
  data: StrategyOption[] | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <PanelSection title="Strategy Options" icon={TrendingUp} badge={data ? `${data.length} options` : undefined}>
      {!data ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Compare litigation, settlement, and hybrid strategies with probability, risk, time, and cost estimates.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
            {loading ? "Analysing..." : "Generate Strategy Options"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {data.map((opt, i) => (
            <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] capitalize">{opt.type}</Badge>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${strengthColor(opt.riskLevel === "Low" ? "High" : opt.riskLevel === "High" ? "Low" : "Medium")}`}>
                  Risk: {opt.riskLevel}
                </span>
              </div>
              <p className="text-xs text-foreground">{opt.description}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-muted/30 p-1.5">
                  <p className="text-[10px] text-muted-foreground">Success</p>
                  <p className="text-xs font-bold text-foreground">{opt.probabilityOfSuccess}</p>
                </div>
                <div className="rounded bg-muted/30 p-1.5">
                  <p className="text-[10px] text-muted-foreground">Time</p>
                  <p className="text-xs font-bold text-foreground">{opt.estimatedTime}</p>
                </div>
                <div className="rounded bg-muted/30 p-1.5">
                  <p className="text-[10px] text-muted-foreground">Cost</p>
                  <p className="text-xs font-bold text-foreground">{opt.estimatedCost}</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-green-600 mb-0.5">Pros</p>
                  <ul className="space-y-0.5">{opt.pros.map((p, j) => <li key={j} className="text-xs text-foreground">• {p}</li>)}</ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-red-600 mb-0.5">Cons</p>
                  <ul className="space-y-0.5">{opt.cons.map((c, j) => <li key={j} className="text-xs text-foreground">• {c}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}><Sparkles className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      )}
    </PanelSection>
  );
}

/* ═══════════════════════════════════════════
   6. PROCEDURAL INTELLIGENCE PANEL
   ═══════════════════════════════════════════ */

export function ProceduralIntelligencePanel({ data, loading, onGenerate }: {
  data: ProceduralStep[] | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  const statusStyle = (s: string) => {
    if (s === "completed") return "bg-green-500/10 text-green-600";
    if (s === "overdue") return "bg-red-500/10 text-red-600";
    return "bg-muted text-muted-foreground";
  };

  return (
    <PanelSection title="Procedural Intelligence" icon={MapPin} badge={data ? `${data.length} steps` : undefined}>
      {!data ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Jurisdiction-aware procedural timeline with conditional logic and next steps.</p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            {loading ? "Generating..." : "Generate Procedural Timeline"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {data.map((step, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border bg-background p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-foreground">{step.step}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusStyle(step.status)}`}>{step.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Deadline: {step.deadline}</p>
                {step.conditionalLogic && <p className="text-xs text-primary mt-0.5 italic">If: {step.conditionalLogic}</p>}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}><Sparkles className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      )}
    </PanelSection>
  );
}

/* ═══════════════════════════════════════════
   7. DRAFT ANYTHING PANEL
   ═══════════════════════════════════════════ */

/* ─── Document Type Detection ─── */

interface DetectedDocType {
  type: string;
  label: string;
  jurisdictionFormat: string;
}

const DOC_TYPE_PATTERNS: { patterns: RegExp; ukType: string; ukLabel: string; usType: string; usLabel: string }[] = [
  { patterns: /skeleton\s*argument|skeleton/i, ukType: "skeleton_argument", ukLabel: "Skeleton Argument (UK)", usType: "trial_brief", usLabel: "Trial Brief (US)" },
  { patterns: /trial\s*brief/i, ukType: "skeleton_argument", ukLabel: "Skeleton Argument (UK)", usType: "trial_brief", usLabel: "Trial Brief (US)" },
  { patterns: /legal\s*brief/i, ukType: "skeleton_argument", ukLabel: "Skeleton Argument (UK)", usType: "legal_brief", usLabel: "Legal Brief (US)" },
  { patterns: /motion/i, ukType: "application_notice", ukLabel: "Application Notice (UK)", usType: "motion", usLabel: "Motion (US)" },
  { patterns: /court\s*submission/i, ukType: "skeleton_argument", ukLabel: "Skeleton Argument (UK)", usType: "court_submission", usLabel: "Court Submission (US)" },
  { patterns: /witness\s*statement/i, ukType: "witness_statement", ukLabel: "Witness Statement (UK)", usType: "witness_declaration", usLabel: "Declaration (US)" },
  { patterns: /defence|defense/i, ukType: "defence", ukLabel: "Defence (UK)", usType: "answer", usLabel: "Answer (US)" },
  { patterns: /particulars\s*of\s*claim/i, ukType: "particulars_of_claim", ukLabel: "Particulars of Claim (UK)", usType: "complaint", usLabel: "Complaint (US)" },
  { patterns: /claim\s*form/i, ukType: "claim_form", ukLabel: "Claim Form (UK)", usType: "complaint", usLabel: "Complaint (US)" },
  { patterns: /complaint/i, ukType: "particulars_of_claim", ukLabel: "Particulars of Claim (UK)", usType: "complaint", usLabel: "Complaint (US)" },
];

const detectDocType = (input: string, jurisdiction: string): DetectedDocType | null => {
  const isUK = jurisdiction.toLowerCase().includes("uk") || jurisdiction.toLowerCase().includes("england");
  for (const entry of DOC_TYPE_PATTERNS) {
    if (entry.patterns.test(input)) {
      return {
        type: isUK ? entry.ukType : entry.usType,
        label: isUK ? entry.ukLabel : entry.usLabel,
        jurisdictionFormat: isUK ? "UK" : "US",
      };
    }
  }
  return null;
};

export function DraftAnythingPanel({ loading, onDraft, jurisdiction }: {
  loading: boolean;
  jurisdiction: string;
  onDraft: (request: string, options: { side: string; tone: string; detailLevel: string; includeCaseLaw: boolean; includeStatutes: boolean; includeReasoning: boolean; detectedDocType?: DetectedDocType | null }) => void;
}) {
  const [request, setRequest] = useState("");
  const [side, setSide] = useState("neutral");
  const [tone, setTone] = useState("professional");
  const [detailLevel, setDetailLevel] = useState("standard");
  const [includeCaseLaw, setIncludeCaseLaw] = useState(false);
  const [includeStatutes, setIncludeStatutes] = useState(false);
  const [includeReasoning, setIncludeReasoning] = useState(false);
  const [overrideDocType, setOverrideDocType] = useState<string | null>(null);

  const detected = request.trim() ? detectDocType(request, jurisdiction) : null;
  const activeDocType = overrideDocType
    ? { type: overrideDocType, label: overrideDocType === "skeleton_argument" ? "Skeleton Argument (UK)" : overrideDocType === "trial_brief" ? "Trial Brief (US)" : overrideDocType, jurisdictionFormat: overrideDocType.includes("uk") || ["skeleton_argument", "defence", "particulars_of_claim", "claim_form", "witness_statement", "application_notice"].includes(overrideDocType) ? "UK" : "US" } as DetectedDocType
    : detected;

  const draftOptions = { side, tone, detailLevel, includeCaseLaw, includeStatutes, includeReasoning, detectedDocType: activeDocType };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <PenTool className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Draft Anything</h3>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Type any document request — LBC, defence, NDA, skeleton argument, witness statement..."
          value={request}
          onChange={e => { setRequest(e.target.value); setOverrideDocType(null); }}
          onKeyDown={e => {
            if (e.key === "Enter" && request.trim()) {
              e.preventDefault();
              onDraft(request, draftOptions);
            }
          }}
        />
        <Button
          onClick={() => onDraft(request, draftOptions)}
          disabled={loading || !request.trim()}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Drafting..." : "Draft"}
        </Button>
      </div>

      {/* Detected Document Type Badge */}
      {detected && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
            <FileText className="mr-1 h-3 w-3" />
            Document type: {activeDocType?.label || detected.label}
          </Badge>
          {!overrideDocType && (
            <span className="text-[10px] text-muted-foreground">Auto-detected from request and jurisdiction ({jurisdiction})</span>
          )}
          <Select value={overrideDocType || ""} onValueChange={(val) => setOverrideDocType(val || null)}>
            <SelectTrigger className="h-6 w-auto text-[10px] border-dashed gap-1 px-2">
              <SelectValue placeholder="Override format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skeleton_argument">Skeleton Argument (UK)</SelectItem>
              <SelectItem value="trial_brief">Trial Brief (US)</SelectItem>
              <SelectItem value="legal_brief">Legal Brief (US)</SelectItem>
              <SelectItem value="motion">Motion (US)</SelectItem>
              <SelectItem value="application_notice">Application Notice (UK)</SelectItem>
              <SelectItem value="defence">Defence (UK)</SelectItem>
              <SelectItem value="answer">Answer (US)</SelectItem>
              <SelectItem value="particulars_of_claim">Particulars of Claim (UK)</SelectItem>
              <SelectItem value="complaint">Complaint (US)</SelectItem>
              <SelectItem value="witness_statement">Witness Statement (UK)</SelectItem>
              <SelectItem value="witness_declaration">Declaration (US)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Document Controls */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="h-3 w-3" /> Document controls
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">Side</Label>
              <Select value={side} onValueChange={setSide}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="claimant">Claimant</SelectItem>
                  <SelectItem value="defendant">Defendant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="conciliatory">Conciliatory</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">Detail</Label>
              <Select value={detailLevel} onValueChange={setDetailLevel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={includeCaseLaw} onCheckedChange={setIncludeCaseLaw} id="inc-cl" />
              <Label htmlFor="inc-cl" className="text-xs">Include case law</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeStatutes} onCheckedChange={setIncludeStatutes} id="inc-st" />
              <Label htmlFor="inc-st" className="text-xs">Include statutes</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeReasoning} onCheckedChange={setIncludeReasoning} id="inc-re" />
              <Label htmlFor="inc-re" className="text-xs">Include reasoning</Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
