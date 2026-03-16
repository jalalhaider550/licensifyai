import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="border-t border-border">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 md:p-16 text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-primary-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              14-Day Free Trial — No Credit Card Required
            </div>

            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
              Start Automating Licensing Applications Today
            </h2>
            <p className="mt-4 text-base text-primary-foreground/80 max-w-xl mx-auto">
              Join law firms and regulatory consultants who are saving hundreds of hours on fintech license preparation.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-base px-8 py-6 rounded-xl shadow-lg" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-base px-8 py-6 rounded-xl text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" asChild>
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
