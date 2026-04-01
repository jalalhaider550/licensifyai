export const CASE_TYPES = [
  { value: "licensing", label: "Licensing", description: "Regulatory licensing and compliance matters." },
  { value: "contract_dispute", label: "Contract dispute", description: "Breach, termination, payment, or enforcement issues." },
  { value: "corporate", label: "Corporate / company setup", description: "Incorporation, structuring, and governance work." },
  { value: "employment", label: "Employment", description: "Workplace disputes, contracts, and HR matters." },
  { value: "intellectual_property", label: "Intellectual property", description: "Trade marks, copyright, IP protection, and disputes." },
  { value: "general_legal", label: "General legal", description: "General advisory and mixed legal matters." },
  { value: "litigation", label: "Litigation", description: "Court proceedings, claims, defences, and dispute resolution." },
  { value: "conveyancing", label: "Conveyancing", description: "Property transactions, searches, and title work." },
  { value: "advisory", label: "Advisory", description: "Legal opinions, risk assessments, and strategic advice." },
] as const;

export interface CaseRisk {
  id: string;
  title: string;
  level: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  description: string;
  mitigation?: string;
  detectedAt: string;
  linkedDocId?: string;
}

export interface CaseDeadline {
  id: string;
  title: string;
  date: string;
  type: "court" | "filing" | "milestone" | "limitation" | "contractual";
  status: "upcoming" | "overdue" | "completed";
  linkedStepId?: string;
}

export interface LitigationData {
  timeline: { date: string; event: string; category: string }[];
  evidence: { name: string; type: string; status: string; relevance: string }[];
  filings: { name: string; filedDate?: string; dueDate?: string; status: string }[];
  courtDates: { date: string; type: string; venue?: string }[];
}

export interface CorporateData {
  dueDiligence: { area: string; status: string; findings: string; riskLevel: string }[];
  obligations: { clause: string; party: string; deadline?: string; status: string }[];
  entities: { name: string; type: string; jurisdiction: string; relationship: string }[];
}

export type CaseTypeValue = (typeof CASE_TYPES)[number]["value"];

export type CasePriority = "high" | "medium" | "low";
export type CaseActionType =
  | "draft_document"
  | "review_matter"
  | "upload_document"
  | "generate_strategy";

export interface CaseRecommendation {
  title: string;
  why?: string;
  priority?: CasePriority;
  actionLabel?: string;
  actionType?: CaseActionType;
  draftType?: string;
  documentCategory?: string;
  legalBasis?: string;
  confidence?: string;
  phase?: string;
}

export interface MissingInfoAction {
  label: string;
  why?: string;
  priority?: CasePriority;
  actionLabel?: string;
  actionType?: CaseActionType;
  documentCategory?: string;
}

export const CASE_TYPE_LABELS: Record<CaseTypeValue, string> = CASE_TYPES.reduce((acc, type) => {
  acc[type.value] = type.label;
  return acc;
}, {} as Record<CaseTypeValue, string>);

export const CASE_DOCUMENT_CATEGORIES = [
  { value: "agreement", label: "Agreement / contract" },
  { value: "correspondence", label: "Correspondence" },
  { value: "evidence", label: "Evidence" },
  { value: "corporate_record", label: "Corporate record" },
  { value: "employment_record", label: "Employment record" },
  { value: "ip_material", label: "IP material" },
  { value: "licensing_material", label: "Licensing material" },
  { value: "supporting", label: "Supporting document" },
] as const;

export const getCaseTypeLabel = (value?: string | null) => {
  if (!value) return "General legal";
  return CASE_TYPE_LABELS[value as CaseTypeValue] || value.replace(/_/g, " ");
};

