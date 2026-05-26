import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Users, FileText, FolderOpen, AlertCircle, Clock, ArrowRight, TrendingUp, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const [clientCount, setClientCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [clients, apps, docs, profile] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("license_applications").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("display_name, firm_name").eq("user_id", user.id).single(),
      ]);
      setClientCount(clients.count || 0);
      setAppCount(apps.count || 0);
      setDocCount(docs.count || 0);
      setDisplayName(profile.data?.display_name || profile.data?.firm_name || "");
    };
    fetchStats();
  }, [user]);

  const stats = [
    { label: "Total Clients", value: String(clientCount), icon: Users, sub: "Onboarded clients", link: "/clients", color: "text-primary" },
    { label: "Licensing Projects", value: String(appCount), icon: FileText, sub: "Active applications", link: "/licenses", color: "text-primary" },
    { label: "Documents Uploaded", value: String(docCount), icon: FolderOpen, sub: "Across all clients", link: "/documents", color: "text-primary" },
    { label: "Pending Tasks", value: "0", icon: AlertCircle, sub: "Needs attention", link: "/tasks", color: "text-warning" },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            {displayName ? `Welcome back, ${displayName}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your licensing workspace overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.sub}</div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              to="/clients"
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                Add a Client
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Onboard a new fintech company with their corporate details.
              </p>
            </Link>
            <Link
              to="/compliance"
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                Generate Documents
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Create AML policies, compliance manuals, and more using AI.
              </p>
            </Link>
            <Link
              to="/uk-requirements"
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Scale className="h-4 w-4" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                Regulatory Requirements
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Reference regulatory requirements for fintech licenses across jurisdictions.
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
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
