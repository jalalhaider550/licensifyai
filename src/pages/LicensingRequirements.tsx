import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Scale, ChevronDown, ChevronRight, Shield, CreditCard, Coins, BookOpen, Globe, Building2, Landmark } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RequirementSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  requirements: string[];
  documents: string[];
  policies: string[];
  keyPoints: string[];
}

const ukSections: RequirementSection[] = [
  {
    id: "pi",
    title: "Payment Institution (PI) License",
    icon: CreditCard,
    description: "Authorised by the FCA under the Payment Services Regulations 2017 (PSRs). Allows firms to provide payment services such as money remittance, payment execution, and payment initiation.",
    requirements: [
      "Minimum initial capital of £125,000 (or £20,000 for small PI)",
      "Fit and proper directors and beneficial owners",
      "Robust governance arrangements and internal controls",
      "Safeguarding arrangements for client funds",
      "Business continuity plan",
      "Anti-money laundering (AML) and counter-terrorist financing (CTF) systems",
      "Outsourcing policy where applicable",
      "IT security and operational resilience measures",
    ],
    documents: [
      "Application form (FCA Connect)",
      "Programme of operations / Business plan",
      "Organisational structure chart",
      "Proof of initial capital",
      "Directors' CVs and DBS checks",
      "Shareholder controller declarations",
      "Financial projections (3 years)",
      "Safeguarding arrangements documentation",
    ],
    policies: [
      "AML/CTF Policy and Procedures",
      "Compliance Monitoring Programme",
      "Risk Management Framework",
      "Complaints Handling Policy",
      "Data Protection / GDPR Policy",
      "Outsourcing Policy",
      "Business Continuity Plan",
      "IT Security Policy",
    ],
    keyPoints: [
      "Application timeline: typically 3–12 months",
      "FCA application fee: £1,500 (full PI) / £500 (small PI)",
      "Annual regulatory fees apply post-authorisation",
      "Appointed FCA-approved persons required (SMF roles)",
      "Ongoing reporting obligations including REP-CASS returns",
    ],
  },
  {
    id: "emi",
    title: "Electronic Money Institution (EMI) License",
    icon: Coins,
    description: "Authorised by the FCA under the Electronic Money Regulations 2011 (EMRs). Allows issuance of electronic money and provision of related payment services.",
    requirements: [
      "Minimum initial capital of £350,000",
      "Fit and proper directors and beneficial owners",
      "Sound and prudent management arrangements",
      "Safeguarding of funds equal to outstanding e-money",
      "Adequate internal control mechanisms",
      "Business continuity arrangements",
      "AML/CTF compliance programme",
      "Capital adequacy on an ongoing basis (2% of average outstanding e-money)",
    ],
    documents: [
      "Application form (FCA Connect)",
      "Programme of operations / Business plan",
      "Structural organisation chart",
      "Proof of initial capital (£350,000)",
      "Directors' CVs, fitness and propriety assessments",
      "Shareholder controller applications",
      "Detailed financial projections (3 years)",
      "Safeguarding methodology documentation",
      "IT infrastructure and security documentation",
    ],
    policies: [
      "AML/CTF Policy and Procedures",
      "Safeguarding Policy",
      "Compliance Monitoring Programme",
      "Operational Risk Management Framework",
      "Complaints Handling Policy",
      "Data Protection / GDPR Policy",
      "Outsourcing Policy",
      "Wind-down Plan",
    ],
    keyPoints: [
      "Application timeline: typically 6–12 months",
      "FCA application fee: £5,000",
      "Small EMI route available (average outstanding e-money <£5m)",
      "Ongoing capital requirements linked to outstanding e-money",
      "Must appoint Money Laundering Reporting Officer (MLRO)",
    ],
  },
  {
    id: "crypto",
    title: "Crypto Asset Registration",
    icon: Shield,
    description: "Registration with the FCA under the Money Laundering Regulations 2017 (as amended). Required for UK crypto asset businesses carrying on certain activities.",
    requirements: [
      "Registration under MLRs for AML/CTF purposes",
      "Fit and proper assessment for officers and beneficial owners",
      "Adequate AML/CTF systems and controls",
      "Risk assessment specific to crypto assets",
      "Customer due diligence (CDD) procedures for crypto activities",
      "Transaction monitoring for suspicious activity",
      "Staff training on crypto-specific risks",
      "Record-keeping obligations",
    ],
    documents: [
      "Application form via FCA Connect",
      "Business plan specific to crypto activities",
      "Description of crypto asset activities",
      "Organisational structure chart",
      "Directors' and beneficial owners' information",
      "AML/CTF risk assessment",
      "Policies and procedures manual",
      "Financial crime reporting procedures",
    ],
    policies: [
      "AML/CTF Policy (crypto-specific)",
      "Risk Assessment Framework (including crypto risks)",
      "Customer Due Diligence Policy",
      "Sanctions Screening Policy",
      "Suspicious Activity Reporting Procedures",
      "Travel Rule Compliance Policy",
      "Staff Training Programme",
      "Record Keeping Policy",
    ],
    keyPoints: [
      "Application timeline: typically 6–12 months",
      "FCA registration fee: £2,000",
      "Temporary registration regime has ended",
      "Marketing restrictions apply under Financial Promotions regime",
      "Ongoing compliance with Travel Rule requirements",
      "Must not operate in UK without FCA registration",
    ],
  },
];

