import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free_trial" | "pro";

export function usePlan() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan>("free_trial");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setPlan("free_trial");
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const p = (data as any)?.plan === "pro" ? "pro" : "free_trial";
        setPlan(p);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { plan, loading };
}

// Routes available on the free 3-month trial. Everything else requires Pro.
export const FREE_TRIAL_PATHS = [
  "/dashboard",
  "/cases",
  "/generate-contract",
  "/generate-nda",
  "/meetings",
  "/legal-intelligence",
  "/assistant",
  "/settings",
  "/help",
  "/upgrade",
];

export function isPathAllowed(path: string, plan: Plan): boolean {
  if (plan === "pro") return true;
  return FREE_TRIAL_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
