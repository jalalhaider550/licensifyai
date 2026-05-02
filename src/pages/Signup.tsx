import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { acceptInviteToken, lookupInviteByToken, setMyFirmAccountType } from "@/lib/firmWorkspace";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";

  const [accountType, setAccountType] = useState<"solo" | "firm">("solo");
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteFirmName, setInviteFirmName] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        const invite = await lookupInviteByToken(inviteToken);
        if (invite?.email) setEmail(invite.email);
        if (invite?.firm_id) {
          const { data } = await (supabase as any).from("firms").select("name").eq("id", invite.firm_id).maybeSingle();
          setInviteFirmName(data?.name || "your firm");
        }
      } catch {
        // ignore
      }
    })();
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const nameForFirm = inviteToken
      ? (inviteFirmName || "Member")
      : accountType === "firm"
      ? firmName
      : firmName || email.split("@")[0];

    const { error } = await signUp(email, password, nameForFirm);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // If session is available immediately (auto-confirm flows), accept invite or set firm type now.
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (inviteToken) {
          await acceptInviteToken(inviteToken);
        } else {
          await setMyFirmAccountType(accountType);
        }
      }
    } catch (err: any) {
      console.warn("Post-signup setup deferred:", err?.message);
    }

    setLoading(false);
    if (inviteToken) {
      toast.success(`Account created. After verifying your email, you'll join ${inviteFirmName || "the firm"}.`);
    } else {
      toast.success("Account created! Check your email to confirm.");
    }
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Licensify AI
            </span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
            {inviteToken ? "Join your firm" : "Create your workspace"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteToken
              ? `You've been invited to ${inviteFirmName || "a firm workspace"}.`
              : "Start automating licensing and case workflows today."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!inviteToken && (
            <div className="space-y-2">
              <Label>Account type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("solo")}
                  className={`flex flex-col items-center gap-1 rounded-sm border p-3 text-xs transition-colors ${
                    accountType === "solo" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span className="font-semibold">Solo</span>
                  <span className="text-[10px]">Individual lawyer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("firm")}
                  className={`flex flex-col items-center gap-1 rounded-sm border p-3 text-xs transition-colors ${
                    accountType === "firm" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span className="font-semibold">Firm</span>
                  <span className="text-[10px]">Team workspace</span>
                </button>
              </div>
            </div>
          )}

          {!inviteToken && (
            <div className="space-y-2">
              <Label htmlFor="firmName">{accountType === "firm" ? "Law Firm Name" : "Display Name"}</Label>
              <Input
                id="firmName"
                placeholder={accountType === "firm" ? "Chambers & Associates LLP" : "Your name"}
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                required={accountType === "firm"}
                className="rounded-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="partner@lawfirm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-sm"
              disabled={!!inviteToken && !!email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating workspace…" : inviteToken ? "Accept invite" : "Create Workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to={inviteToken ? `/login?invite=${inviteToken}` : "/login"} className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
