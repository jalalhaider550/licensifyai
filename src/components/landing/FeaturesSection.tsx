import {
  Brain,
  FileText,
  Scale,
  Shield,
  Workflow,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Legal Execution Engine",
    description:
      "Transform any legal query into structured analysis, strategy, step-by-step action plans, and ready-to-use documents — not just advice.",
  },
  {
    icon: FileText,
    title: "AI Document Generator",
    description:
      "Generate legal notices, contracts, NDAs, demand letters, court pleadings, and compliance documents — formal, jurisdiction-aware, and ready to use.",
  },
  {
    icon: Workflow,
    title: "Case Workflow Automation",
    description:
      "Manage all case types — licensing, disputes, corporate, employment, IP — with AI-driven next steps, action tracking, and deadline management.",
  },
  {
    icon: Scale,
    title: "Strategy & Analysis Mode",
    description:
      "Compare multiple legal paths, assess risks with probability scoring, and get recommended strategies backed by statute and case law references.",
  },
  {
    icon: Shield,
    title: "Legal Research Layer",
    description:
      "Automatic citation of relevant statutes, regulations, and case laws. IRAC-structured reasoning grounded in objective legal authority.",
  },
  {
    icon: Zap,
    title: "Dynamic Follow-Up Engine",
    description:
      "After every output: next steps, missing info detection, document generation prompts. The system never stops at advice — it drives execution.",
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
