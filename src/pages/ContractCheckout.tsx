import { useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";

const PLANS = {
  contract_30_monthly: {
    name: "Contract Service",
    description: "Up to 30 contracts per month, fully managed.",
    price: "£2,000",
    period: "/month",
  },
  contract_unlimited_monthly: {
    name: "Contract Service — Unlimited",
    description: "Unlimited contracts per month, fully managed.",
    price: "£4,000",
    period: "/month",
  },
} as const;

type PlanId = keyof typeof PLANS;

export default function ContractCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planId = (params.get("plan") as PlanId) || "contract_30_monthly";
  const plan = PLANS[planId] ?? PLANS.contract_30_monthly;

  const [step, setStep] = useState<"details" | "pay">("details");
  const [form, setForm] = useState({ name: "", email: "", company: "", notes: "" });

  const fetchClientSecret = useMemo(() => {
    return async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: planId,
          customerEmail: form.email,
          customerName: form.name,
          companyName: form.company,
          notes: form.notes,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.clientSecret) {
        throw new Error(error?.message || "Failed to create checkout session");
      }
      return data.clientSecret as string;
    };
  }, [planId, form.email, form.name, form.company, form.notes]);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setStep("pay");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Checkout</span>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="border-border sticky top-6">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> AI-assisted contract drafting</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Review & risk detection</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Export to Word & PDF</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" /> Priority turnaround</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
                Billed monthly. Cancel anytime. VAT not included.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 order-1 lg:order-2">
          {step === "details" ? (
            <Card className="border-border">
              <CardContent className="p-6 md:p-8">
                <h1 className="font-display text-2xl font-bold">Your details</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll use these to set up your account and contact you about your contracts.
                </p>
                <form onSubmit={handleProceed} className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="name">Full name *</Label>
                    <Input id="name" required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1.5" placeholder="Jane Smith" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1.5" placeholder="jane@firm.com" />
                  </div>
                  <div>
                    <Label htmlFor="company">Firm / company</Label>
                    <Input id="company" value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="mt-1.5" placeholder="Smith & Co Solicitors" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Anything we should know?</Label>
                    <Textarea id="notes" value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="mt-1.5" rows={3}
                      placeholder="Volume, contract types, jurisdictions…" />
                  </div>
                  <Button type="submit" size="lg" className="w-full mt-2">
                    Continue to payment
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Secure payment by Stripe. You'll be charged {plan.price}{plan.period}.
                  </p>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="font-display text-2xl font-bold">Payment</h1>
                  <button onClick={() => setStep("details")} className="text-sm text-muted-foreground hover:text-foreground">
                    ← Edit details
                  </button>
                </div>
                <div id="checkout">
                  <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