export const normalizeFacts = (value: string | string[] | undefined | null) => {
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value
    .split(/\n|•|\-/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const normalizeCasePriority = (value?: string | null): CasePriority => {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
};

export const normalizeCaseActionType = (value?: string | null, label?: string | null): CaseActionType => {
  const normalized = (value || "").toLowerCase();
  const text = `${normalized} ${(label || "").toLowerCase()}`;

  if (normalized === "draft_document") return "draft_document";
  if (normalized === "review_matter") return "review_matter";
  if (normalized === "upload_document") return "upload_document";
  if (normalized === "generate_strategy") return "generate_strategy";

  if (text.includes("upload") || text.includes("evidence") || text.includes("proof")) return "upload_document";
  if (text.includes("strategy") || text.includes("negotiation") || text.includes("settlement")) return "generate_strategy";
  if (text.includes("review") || text.includes("analy") || text.includes("clause")) return "review_matter";
  return "draft_document";
};

export const parseCaseRecommendations = (value: unknown): CaseRecommendation[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const actionType = normalizeCaseActionType(undefined, item);
        return {
          title: item,
          actionLabel:
            actionType === "review_matter"
              ? "Open review"
              : actionType === "generate_strategy"
                ? "Generate strategy"
                : "Generate draft",
          actionType,
          priority: "medium" as const,
        };
      }

      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : "Open legal action";
      const actionType = normalizeCaseActionType(typeof record.actionType === "string" ? record.actionType : null, title);

      return {
        title,
        why: typeof record.why === "string" ? record.why : undefined,
        priority: normalizeCasePriority(typeof record.priority === "string" ? record.priority : null),
        actionLabel:
          typeof record.actionLabel === "string"
            ? record.actionLabel
            : actionType === "review_matter"
              ? "Open review"
              : actionType === "generate_strategy"
                ? "Generate strategy"
                : "Generate draft",
        actionType,
        draftType: typeof record.draftType === "string" ? record.draftType : title,
        documentCategory: typeof record.documentCategory === "string" ? record.documentCategory : undefined,
      };
    })
    .filter(Boolean) as CaseRecommendation[];
};

export const parseMissingInfoActions = (value: unknown): MissingInfoAction[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          label: item,
          actionLabel: item.toLowerCase().includes("upload") ? "Upload now" : "Review",
          actionType: item.toLowerCase().includes("upload") ? ("upload_document" as const) : normalizeCaseActionType(undefined, item),
          priority: "medium" as const,
        };
      }

      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label : "Resolve missing information";
      const actionType = normalizeCaseActionType(typeof record.actionType === "string" ? record.actionType : null, label);

      return {
        label,
        why: typeof record.why === "string" ? record.why : undefined,
        priority: normalizeCasePriority(typeof record.priority === "string" ? record.priority : null),
        actionLabel:
          typeof record.actionLabel === "string"
            ? record.actionLabel
            : actionType === "upload_document"
              ? "Upload now"
              : actionType === "review_matter"
                ? "Open review"
                : actionType === "generate_strategy"
                  ? "Generate strategy"
                  : "Generate draft",
        actionType,
        documentCategory: typeof record.documentCategory === "string" ? record.documentCategory : undefined,
      };
    })
    .filter(Boolean) as MissingInfoAction[];
};

export const deriveCaseStatus = ({
  summary,
  keyFacts,
  recommendationCount,
  documentCount,
}: {
  summary?: string | null;
  keyFacts?: string | string[] | null;
  recommendationCount?: number;
  documentCount?: number;
}) => {
  const hasSummary = Boolean(summary?.trim());
  const factCount = normalizeFacts(keyFacts).length;
  const hasRecommendations = (recommendationCount || 0) > 0;
  const hasDocuments = (documentCount || 0) > 0;

  if (hasSummary && factCount > 0 && hasRecommendations) return "Ready for Action";
  if (hasSummary || factCount > 0 || hasDocuments) return "In Progress";
  return "Draft";
};

export const normalizeCaseStatus = (value?: string | null) => {
  if (!value) return "Draft";
  const normalized = value.toLowerCase();
  if (normalized === "ready for action") return "Ready for Action";
  if (normalized === "in progress") return "In Progress";
  if (normalized === "draft") return "Draft";
  return value;
};

export const formatRelativeDate = (value?: string) => {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};