import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileCheck, Scale } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative pt-14">
      <div className="container mx-auto px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground animate-fade-in">
            <Scale className="h-3 w-3" />
            UK &amp; US Fintech Licensing Automation
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl animate-fade-in-up">
            Automate Fintech Licensing with Regulatory Precision
          </h1>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            Onboard clients, extract entity data from documents, and generate
            submission-ready application packages for the FCA and FinCEN — in a
            fraction of the time.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/login">Log In to Dashboard</Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            {[
              { value: "87%", label: "Average time saved per application" },
              { value: "12+", label: "License types supported" },
              { value: "100%", label: "Regulatory compliance coverage" },
            ].map((stat) => (
              <div key={stat.label} className="border border-border rounded-sm bg-card p-5">
                <div className="font-mono text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
