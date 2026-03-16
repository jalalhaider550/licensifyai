import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal } from "lucide-react";

interface Client {
  id: string;
  name: string;
  jurisdiction: string;
  status: "active" | "pending" | "completed";
  licenses: number;
  lastUpdated: string;
}

const mockClients: Client[] = [
  { id: "1", name: "NeoBank Ltd", jurisdiction: "UK", status: "active", licenses: 2, lastUpdated: "2 hours ago" },
  { id: "2", name: "PayStream Inc", jurisdiction: "US", status: "active", licenses: 1, lastUpdated: "4 hours ago" },
  { id: "3", name: "FinWave Technologies", jurisdiction: "UK", status: "pending", licenses: 1, lastUpdated: "1 day ago" },
  { id: "4", name: "CryptoFlex Ltd", jurisdiction: "UK", status: "completed", licenses: 3, lastUpdated: "2 days ago" },
  { id: "5", name: "TransactPay Corp", jurisdiction: "US", status: "active", licenses: 1, lastUpdated: "3 days ago" },
];

const statusStyles: Record<string, string> = {
  active: "bg-primary/10 text-primary border border-primary/20",
  pending: "bg-warning/10 text-warning-foreground border border-warning/20",
  completed: "bg-success/10 text-success-foreground border border-success/20",
};

const Clients = () => {
  const [search, setSearch] = useState("");

  const filtered = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your fintech client portfolio.
            </p>
          </div>
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="mr-1 h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-sm"
          />
        </div>

        {/* Table */}
        <div className="rounded-sm border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Jurisdiction</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Licenses</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/clients/${client.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.jurisdiction}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusStyles[client.status]}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{client.licenses}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
};

export default Clients;
