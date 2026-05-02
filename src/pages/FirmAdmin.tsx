import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  createInvite,
  deactivateMember,
  Firm,
  FirmInvite,
  FirmMember,
  FirmRole,
  getMyFirm,
  listFirmInvites,
  listFirmMembers,
  revokeInvite,
  transferAdmin,
  updateMemberRole,
  getMemberCaseCount,
} from "@/lib/firmWorkspace";
import { toast } from "sonner";
import { Building2, Crown, Mail, ShieldCheck, Trash2, Copy } from "lucide-react";

const ROLE_OPTIONS: { value: FirmRole; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "associate", label: "Associate" },
  { value: "paralegal", label: "Paralegal" },
  { value: "assistant", label: "Assistant" },
  { value: "custom", label: "Custom" },
];

export default function FirmAdmin() {
  const { user } = useAuth();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [me, setMe] = useState<FirmMember | null>(null);
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({});
  const [invites, setInvites] = useState<FirmInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FirmRole>("associate");
  const [inviteCustom, setInviteCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = !!firm && firm.admin_user_id === user?.id;

  const refresh = async () => {
    setLoading(true);
    const { firm: f, member } = await getMyFirm();
    setFirm(f);
    setMe(member);
    if (f) {
      const [m, i] = await Promise.all([listFirmMembers(f.id), listFirmInvites(f.id)]);
      setMembers(m);
      setInvites(i);
      // case counts
      const counts: Record<string, number> = {};
      await Promise.all(m.map(async (mb) => (counts[mb.user_id] = await getMemberCaseCount(mb.user_id))));
      setCaseCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  const sendInvite = async () => {
    if (!firm || !inviteEmail.trim()) return;
    setBusy(true);
    try {
      const inv = await createInvite({
        firm_id: firm.id,
        email: inviteEmail.trim(),
        role: inviteRole,
        custom_role_label: inviteRole === "custom" ? inviteCustom : "",
      });
      toast.success("Invite created. Copy the link to send to the member.");
      setInviteEmail("");
      setInviteCustom("");
      await refresh();
      const link = `${window.location.origin}/signup?invite=${inv.token}`;
      navigator.clipboard.writeText(link).catch(() => {});
    } catch (e: any) {
      toast.error(e.message || "Failed to invite");
    } finally {
      setBusy(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  const handleRoleChange = async (m: FirmMember, role: FirmRole) => {
    try {
      await updateMemberRole(m.id, role);
      toast.success("Role updated");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemove = async (m: FirmMember) => {
    if (!confirm(`Remove ${m.display_name || m.email} from the firm?`)) return;
    try {
      await deactivateMember(m.id);
      toast.success("Member removed");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTransfer = async (m: FirmMember) => {
    if (!firm) return;
    if (!confirm(`Transfer Firm Admin to ${m.display_name || m.email}? You will become a member.`)) return;
    try {
      await transferAdmin(firm.id, m.user_id);
      toast.success("Admin transferred");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-muted-foreground">Loading firm…</div>
      </AppShell>
    );
  }

  if (!firm) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-muted-foreground">No firm workspace found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" /> {firm.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {firm.account_type === "firm" ? "Firm workspace" : "Solo workspace"} ·{" "}
              {isAdmin ? "You are the Firm Admin" : "You are a member"}
            </p>
          </div>
        </div>

        {!isAdmin && (
          <div className="rounded-md border bg-muted/50 p-4 text-sm">
            Only the Firm Admin can manage members, invites, and billing. Contact your admin for changes.
          </div>
        )}

        {isAdmin && (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4" /> Invite a member
            </div>
            <div className="grid sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <Label className="text-xs">Email</Label>
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="lawyer@firm.com" />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as FirmRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inviteRole === "custom" && (
                <div className="sm:col-span-4">
                  <Label className="text-xs">Custom label</Label>
                  <Input value={inviteCustom} onChange={(e) => setInviteCustom(e.target.value)} placeholder="e.g. Of Counsel" />
                </div>
              )}
              <div className="sm:col-span-12 flex justify-end">
                <Button onClick={sendInvite} disabled={busy || !inviteEmail.trim()}>
                  Create invite link
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Members ({members.length})</h2>
          </div>
          <div className="divide-y">
            {members.map((m) => {
              const isFirmAdmin = m.user_id === firm.admin_user_id;
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${!m.is_active ? "opacity-40" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {m.display_name || m.email || "Member"}
                      {isFirmAdmin && (
                        <Badge variant="default" className="gap-1">
                          <Crown className="h-3 w-3" /> Admin
                        </Badge>
                      )}
                      {isMe && <Badge variant="outline">You</Badge>}
                      {!m.is_active && <Badge variant="destructive">Removed</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.email} · {caseCounts[m.user_id] ?? 0} active cases
                    </div>
                  </div>
                  <div className="hidden sm:block w-36">
                    {isAdmin && !isFirmAdmin && m.is_active ? (
                      <Select value={m.role} onValueChange={(v) => handleRoleChange(m, v as FirmRole)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                    )}
                  </div>
                  {isAdmin && !isFirmAdmin && m.is_active && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Transfer admin" onClick={() => handleTransfer(m)}>
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Remove" onClick={() => handleRemove(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">Pending invites ({invites.filter((i) => i.status === "pending").length})</h2>
            </div>
            <div className="divide-y">
              {invites.length === 0 && <div className="px-5 py-4 text-xs text-muted-foreground">No invites yet.</div>}
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.role}
                      {inv.custom_role_label ? ` · ${inv.custom_role_label}` : ""} · expires{" "}
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={inv.status === "pending" ? "secondary" : "outline"}>{inv.status}</Badge>
                  {inv.status === "pending" && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => copyInviteLink(inv.token)} title="Copy link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => revokeInvite(inv.id).then(refresh)} title="Revoke">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold text-sm mb-1">Firm subscription & billing</h2>
            <p className="text-xs text-muted-foreground">
              Firm-wide billing covers all members. Contact support to upgrade your plan.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
