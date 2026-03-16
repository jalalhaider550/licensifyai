import { Upload, Brain, FileCheck, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Business Documents",
    description:
      "Upload a business model document, pitch deck, or company description. Accepted formats include PDF, Word, and text files.",
  },
  {
    number: "02",
    icon: Brain,
    title: "AI Reads & Extracts Data",
    description:
      "The AI automatically reads the document, extracts services offered, revenue model, target customers, technology, and compliance considerations.",
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Generate Compliance Documents",
    description:
      "Generate detailed business plans, AML policies, compliance manuals, and risk frameworks tailored to your client's data.",
  },
  {
    number: "04",
    icon: Send,
    title: "Review, Edit & Export",
    description:
      "Review generated documents in the built-in editor, make corrections, and export as Word or PDF for regulatory submission.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Simple Workflow</span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            From Document Upload to Regulatory Submission
          </h2>
          <p className="mt-4 text-muted-foreground">
            Four steps to prepare a complete licensing application package.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-px bg-gradient-to-r from-primary/30 to-primary/10" />
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary mb-5 group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
                <step.icon className="h-7 w-7" />
              </div>
              <div className="font-mono text-xs font-bold text-primary/50 mb-2">STEP {step.number}</div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
