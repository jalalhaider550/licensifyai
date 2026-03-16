import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message);
    } else {
      setSubmitted(true);
    }
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
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-sm border border-border bg-card p-6 text-center">
            <p className="text-sm text-foreground">
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/login">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </div>
        ) : (
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
            <Button type="submit" className="w-full">Send Reset Link</Button>
            <div className="text-center">
              <Link to="/login" className="text-xs text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
