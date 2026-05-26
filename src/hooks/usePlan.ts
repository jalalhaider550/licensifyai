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
    const normalized: Plan =
      raw === "starter" || raw === "professional" || raw === "law_firm"
        ? raw
        : raw === "pro"
        ? "professional"
        : raw === "free_trial"
        ? "professional" // grandfathered
        : "pending";
    setPlan(normalized);
    setStatus((data as any)?.subscription_status ?? null);
    setUsed((data as any)?.contracts_used ?? 0);
    setLimit((data as any)?.contracts_limit ?? PLAN_LIMITS[normalized]);
    setBonus((data as any)?.contracts_bonus ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const isActive =
    plan === "law_firm" ||
    (plan !== "pending" &&
      (status === "active" || status === "trialing" || status === "grandfathered" || status === null));

  return { plan, status, used, limit, bonus, isActive, loading, refetch: load };
}

// Paths always accessible (even for pending users — needed for payment + account flow)
const ALWAYS_ALLOWED = ["/upgrade", "/settings", "/help", "/checkout", "/admin", "/dashboard"];

// Paths accessible to active starter/professional plans (contracts only)
const CONTRACT_PLAN_ALLOWED = [
  ...ALWAYS_ALLOWED,
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
