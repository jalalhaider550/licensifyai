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
    title: "Client Onboarding",
    description:
      "Create client profiles, capture company data, ownership structures, and director information in a structured workspace.",
  },
  {
    icon: Upload,
    title: "Document Ingestion",
    description:
      "Upload certificates of incorporation, business plans, and corporate filings. Drag-and-drop batch upload supported.",
  },
  {
    icon: FileSearch,
    title: "AI Data Extraction",
    description:
      "Automatically extract entity names, registration numbers, directors, and shareholders from uploaded documents.",
  },
  {
    icon: FilePlus,
    title: "Document Generation",
    description:
      "Generate first drafts of AML policies, compliance manuals, risk frameworks, and governance documentation.",
  },
  {
    icon: PackageCheck,
    title: "Application Packaging",
    description:
      "Assemble submission-ready license application packages indexed by regulatory requirement. Export as PDF or Word.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Tracking",
    description:
      "Track application readiness with a percentage score. See missing documents and incomplete fields at a glance.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="border-t border-border bg-muted/50">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Built for Regulatory Work
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every feature designed around the workflow of fintech licensing applications.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group border border-border rounded-sm bg-card p-6 transition-colors hover:border-primary/30"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
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
