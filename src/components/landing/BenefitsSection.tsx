import { Clock, TrendingUp, Shield, Globe } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save 80%+ Time on Applications",
    description:
      "What used to take weeks of manual document drafting now takes hours. AI generates first drafts of all compliance documents automatically.",
  },
  {
    icon: TrendingUp,
    title: "Handle More Clients",
    description:
      "With automated document generation and structured workflows, your team can manage multiple licensing projects simultaneously.",
  },
  {
    icon: Shield,
    title: "Reduce Compliance Risk",
    description:
      "AI-generated documents follow current regulatory guidelines. Built-in reference guides ensure nothing is missed in applications.",
  },
  {
    icon: Globe,
    title: "UK & US Licensing Support",
    description:
      "Access regulatory requirements for FCA-regulated licenses in the UK and FinCEN/state-level registrations in the US — all in one platform.",
  },
];

export const BenefitsSection = () => {
  return (
    <section className="border-t border-border bg-gradient-to-b from-primary/[0.03] to-background">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Why Licensify AI</span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Built for Law Firms & Regulatory Consultants
          </h2>
          <p className="mt-4 text-muted-foreground">
            Reduce the time and effort required to prepare fintech licensing applications.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-5 rounded-xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/15 transition-all duration-300"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <benefit.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
