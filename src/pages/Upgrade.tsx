import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, Building2, Star } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useAuth } from "@/hooks/useAuth";

const STARTER_FEATURES = [
  "15 AI contracts per month",
  "Full country & jurisdiction coverage",
  "20–30 page court-ready output",
  "Export to Word & PDF",
];
const PRO_FEATURES = [
  "30 AI contracts per month",
  "Full country & jurisdiction coverage",
  "20–30 page court-ready output",
  "Top-up: 10 extra for £20",
  "Priority support",
];
const FIRM_FEATURES = [
  "Unlimited contracts",
  "Full platform access",
  "Multi-seat workspace",
  "Dedicated onboarding",
];

export default function Upgrade() {
  const { plan, status } = usePlan();
  const { user } = useAuth();
  const { openCheckout, checkoutElement, isOpen } = useStripeCheckout();

  const subscribe = (priceId: "starter_monthly" | "professional_monthly") => {
    openCheckout({
      priceId,
      customerEmail: user?.email,
      userId: user?.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {plan === "pending"
              ? "Payment required to activate your account"
              : `Current plan: ${plan}${status ? ` (${status})` : ""}`}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Choose your Licensify AI plan
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            All plans include the full country and jurisdiction contract engine. Pay monthly, cancel any time.
          </p>
        </div>

        {isOpen ? (
          <div className="rounded-xl border border-border bg-card p-4">{checkoutElement}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-border">
              <CardContent className="p-6 flex flex-col h-full">
                <h3 className="font-display font-semibold">Starter</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">£25</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" variant="outline" onClick={() => subscribe("starter_monthly")}>
                  Subscribe
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg inline-flex items-center gap-1">
                <Star className="h-3 w-3" /> Popular
              </div>
              <CardContent className="p-6 flex flex-col h-full">
                <h3 className="font-display font-semibold">Professional</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">£50</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" onClick={() => subscribe("professional_monthly")}>
                  Subscribe
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6 flex flex-col h-full">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Law Firm
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">Custom</span>
                </div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {FIRM_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <a href="mailto:licensifyai@gmail.com?subject=Law%20Firm%20plan%20enquiry">
                    Contact Us
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