const usSections: RequirementSection[] = [
  {
    id: "msb",
    title: "Money Services Business (MSB) Registration",
    icon: Landmark,
    description: "Federal registration with FinCEN (Financial Crimes Enforcement Network) under the Bank Secrecy Act. Required for businesses providing money transmission, currency exchange, check cashing, and other money services.",
    requirements: [
      "Federal registration with FinCEN within 180 days of commencing business",
      "Designation of a compliance officer",
      "AML/BSA compliance programme",
      "Customer identification programme (CIP)",
      "Suspicious Activity Reporting (SAR) procedures",
      "Currency Transaction Reporting (CTR) for transactions over $10,000",
      "Recordkeeping requirements under 31 CFR Part 1010",
      "Renewal of registration every 2 years",
    ],
    documents: [
      "FinCEN Form 107 (MSB Registration)",
      "Business plan and description of services",
      "Organizational chart",
      "Compliance officer designation letter",
      "AML/BSA programme documentation",
      "State license copies (if applicable)",
      "Articles of incorporation / formation documents",
      "Beneficial ownership information",
    ],
    policies: [
      "AML/BSA Compliance Programme",
      "Customer Identification Programme (CIP)",
      "Suspicious Activity Reporting Procedures",
      "Currency Transaction Reporting Procedures",
      "OFAC Sanctions Screening Policy",
      "Record Retention Policy (5 years minimum)",
      "Employee Training Programme",
      "Independent Testing / Audit Programme",
    ],
    keyPoints: [
      "FinCEN registration is free — no federal registration fee",
      "Registration must be renewed every 2 years",
      "FinCEN registration does NOT replace state licensing requirements",
      "Failure to register is a federal crime under 18 U.S.C. § 1960",
      "Must file SARs for suspicious transactions over $2,000",
      "CTR filing required for cash transactions over $10,000",
    ],
  },
  {
    id: "mtl",
    title: "State Money Transmitter License",
    icon: Building2,
    description: "State-level licensing required in most US states for businesses engaged in money transmission. Each state has its own licensing authority and requirements, though NMLS (Nationwide Multistate Licensing System) provides a unified application process.",
    requirements: [
      "NMLS application via the Nationwide Multistate Licensing System",
      "Minimum net worth: typically $100,000–$500,000 (varies by state)",
      "Surety bond: typically $25,000–$2,000,000 (varies by state and volume)",
      "Background checks for all control persons (FBI fingerprint checks)",
      "Audited financial statements",
      "Permissible investments for customer funds",
      "State-specific compliance requirements",
      "Annual renewal and reporting obligations",
    ],
    documents: [
      "NMLS Company Form (MU1)",
      "Individual Form (MU2) for each control person",
      "Audited financial statements (last 2 years)",
      "Business plan with detailed financial projections",
      "Surety bond from approved provider",
      "Background check authorization forms",
      "Anti-money laundering programme",
      "Sample customer agreements and disclosures",
    ],
    policies: [
      "AML/BSA Compliance Programme",
      "Information Security Programme",
      "Consumer Complaint Resolution Policy",
      "Business Continuity / Disaster Recovery Plan",
      "Privacy Policy (state-specific requirements)",
      "Permissible Investments Policy",
      "Agent / Third-Party Oversight Policy",
      "Transaction Monitoring Programme",
    ],
    keyPoints: [
      "Must apply in each state where you operate (up to 49+ jurisdictions)",
      "Application fees range from $500–$5,000 per state",
      "Processing times: 3–12 months per state",
      "Surety bond amounts can exceed $1,000,000 in high-volume states (e.g., New York, California)",
      "New York requires a separate BitLicense for crypto activities ($5,000 fee)",
      "Many states require quarterly/annual reporting and audits",
    ],
  },
  {
    id: "us-crypto",
    title: "Crypto Asset Registration & Compliance",
    icon: Shield,
    description: "Crypto businesses in the US must comply with federal and state regulations. FinCEN considers most crypto exchanges and wallet providers as MSBs. Additional state-level requirements may apply, including New York's BitLicense.",
    requirements: [
      "FinCEN MSB registration for crypto exchanges and wallet providers",
      "State money transmitter licenses in applicable states",
      "New York BitLicense (for businesses serving NY customers)",
      "AML/BSA programme specific to virtual currency activities",
      "Travel Rule compliance for transfers over $3,000",
      "OFAC sanctions screening for all transactions",
      "Customer identification and verification (KYC)",
      "SEC/CFTC considerations for tokens classified as securities or commodities",
    ],
    documents: [
      "FinCEN MSB registration (Form 107)",
      "State license applications via NMLS",
      "BitLicense application (if serving New York)",
      "Virtual currency-specific AML programme",
      "Cybersecurity programme documentation",
      "Third-party audit reports",
      "Customer-facing disclosures and risk warnings",
      "Technology infrastructure and security documentation",
    ],
    policies: [
      "Virtual Currency AML/BSA Programme",
      "Cybersecurity Policy (NYDFS 23 NYCRR 500 if applicable)",
      "Customer Due Diligence / KYC Policy",
      "Transaction Monitoring Programme",
      "Travel Rule Compliance Procedures",
      "OFAC Sanctions Compliance Policy",
      "Incident Response Plan",
      "Consumer Protection and Disclosure Policy",
    ],
    keyPoints: [
      "FinCEN registration is mandatory — free of charge",
      "State MTL required in most states for crypto transmission",
      "New York BitLicense application fee: $5,000",
      "Cybersecurity requirements under NYDFS 23 NYCRR 500",
      "SEC enforcement actions possible if tokens classified as securities",
      "Travel Rule applies to crypto transfers ≥$3,000",
    ],
  },
];

