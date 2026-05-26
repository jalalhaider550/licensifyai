import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "pending" | "starter" | "professional" | "law_firm";

export interface PlanState {
  plan: Plan;
  status: string | null;
  used: number;
  limit: number;
  bonus: number;
  isActive: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const PLAN_LIMITS: Record<Plan, number> = {
  pending: 0,
  starter: 15,
  professional: 30,
  law_firm: 999999,
};

export function usePlan(): PlanState {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan>("pending");
  const [status, setStatus] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPlan("pending");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("plan, subscription_status, contracts_used, contracts_limit, contracts_bonus")
      .eq("user_id", user.id)
      .maybeSingle();
    const raw = (data as any)?.plan;
    const rawStatus = (data as any)?.subscription_status ?? null;
    // Strict gating: a paid plan only counts when Stripe has confirmed it
    // (active/trialing) or the user was explicitly grandfathered/granted by an admin.
    const isConfirmed =
      rawStatus === "active" ||
      rawStatus === "trialing" ||
      rawStatus === "grandfathered";
    let normalized: Plan = "pending";
    if (isConfirmed) {
      if (raw === "starter" || raw === "professional" || raw === "law_firm") {
        normalized = raw;
      } else if (raw === "pro" || raw === "free_trial") {
        normalized = "professional"; // legacy grandfathered mapping
      }
    }
    setPlan(normalized);
    setStatus(rawStatus);
    setUsed((data as any)?.contracts_used ?? 0);
    setLimit((data as any)?.contracts_limit ?? PLAN_LIMITS[normalized]);
    setBonus((data as any)?.contracts_bonus ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  // Active only when a paid plan was resolved above (which already requires a
  // confirmed Stripe status). Pending users are never active.
  const isActive = plan !== "pending";

  return { plan, status, used, limit, bonus, isActive, loading, refetch: load };
}

// Paths accessible to users WITHOUT an active paid subscription.
// Dashboard and every feature are intentionally excluded — payment is required.
const ALWAYS_ALLOWED = ["/upgrade", "/settings", "/help", "/checkout", "/admin"];

// Paths accessible to active starter/professional plans (contracts only)
const CONTRACT_PLAN_ALLOWED = [
  ...ALWAYS_ALLOWED,
  "/dashboard",
  "/generate-contract",
  "/generate-nda",
];

export function isPathAllowed(path: string, plan: Plan, isActive: boolean): boolean {
  if (plan === "law_firm") return true;
  if (!isActive) {
    return ALWAYS_ALLOWED.some((p) => path === p || path.startsWith(p + "/"));
  }
  return CONTRACT_PLAN_ALLOWED.some((p) => path === p || path.startsWith(p + "/"));
}
