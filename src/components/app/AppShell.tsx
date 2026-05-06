import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ResearchSidebar } from "@/components/app/ResearchSidebar";
import {
  
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  FileText,
  PackageCheck,
  FolderOpen,
  FileCheck,
  ListTodo,
  Activity,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Scale,
  FilePen,
  ShieldCheck,
  Home,
  FolderKanban,
  Workflow,
  Table,
  Sparkles,
  Mic,
  Gavel,
  BookOpen,
  Building2,
  UsersRound,
  Lock,
} from "lucide-react";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { SafeBoundary } from "@/components/app/SafeBoundary";
import { Logo } from "@/components/brand/Logo";
import { usePlan, isPathAllowed } from "@/hooks/usePlan";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/cases", icon: BriefcaseBusiness, label: "Legal Cases" },
  { to: "/shared", icon: UsersRound, label: "Shared with me" },
  { to: "/firm", icon: Building2, label: "Firm Workspace" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/licenses", icon: PackageCheck, label: "Licensing" },
  { to: "/documents", icon: FolderOpen, label: "Documents" },
  { to: "/vault", icon: FolderKanban, label: "Project Vault" },
  { to: "/workflows", icon: Workflow, label: "Workflows" },
  { to: "/bulk-review", icon: Table, label: "Bulk Review" },
  { to: "/assistant", icon: Sparkles, label: "AI Assistant" },
  { to: "/models", icon: Sparkles, label: "Multi-Model" },
  { to: "/meetings", icon: Mic, label: "Meetings" },
  { to: "/legal-intelligence", icon: Gavel, label: "Legal Intelligence" },
  { to: "/compliance", icon: FileCheck, label: "Compliance Documents" },
  { to: "/licensing-requirements", icon: Scale, label: "Licensing Requirements" },
  { to: "/conveyancing", icon: Home, label: "Conveyancing" },
  { to: "/tasks", icon: ListTodo, label: "Tasks" },
  { to: "/activity", icon: Activity, label: "Activity" },
];

const legalDocItems = [
  { to: "/generate-contract", icon: FilePen, label: "Generate Contract" },
  { to: "/generate-nda", icon: ShieldCheck, label: "Generate NDA" },
];

const bottomNavItems = [
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/help", icon: HelpCircle, label: "Help" },
];

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { plan, daysLeft } = usePlan();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeResearch = () => window.dispatchEvent(new CustomEvent("research:close"));

  const openResearch = () => {
    setMobileOpen(false);
    window.dispatchEvent(new CustomEvent("research:open"));
  };

  const toggleMobileNav = () => {
    closeResearch();
    setMobileOpen((v) => !v);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isPathAllowed(location.pathname, plan)) {
      navigate("/upgrade", { replace: true });
    }
  }, [location.pathname, plan, user, loading, navigate]);

  useEffect(() => {
    setMobileOpen(false);
    closeResearch();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
          <Logo variant="icon" className="h-7 w-7" />
        </div>
        <span className="font-display text-sm font-bold text-sidebar-accent-foreground tracking-tight">
          Licensify AI
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          Workspace
        </p>
        {navItems.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          const locked = !isPathAllowed(item.to, plan);
          return (
            <Link
              key={item.to}
              to={locked ? "/upgrade" : item.to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              } ${locked ? "opacity-60" : ""}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {locked && (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sidebar-foreground/60">
                  <Lock className="h-3 w-3" />
                  Pro
                </span>
              )}
            </Link>
          );
        })}

        <button
          onClick={openResearch}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Research
        </button>

        <p className="px-3 mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          Legal Documents
        </p>
        {legalDocItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
        {bottomNavItems.map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <Logo variant="icon" className="h-6 w-6" />
          <span className="font-display text-sm font-bold">Licensify AI</span>
        </div>
        <div className="flex items-center gap-1">
          <SafeBoundary label="NotificationsBell-mobile"><NotificationsBell /></SafeBoundary>
          <button onClick={toggleMobileNav} className="p-1 rounded-lg hover:bg-muted transition-colors">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Desktop notifications */}
      <div className="fixed top-3 right-4 z-30 hidden md:block">
        <SafeBoundary label="NotificationsBell-desktop"><NotificationsBell /></SafeBoundary>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-sidebar pt-14 shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar md:flex">
        <NavContent />
      </aside>

      <main className="md:ml-64 flex-1 min-h-screen pt-14 md:pt-0">
        {children}
      </main>

      {/* Independent lawyer research panel — additive only */}
      <ResearchSidebar />
    </div>
  );
};
