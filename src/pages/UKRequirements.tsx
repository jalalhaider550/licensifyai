import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Scale, ChevronDown, ChevronRight, Download, FileText, Shield, CreditCard, Coins, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const sections: RequirementSection[] = [
  {
    id: "pi",
    title: "Payment Institution (PI) License",
    icon: CreditCard,
    description: "Authorised by the FCA under the Payment Services Regulations 2017 (PSRs). Allows firms to provide payment services such as money remittance, payment execution, and payment initiation.",
    requirements: [
      "Minimum initial capital of €125,000 (or €20,000 for small PI)",
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
      "Minimum initial capital of €350,000",
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
      "Proof of initial capital (€350,000)",
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
      "Small EMI route available (average outstanding e-money <€5m)",
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
      "Application timeline: typically 6–12 months (FCA has significant backlog)",
      "FCA registration fee: £2,000",
      "Temporary registration regime has ended",
      "Marketing restrictions apply under Financial Promotions regime",
      "Ongoing compliance with Travel Rule requirements",
      "Must not operate in UK without FCA registration",
    ],
  },
];

const UKRequirements = () => {
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
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">UK Licensing Requirements</h1>
              <p className="text-sm text-muted-foreground">
                Regulatory reference guide for UK fintech licensing
              </p>
            </div>
          </div>
        </div>

        {/* Overview card */}
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">About This Section</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This section provides a comprehensive reference for UK fintech regulatory requirements. Use it to quickly
            review the documentation, policies, and capital requirements needed for each license type while preparing
            client applications. All information is based on current FCA guidance and the relevant UK regulations.
          </p>
        </div>

        {/* Requirement sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            return (
              <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
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
                        <FileText className="h-4 w-4 text-primary" />
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
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default UKRequirements;
