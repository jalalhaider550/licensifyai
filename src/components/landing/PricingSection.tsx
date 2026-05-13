import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const platformPlans = [
  {
    name: "Starter",
    price: "Customised",
    period: "",
    description: "For solo practitioners and small teams getting started.",
    features: [
      "Up to 5 active clients",
      "Document upload & AI extraction",
      "AML policy generation",
      "UK & US regulatory reference",
      "Email support",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Professional",
    price: "Customised",
    period: "",
    description: "For growing teams handling multiple cases and applications.",
    features: [
      "Up to 25 active clients",
      "All compliance document types",
      "Business plan generation from uploads",
      "Application packaging & export",
      "Workflow tracking dashboard",
      "Priority support",
    ],
    cta: "Get Started",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations and multi-jurisdiction operations.",
    features: [
      "Unlimited clients",
      "Custom document templates",
      "Role-based access control",
      "API access",
      "Dedicated account manager",
      "SSO & audit logging",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

const contractPlans = [
  {
    name: "Contract Service",
    price: "Customised",
    period: "",
    description: "Up to 30 contracts per month, fully managed.",
    features: [
      "Up to 30 contracts/month",
      "AI-assisted contract drafting",
      "Review & risk detection",
      "Export to Word & PDF",
      "Priority turnaround",
      "Email support",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Contract Service — Unlimited",
    price: "Customised",
    period: "",
    description: "Unlimited contracts per month, fully managed.",
    features: [
      "Unlimited contracts/month",
      "AI-assisted contract drafting",
      "Review & risk detection",
      "Export to Word & PDF",
      "Dedicated account manager",
      "SSO & audit logging",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

function PlanCard({ plan }: { plan: typeof platformPlans[0] }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-7 transition-all duration-300 hover:shadow-lg ${
        plan.featured
          ? "border-primary bg-card shadow-md shadow-primary/10 scale-[1.02]"
          : "border-border bg-card hover:border-primary/20"
      }`}
    >
      {plan.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
          <Star className="h-3 w-3" />
          Most Popular
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
        <span className="text-sm text-muted-foreground">{plan.period}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

      <ul className="mt-7 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        variant={plan.featured ? "default" : "outline"}
        className={`mt-7 w-full rounded-xl py-5 ${plan.featured ? "shadow-md shadow-primary/20" : ""}`}
        asChild
      >
        <Link to="/signup">{plan.cta}</Link>
      </Button>
    </div>
  );
}

export const PricingSection = () => {
  return (
    <section id="pricing" className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tailored plans for solo practitioners, growing teams, and enterprises.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {platformPlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="font-display text-xl font-semibold text-foreground">Contract Service</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Managed contract drafting and review, priced for volume.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {contractPlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};
