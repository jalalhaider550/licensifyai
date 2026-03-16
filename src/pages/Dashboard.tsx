import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Users, FileText, FolderOpen, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const [clientCount, setClientCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [clients, apps, docs] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("license_applications").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
      ]);
      setClientCount(clients.count || 0);
      setAppCount(apps.count || 0);
      setDocCount(docs.count || 0);
    };
    fetchStats();
  }, [user]);

  const stats = [
    { label: "Total Clients", value: String(clientCount), icon: Users, sub: "Onboarded clients", link: "/clients" },
    { label: "Licensing Projects", value: String(appCount), icon: FileText, sub: "Active applications", link: "/licenses" },
    { label: "Documents Uploaded", value: String(docCount), icon: FolderOpen, sub: "Across all clients", link: "/documents" },
    { label: "Pending Tasks", value: "0", icon: AlertCircle, sub: "Needs attention", link: "/tasks" },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your licensing workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="rounded-sm border border-border bg-card p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.sub}</div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            to="/clients"
            className="rounded-sm border border-border bg-card p-5 hover:border-primary/30 transition-colors group"
          >
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              Add a Client
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Onboard a new fintech company with their corporate details.
            </p>
          </Link>
          <Link
            to="/licenses"
            className="rounded-sm border border-border bg-card p-5 hover:border-primary/30 transition-colors group"
          >
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              Create Licensing Project
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Start a new license application for a client.
            </p>
          </Link>
          <Link
            to="/compliance"
            className="rounded-sm border border-border bg-card p-5 hover:border-primary/30 transition-colors group"
          >
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              Generate Documents
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Create AML policies, compliance manuals, and more.
            </p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold text-foreground">Recent Activity</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            No recent activity. Start by adding a client or creating a licensing project.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
