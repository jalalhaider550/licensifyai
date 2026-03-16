import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User, Building2, Shield, Lock } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const [firmName, setFirmName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("firm_name, display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFirmName(data.firm_name || "");
          setDisplayName(data.display_name || "");
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ firm_name: firmName, display_name: displayName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, firm details, and security preferences.
          </p>
        </div>

        {/* Firm Information */}
        <div className="rounded-sm border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Law Firm Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firmName">Firm Name</Label>
              <Input
                id="firmName"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Enter your firm name"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="rounded-sm border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">User Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input value={user?.email || ""} disabled className="mt-1 opacity-60" />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-sm border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1"
              />
            </div>
            <Button variant="outline" onClick={handleChangePassword}>
              Update Password
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-sm border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Account</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Account ID: <span className="font-mono text-xs">{user?.id?.slice(0, 8)}…</span></p>
            <p>Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Settings;
