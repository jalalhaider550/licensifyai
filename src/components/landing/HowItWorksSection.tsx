import { Upload, Brain, FileCheck, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Documents",
    description:
      "Upload business documents, contracts, or case files. Accepted formats include PDF, Word, and text files.",
  },
  {
    number: "02",
    icon: Brain,
    title: "AI Extracts & Analyzes",
    description:
      "AI reads your documents, extracts key data — parties, obligations, risks, compliance details — and builds a structured case profile.",
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Generate Documents & Actions",
    description:
      "Generate contracts, compliance documents, reports, and action plans tailored to your case data and workflow requirements.",
  },
  {
    number: "04",
    icon: Send,
    title: "Review, Edit & Export",
    description:
      "Review generated outputs in the built-in editor, make corrections, and export as Word or PDF for submission.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Simple Workflow</span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            From Document Upload to Submission-Ready Output
          </h2>
          <p className="mt-4 text-muted-foreground">
            Four steps to automate your licensing and case workflows.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative group">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary group-hover:from-primary/20 group-hover:to-primary/10 transition-colors mb-5">
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs font-semibold text-primary/60 mb-2">
                  Step {step.number}
                </span>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
