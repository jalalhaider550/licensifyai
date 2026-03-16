import { AppShell } from "@/components/app/AppShell";
import { Users, FileText, AlertCircle, Clock } from "lucide-react";

const stats = [
  { label: "Active Clients", value: "12", icon: Users, change: "+2 this month" },
  { label: "Licensing Projects", value: "8", icon: FileText, change: "3 in progress" },
  { label: "Tasks Pending", value: "14", icon: AlertCircle, change: "5 high priority" },
  { label: "Recent Activity", value: "24", icon: Clock, change: "Actions this week" },
];

const recentActivity = [
  { action: "Document uploaded", client: "NeoBank Ltd", time: "2 hours ago", type: "upload" },
  { action: "AML Policy generated", client: "PayStream Inc", time: "4 hours ago", type: "generate" },
  { action: "Client onboarded", client: "FinWave Technologies", time: "1 day ago", type: "onboard" },
  { action: "EMI application submitted", client: "CryptoFlex Ltd", time: "2 days ago", type: "submit" },
  { action: "Risk framework reviewed", client: "NeoBank Ltd", time: "3 days ago", type: "review" },
];

const Dashboard = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your licensing workspace.
          </p>
        </div>

        {/* Stats Grid */}
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

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-foreground">Recent Activity</h2>
          <div className="mt-4 rounded-sm border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{item.action}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{item.client}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono text-xs">{item.time}</td>
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

export default Dashboard;
