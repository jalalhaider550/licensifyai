import { AppShell } from "@/components/app/AppShell";
import { Activity } from "lucide-react";

const ActivityFeed = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent actions and changes across your workspace.
          </p>
        </div>

        <div className="rounded-sm border border-border bg-card p-8 text-center">
          <Activity className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground mb-1">No Recent Activity</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Activity will appear here as you add clients, upload documents, create licensing projects, 
            and generate compliance documents.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default ActivityFeed;
