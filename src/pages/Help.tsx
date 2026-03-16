import { AppShell } from "@/components/app/AppShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, MessageCircle, BookOpen } from "lucide-react";

const guides = [
  {
    id: "add-clients",
    title: "How to Add Clients",
    content:
      "Navigate to the Clients section from the sidebar. Click the 'Add Client' button in the top right corner. Fill in the company name, jurisdiction, and any additional details. The client will appear in your client list immediately. You can then open their profile to add directors, shareholders, and upload documents.",
  },
  {
    id: "upload-documents",
    title: "How to Upload Documents",
    content:
      "Open a client profile and navigate to the Documents tab. Click 'Upload Document' to select files from your computer. Supported formats include PDF, DOCX, and image files. You can upload certificates of incorporation, shareholder registers, passports, corporate filings, and business plans. All documents are securely stored and linked to the client profile.",
  },
  {
    id: "ai-extraction",
    title: "How AI Extracts Information",
    content:
      "When you upload a document, Licensify AI automatically analyses it using advanced AI models. The system extracts structured data including company names, registration numbers, director names, shareholder information, and addresses. Extracted data is displayed for your review and can be used to auto-populate the client profile. You can always manually edit or correct extracted information.",
  },
  {
    id: "licensing-applications",
    title: "How Licensing Applications Are Prepared",
    content:
      "Go to the Licensing Projects section and create a new project for your client. Select the license type (e.g., Payment Institution, EMI, MSB) and jurisdiction. The system will identify required documents and information for that specific license type. A readiness score shows you how complete the application is, and any missing items are highlighted for your attention.",
  },
  {
    id: "compliance-documents",
    title: "How to Generate Compliance Documents",
    content:
      "Navigate to Compliance Documents from the sidebar. Select a client and choose the document type to generate (e.g., AML Policy, Compliance Manual, Risk Management Framework). The system uses your client's profile data to draft the document. You can review, edit, and approve the generated document before exporting it as PDF or Word.",
  },
  {
    id: "workflow-tracking",
    title: "How to Track Progress",
    content:
      "The Dashboard provides an overview of all active projects, pending tasks, and recent activity. Each licensing project has a readiness score and status tracker. The Tasks section shows all pending items across your workspace. Use the Activity feed to see recent changes made by you and your team.",
  },
  {
    id: "export",
    title: "How to Export Documents",
    content:
      "You can export individual documents or complete application packages. Navigate to the document you want to export and click the download button. Application packages can be exported as a compiled PDF or Word document from the Licensing Projects section.",
  },
];

const Help = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Help Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn how to use Licensify AI to streamline your fintech licensing workflow.
          </p>
        </div>

        {/* Quick Start */}
        <div className="rounded-sm border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Getting Started</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Licensify AI helps law firms and regulatory consultants automate fintech license application preparation.
            Start by adding a client, uploading their corporate documents, and letting our AI extract key information.
            Then create a licensing project to track application readiness and generate compliance documents automatically.
          </p>
        </div>

        {/* Guides */}
        <div className="rounded-sm border border-border bg-card p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Platform Guides</h2>
          <Accordion type="single" collapsible className="w-full">
            {guides.map((guide) => (
              <AccordionItem key={guide.id} value={guide.id}>
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {guide.title}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {guide.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Support Contact */}
        <div className="rounded-sm border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Contact Support</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Need help? Our support team is available to assist you with any questions about the platform.
          </p>
          <a
            href="mailto:licensifyai@gmail.com"
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <Mail className="h-4 w-4 text-primary" />
            licensifyai@gmail.com
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            We typically respond within 24 business hours.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Help;
