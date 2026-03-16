import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { FileCheck, FilePlus, Download } from "lucide-react";

const documentTypes = [
  { id: "aml", name: "AML Policy", description: "Anti-Money Laundering policy document tailored to your client's business model." },
  { id: "compliance", name: "Compliance Manual", description: "Comprehensive compliance procedures and controls framework." },
  { id: "risk", name: "Risk Management Framework", description: "Risk assessment and mitigation strategies for regulatory requirements." },
  { id: "business-plan", name: "Business Plan", description: "Regulatory-focused business plan for license applications." },
  { id: "governance", name: "Governance Documentation", description: "Corporate governance structure and key personnel documentation." },
];

const ComplianceDocuments = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Compliance Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate and manage regulatory compliance documents for your clients.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documentTypes.map((docType) => (
            <div
              key={docType.id}
              className="rounded-sm border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold text-foreground">{docType.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{docType.description}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="text-xs">
                  <FilePlus className="mr-1 h-3 w-3" />
                  Generate
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select a client and document type above to generate a first draft using your client's profile data. 
            The AI will populate the document with relevant company information, directors, shareholders, and 
            regulatory details. You can then review, edit, and approve the document before exporting it as PDF or Word.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default ComplianceDocuments;
