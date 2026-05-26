import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star, Building2 } from "lucide-react";

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  href: string;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "£25",
    period: "/month",
    description: "For solo solicitors getting started with AI contract drafting.",
    features: [
      "15 AI contracts per month",
      "Full country & jurisdiction coverage",
      "20–30 page court-ready output",
      "Export to Word & PDF",
      "Email support",
    ],
    cta: "Subscribe",
    featured: false,
    href: "/signup?plan=starter",
  },
  {
    name: "Professional",
    price: "£50",
    period: "/month",
    description: "For practitioners producing contracts at higher volume.",
    features: [
      "30 AI contracts per month",
      "Full country & jurisdiction coverage",
      "20–30 page court-ready output",
      "Top-up: 10 extra contracts for £20",
      "Priority email support",
    ],
    cta: "Subscribe",
    featured: true,
    href: "/signup?plan=professional",
  },
  {
    name: "Law Firm",
    price: "Custom",
    period: "",
    description: "For firms with multiple users, custom volumes and bespoke needs.",
    features: [
      "Unlimited contracts",
      "Full platform access",
      "Multi-seat workspace",
      "Dedicated onboarding",
      "Custom SLAs",
    ],
    cta: "Contact Us",
    featured: false,
    href: "mailto:licensifyai@gmail.com?subject=Law%20Firm%20plan%20enquiry",
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  const isExternal = plan.href.startsWith("mailto:");
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
      <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        {plan.name === "Law Firm" && <Building2 className="h-4 w-4 text-primary" />}
        {plan.name}
      </h3>
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
        {isExternal ? <a href={plan.href}>{plan.cta}</a> : <Link to={plan.href}>{plan.cta}</Link>}
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
            Pay as you grow. Top up extra contracts any time for £20 per 10.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};
