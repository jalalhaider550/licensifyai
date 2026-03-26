import {
  Upload,
  FileSearch,
  FilePlus,
  PackageCheck,
  Users,
  Workflow,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Onboarding Automation",
    description:
      "Streamline client intake with structured profiles, company data, directors, shareholders, and ownership details in one workspace.",
  },
  {
    icon: FilePlus,
    title: "AI Document Generation",
    description:
      "Generate contracts, reports, compliance documents, filings, and business plans powered by AI — ready for review and submission.",
  },
  {
    icon: Workflow,
    title: "Case Workflow Management",
    description:
      "Manage all case types — licensing, disputes, corporate, employment, IP — with AI-driven next steps and action tracking.",
  },
  {
    icon: PackageCheck,
    title: "Licensing Automation",
    description:
      "Track application readiness, identify missing documents, and assemble submission-ready packages for regulators across jurisdictions.",
  },
  {
    icon: FileSearch,
    title: "Client Data Extraction & Validation",
    description:
      "AI reads uploaded documents and automatically extracts key data — services, revenue models, compliance details — and validates completeness.",
  },
  {
    icon: Upload,
    title: "Document Upload & Processing",
    description:
      "Upload business plans, contracts, and filings. Drag-and-drop with support for PDF, Word, and text files with automatic parsing.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Platform Capabilities</span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Everything You Need for Licensing & Case Workflows
          </h2>
          <p className="mt-4 text-muted-foreground">
            Purpose-built tools for firms managing licensing applications and complex case workflows across industries.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
