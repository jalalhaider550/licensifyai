import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Users, FileText, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const [clientCount, setClientCount] = useState(0);
  const [appCount, setAppCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      const { count: cc } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });
      setClientCount(cc || 0);

      const { count: ac } = await supabase
        .from("license_applications")
        .select("*", { count: "exact", head: true });
      setAppCount(ac || 0);
    };
    fetchStats();
  }, [user]);

  const stats = [
    { label: "Active Clients", value: String(clientCount), icon: Users, change: "Total onboarded" },
    { label: "Licensing Projects", value: String(appCount), icon: FileText, change: "Active applications" },
    { label: "Tasks Pending", value: "0", icon: AlertCircle, change: "Needs attention" },
    { label: "Recent Activity", value: "—", icon: Clock, change: "This week" },
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
            <div key={stat.label} className="rounded-sm border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">Get Started</h2>
          <p className="text-sm text-muted-foreground">
            Add your first client to begin automating license applications. Navigate to <strong>Clients</strong> to onboard a fintech company.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
