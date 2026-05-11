import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative pt-14 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10 pointer-events-none" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative mx-auto px-6 py-24 md:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            The Operating System for Legal Work
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl xl:text-7xl animate-fade-in-up">
            Licensify AI —{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              The Operating System for Legal Work
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            From legal questions to execution. Strategy, documents, and next steps — in minutes. AI-powered legal analysis, document generation, and case workflow automation for law firms and in-house teams.
          </p>

          <p className="mt-3 text-sm text-muted-foreground/80 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            AI legal assistant for law firms and in-house teams in the UK and US. Structured analysis, actionable strategy, and submission-ready documents.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            {[
              "Legal execution engine",
              "Strategy & document generation",
              "Step-by-step action plans",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <Button size="lg" className="text-base px-8 py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" asChild>
              <Link to="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-xl" asChild>
              <Link to="/login">Log In to Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 mx-auto max-w-3xl grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          {[
            { value: "87%", label: "Time saved per workflow" },
            { value: "12+", label: "Case & license types supported" },
            { value: "100%", label: "Submission-ready outputs" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 text-center hover:shadow-md transition-shadow">
              <div className="font-mono text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
