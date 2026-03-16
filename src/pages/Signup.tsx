import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

const Signup = () => {
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will be connected to Lovable Cloud auth
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
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start automating fintech license applications today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmName">Law Firm Name</Label>
            <Input
              id="firmName"
              placeholder="Chambers & Associates LLP"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              required
              className="rounded-sm"
            />
          </div>
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
            {loading ? "Creating workspace…" : "Create Workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
