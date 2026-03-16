import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "£499",
    period: "/month",
    description: "For solo practitioners and small firms.",
    features: [
      "Up to 5 active clients",
      "Document upload & AI extraction",
      "AML policy generation",
      "Email support",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "£1,299",
    period: "/month",
    description: "For growing practices handling multiple applications.",
    features: [
      "Up to 25 active clients",
      "All compliance document types",
      "Application packaging & export",
      "Workflow tracking dashboard",
      "Priority support",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large firms and multi-jurisdiction operations.",
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

export const PricingSection = () => {
  return (
    <section id="pricing" className="border-t border-border bg-muted/50">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Transparent Pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            14-day free trial on all plans. No credit card required.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-sm border p-6 ${
                plan.featured
                  ? "border-primary bg-card shadow-md"
                  : "border-border bg-card"
              }`}
            >
              {plan.featured && (
                <div className="mb-4 inline-flex self-start rounded-sm bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.featured ? "hero" : "outline"}
                className="mt-6 w-full"
                asChild
              >
                <Link to="/signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
