import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { Link } from "react-router-dom";

const PRO_FEATURES = [
  "Full Licensing workspace (UK FCA & US FinCEN)",
  "Conveyancing autonomous workflow",
  "Clients & Firm Workspace",
  "Documents, Project Vault & Workflows",
  "Compliance Documents & Licensing Requirements",
  "Bulk Review & Tasks",
  "Activity logs & shared cases",
];

const FREE_FEATURES = [
  "AI Assistant",
  "Multi-Model Playground",
  "Legal Intelligence (Research)",
  "Legal Cases",
  "Generate Contracts & NDAs",
  "Meeting Recorder",
  "Dashboard, Settings & Help",
];

export default function Upgrade() {
  const { plan } = usePlan();

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {plan === "free_trial" ? "Free plan — 3 months included" : "Pro plan active"}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Unlock the full Licensify AI suite
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Your free 3-month plan includes everything you need to research, draft and
            run client meetings. Upgrade to Pro to unlock licensing, conveyancing,
            firm collaboration and the full document automation suite.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Free — 3 months</h3>
                  <p className="text-xs text-muted-foreground">No card required</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
              Pro
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Pro — Everything</h3>
                  <p className="text-xs text-muted-foreground">Full operating system</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6" asChild>
                <a href="mailto:licensifyai@gmail.com?subject=Upgrade%20to%20Pro">
                  Contact us to upgrade
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
