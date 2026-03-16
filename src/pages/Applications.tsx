import { AppShell } from "@/components/app/AppShell";
import { Progress } from "@/components/ui/progress";

const applications = [
  {
    id: "1",
    client: "NeoBank Ltd",
    license: "UK EMI License",
    readiness: 87,
    missingDocs: 1,
    status: "In Progress",
  },
  {
    id: "2",
    client: "PayStream Inc",
    license: "US MSB Registration",
    readiness: 64,
    missingDocs: 3,
    status: "In Progress",
  },
  {
    id: "3",
    client: "CryptoFlex Ltd",
    license: "UK Crypto Registration",
    readiness: 100,
    missingDocs: 0,
    status: "Ready to Submit",
  },
  {
    id: "4",
    client: "FinWave Technologies",
    license: "UK PI License",
    readiness: 32,
    missingDocs: 6,
    status: "Data Collection",
  },
];

const Applications = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track license application progress and submission readiness.
          </p>
        </div>

        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded-sm border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{app.client}</h3>
                  <p className="text-xs text-muted-foreground">{app.license}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    app.readiness === 100
                      ? "bg-success/10 text-success-foreground border border-success/20"
                      : app.readiness >= 60
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-warning/10 text-warning-foreground border border-warning/20"
                  }`}>
                    {app.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={app.readiness} className="flex-1 h-1.5" />
                <span className="font-mono text-sm font-semibold text-foreground">{app.readiness}%</span>
              </div>
              {app.missingDocs > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {app.missingDocs} document{app.missingDocs > 1 ? "s" : ""} missing
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Applications;
