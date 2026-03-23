export const CASE_TYPES = [
  { value: "licensing", label: "Licensing", description: "Regulatory licensing and compliance matters." },
  { value: "contract_dispute", label: "Contract dispute", description: "Breach, termination, payment, or enforcement issues." },
  { value: "corporate", label: "Corporate / company setup", description: "Incorporation, structuring, and governance work." },
  { value: "employment", label: "Employment", description: "Workplace disputes, contracts, and HR matters." },
  { value: "intellectual_property", label: "Intellectual property", description: "Trade marks, copyright, IP protection, and disputes." },
  { value: "general_legal", label: "General legal", description: "General advisory and mixed legal matters." },
] as const;

export type CaseTypeValue = (typeof CASE_TYPES)[number]["value"];

export interface CaseRecommendation {
  title: string;
  why?: string;
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

export const formatRelativeDate = (value?: string) => {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};