import { useAuth } from "@/hooks/useAuth";

const TRIAL_DAYS = 90;

export type Plan = "free_trial" | "pro";

export function usePlan() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return { plan: "free_trial" as Plan, daysLeft: TRIAL_DAYS, loading };
  }

  const createdAt = user.created_at ? new Date(user.created_at).getTime() : Date.now();
  const elapsedDays = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsedDays);
  const plan: Plan = daysLeft > 0 ? "free_trial" : "pro";

  return { plan, daysLeft, loading: false };
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
  "/models",
  "/settings",
  "/help",
  "/upgrade",
];

export function isPathAllowed(path: string, plan: Plan): boolean {
  if (plan === "pro") return true;
  return FREE_TRIAL_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
