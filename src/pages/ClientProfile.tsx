import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Building2, Users as UsersIcon, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ClientProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [directors, setDirectors] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const [{ data: c }, { data: d }, { data: s }, { data: docs }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("directors").select("*").eq("client_id", id),
        supabase.from("shareholders").select("*").eq("client_id", id),
        supabase.from("documents").select("*").eq("client_id", id),
      ]);
      setClient(c);
      setDirectors(d || []);
      setShareholders(s || []);
      setDocuments(docs || []);
      setLoading(false);
    };
    fetch();
  }, [user, id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center p-20">
          <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <div className="p-6 text-center text-muted-foreground">Client not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-3 w-3" />
            Back to Clients
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{client.company_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground font-mono">
                {client.jurisdiction} {client.registration_number ? `· Reg. ${client.registration_number}` : ""}
              </p>
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Company Details</h3>
            </div>
            <dl className="space-y-3 text-sm">
              {client.incorporation_date && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Incorporation Date</dt>
                  <dd className="mt-0.5 font-mono text-foreground">{client.incorporation_date}</dd>
                </div>
              )}
              {client.registered_address && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Registered Address</dt>
                  <dd className="mt-0.5 text-foreground">{client.registered_address}</dd>
                </div>
              )}
              {client.services && client.services.length > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Services</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {client.services.map((s: string) => (
                      <span key={s} className="inline-flex rounded-sm border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Ownership Structure</h3>
            </div>
            {shareholders.length > 0 ? (
              <div className="space-y-2 mb-4">
                {shareholders.map((sh) => (
                  <div key={sh.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{sh.name}</span>
                    <span className="font-mono text-muted-foreground">{sh.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No shareholders added yet.</p>
            )}
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Directors</h4>
            {directors.length > 0 ? (
              <ul className="space-y-1">
                {directors.map((d) => (
                  <li key={d.id} className="text-sm text-foreground">{d.full_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No directors added yet.</p>
            )}
          </div>

          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Contact Information</h3>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Email</dt>
                <dd className="mt-0.5 text-foreground">{client.contact_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wider">Phone</dt>
                <dd className="mt-0.5 font-mono text-foreground">{client.contact_phone || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Documents</h2>
          <div className="rounded-sm border border-border bg-card">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No documents uploaded yet. Upload files to get started with AI extraction.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Status</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{doc.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.file_type || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          doc.ai_status === "verified"
                            ? "bg-success/10 text-success-foreground border border-success/20"
                            : doc.ai_status === "generated"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-warning/10 text-warning-foreground border border-warning/20"
                        }`}>
                          {doc.ai_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ClientProfile;
