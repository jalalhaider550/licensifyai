import { useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Building2, Users as UsersIcon, Globe, Phone } from "lucide-react";

const ClientProfile = () => {
  const { id } = useParams();

  // Mock data — will come from database
  const client = {
    name: "NeoBank Ltd",
    jurisdiction: "United Kingdom",
    registrationNumber: "12345678",
    incorporationDate: "2022-03-15",
    registeredAddress: "1 Fintech Lane, London, EC2A 1BB",
    directors: ["Alice Thompson", "James Carter", "Priya Patel"],
    shareholders: [
      { name: "Alice Thompson", percentage: 40 },
      { name: "James Carter", percentage: 35 },
      { name: "Venture Capital Fund II", percentage: 25 },
    ],
    services: ["Payment Processing", "Digital Wallets", "Cross-border Transfers"],
    contactEmail: "legal@neobank.io",
    contactPhone: "+44 20 7946 0123",
    documents: [
      { name: "Certificate of Incorporation", type: "PDF", status: "Verified" },
      { name: "Shareholder Register", type: "PDF", status: "Verified" },
      { name: "Business Plan 2024", type: "DOCX", status: "Pending Review" },
      { name: "AML Policy Draft", type: "PDF", status: "AI Generated" },
    ],
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-3 w-3" />
            Back to Clients
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{client.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground font-mono">{client.jurisdiction} · Reg. {client.registrationNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileText className="mr-1 h-4 w-4" />
                Generate Documents
              </Button>
              <Button size="sm">
                <Upload className="mr-1 h-4 w-4" />
                Upload Files
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Company Details */}
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Company Details</h3>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Incorporation Date</dt>
                <dd className="mt-0.5 font-mono text-foreground">{client.incorporationDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Registered Address</dt>
                <dd className="mt-0.5 text-foreground">{client.registeredAddress}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Services</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {client.services.map((s) => (
                    <span key={s} className="inline-flex rounded-sm border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          {/* Ownership */}
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Ownership Structure</h3>
            </div>
            <div className="space-y-2 mb-4">
              {client.shareholders.map((sh) => (
                <div key={sh.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{sh.name}</span>
                  <span className="font-mono text-muted-foreground">{sh.percentage}%</span>
                </div>
              ))}
            </div>
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 mt-4">Directors</h4>
            <ul className="space-y-1">
              {client.directors.map((d) => (
                <li key={d} className="text-sm text-foreground">{d}</li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Contact Information</h3>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Email</dt>
                <dd className="mt-0.5 text-foreground">{client.contactEmail}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Phone</dt>
                <dd className="mt-0.5 font-mono text-foreground">{client.contactPhone}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Documents */}
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Documents</h2>
          <div className="rounded-sm border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Status</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {client.documents.map((doc) => (
                  <tr key={doc.name} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{doc.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        doc.status === "Verified"
                          ? "bg-success/10 text-success-foreground border border-success/20"
                          : doc.status === "AI Generated"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-warning/10 text-warning-foreground border border-warning/20"
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-xs">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ClientProfile;
