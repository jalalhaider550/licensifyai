import { AppShell } from "@/components/app/AppShell";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

const licenseTypes = [
  { id: "1", name: "UK Electronic Money Institution (EMI)", authority: "FCA", clients: 3, status: "active" },
  { id: "2", name: "UK Payment Institution (PI)", authority: "FCA", clients: 2, status: "active" },
  { id: "3", name: "US Money Services Business (MSB)", authority: "FinCEN", clients: 2, status: "active" },
  { id: "4", name: "UK Crypto Asset Registration", authority: "FCA", clients: 1, status: "active" },
];

const Licenses = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Licenses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fintech license types and active applications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {licenseTypes.map((lic) => (
            <div key={lic.id} className="rounded-sm border border-border bg-card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{lic.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{lic.authority}</p>
                  </div>
                </div>
                <span className="font-mono text-sm text-muted-foreground">{lic.clients} clients</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Licenses;
