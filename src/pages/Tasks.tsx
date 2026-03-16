import { AppShell } from "@/components/app/AppShell";
import { ListTodo, CheckCircle2, Circle, AlertCircle } from "lucide-react";

const Tasks = () => {
  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track pending actions across your licensing projects.
          </p>
        </div>

        <div className="rounded-sm border border-border bg-card p-8 text-center">
          <ListTodo className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground mb-1">No Pending Tasks</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tasks are automatically created when licensing projects have missing information or 
            documents that need attention. Add clients and create licensing projects to get started.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Tasks;
