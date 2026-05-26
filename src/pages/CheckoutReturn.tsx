import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { isActive, plan, refetch, loading } = usePlan();
  const [elapsed, setElapsed] = useState(0);

  // Poll the profile every 3s for up to ~2min while waiting on the Stripe webhook.
  useEffect(() => {
    if (isActive) return;
    const interval = setInterval(() => {
      void refetch();
      setElapsed((e) => e + 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, refetch]);

  const stillWaiting = !isActive;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <Card className="border-border max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            {stillWaiting ? (
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">
            {stillWaiting ? "Confirming your payment…" : "Payment confirmed"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {stillWaiting
              ? "We're waiting for Stripe to confirm your subscription. This usually takes a few seconds. Your account will activate automatically as soon as payment is verified."
              : `Your ${plan} plan is now active. Welcome to Licensify AI.`}
          </p>
          {sessionId && (
            <p className="mt-4 text-xs text-muted-foreground break-all">
              Reference: {sessionId}
            </p>
          )}
          {stillWaiting && elapsed >= 60 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Still waiting? You can safely close this tab — your account will activate the moment Stripe confirms the payment.
            </p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild disabled={stillWaiting || loading}>
              {stillWaiting ? (
                <span aria-disabled="true" className="opacity-60 cursor-not-allowed">Go to dashboard</span>
              ) : (
                <Link to="/dashboard">Go to dashboard</Link>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link to="/upgrade">Back to plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
