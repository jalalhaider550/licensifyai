import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { acceptInviteToken } from "@/lib/firmWorkspace";

const Login = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (inviteToken) {
      try {
        await acceptInviteToken(inviteToken);
        toast.success("You've joined the firm workspace.");
      } catch (err: any) {
        toast.error(err?.message || "Could not accept invite");
      }
    }
    setLoading(false);
    navigate("/dashboard");
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
            Log in to your workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your licensing and case workflow dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="partner@lawfirm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-sm"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create workspace
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
