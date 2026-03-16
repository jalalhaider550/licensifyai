const steps = [
  {
    number: "01",
    title: "Onboard Your Client",
    description:
      "Create a new client workspace. Enter company details, jurisdiction, directors, and shareholders.",
  },
  {
    number: "02",
    title: "Upload Documents",
    description:
      "Upload corporate documents — certificates, filings, business plans. AI extracts structured data automatically.",
  },
  {
    number: "03",
    title: "Generate Compliance Documents",
    description:
      "The platform drafts AML policies, compliance manuals, and risk frameworks using your client's data.",
  },
  {
    number: "04",
    title: "Package & Submit",
    description:
      "Review generated documents, fill any gaps, and export the complete application package as PDF or Word.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            From Intake to Submission in Four Steps
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="font-mono text-4xl font-bold text-border">{step.number}</div>
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">
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
