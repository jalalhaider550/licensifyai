import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Users,
  FileText,
  PackageCheck,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/licenses", icon: FileText, label: "Licenses" },
  { to: "/applications", icon: PackageCheck, label: "Applications" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex h-14 items-center gap-2 px-5">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-bold text-sidebar-accent-foreground">
            Licensify AI
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
};
