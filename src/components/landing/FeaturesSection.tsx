import {
  Upload,
  FileSearch,
  FilePlus,
  PackageCheck,
  Users,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Management",
    description:
      "Create structured client profiles with company data, directors, shareholders, and ownership details in one workspace.",
  },
  {
    icon: Upload,
    title: "Document Upload",
    description:
      "Upload business plans, pitch decks, and corporate filings. Drag-and-drop with support for PDF, Word, and text files.",
  },
  {
    icon: FileSearch,
    title: "AI Data Extraction",
    description:
      "AI reads your uploaded documents and automatically extracts services, revenue models, target customers, and compliance details.",
  },
  {
    icon: FilePlus,
    title: "Document Generation",
    description:
      "Generate AML policies, compliance manuals, risk frameworks, business plans, and governance documents powered by AI.",
  },
  {
    icon: PackageCheck,
    title: "Licensing Workflow",
    description:
      "Track application readiness, see missing documents, and assemble submission-ready packages for UK and US regulators.",
  },
  {
    icon: ShieldCheck,
    title: "Regulatory Reference",
    description:
      "Access UK FCA and US FinCEN licensing requirements, capital thresholds, and compliance obligations directly in the platform.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Platform Capabilities</span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Everything You Need for Fintech Licensing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Purpose-built tools for law firms preparing regulatory applications.
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