const SectionCard = ({ section, isExpanded, onToggle }: { section: RequirementSection; isExpanded: boolean; onToggle: () => void }) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <section.icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{section.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{section.description}</p>
        </div>
      </div>
      {isExpanded ? (
        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
      ) : (
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
    </button>

    {isExpanded && (
      <div className="border-t border-border p-5 space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Key Requirements
          </h4>
          <ul className="space-y-2">
            {section.requirements.map((req, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Required Documents
          </h4>
          <ul className="space-y-2">
            {section.documents.map((doc, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                {doc}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Required Policies
          </h4>
          <ul className="space-y-2">
            {section.policies.map((pol, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                {pol}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Key Points</h4>
          <ul className="space-y-1.5">
            {section.keyPoints.map((point, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="mt-1 h-1 w-1 rounded-full bg-warning shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
  </div>
);

const LicensingRequirements = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>("pi");

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Licensing Requirements</h1>
              <p className="text-sm text-muted-foreground">
                Regulatory reference guide for fintech licensing across jurisdictions
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">About This Section</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This section provides a comprehensive reference for fintech regulatory requirements across multiple jurisdictions.
            Use it to quickly review documentation, policies, financial requirements, and capital thresholds for each license type.
            All financial figures are shown in the local currency for the relevant jurisdiction.
          </p>
        </div>

        <Tabs defaultValue="uk" className="w-full">
          <TabsList className="mb-6 w-full max-w-sm">
            <TabsTrigger value="uk" className="flex-1 gap-2">
              🇬🇧 United Kingdom
            </TabsTrigger>
            <TabsTrigger value="us" className="flex-1 gap-2">
              🇺🇸 United States
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uk">
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
                <p className="text-sm text-foreground font-medium">Financial Conduct Authority (FCA)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All financial requirements displayed in British Pounds (£). Regulated under PSRs 2017, EMRs 2011, and MLRs 2017.
                </p>
              </div>
              {ukSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  isExpanded={expandedSection === section.id}
                  onToggle={() => toggleSection(section.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="us">
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
                <p className="text-sm text-foreground font-medium">FinCEN & State Regulators</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All financial requirements displayed in US Dollars ($). Federal registration with FinCEN plus state-level licensing via NMLS.
                </p>
              </div>
              {usSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  isExpanded={expandedSection === section.id}
                  onToggle={() => toggleSection(section.id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default LicensingRequirements;
