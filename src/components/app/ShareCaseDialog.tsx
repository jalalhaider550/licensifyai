import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Users, ArrowRightLeft } from "lucide-react";
import {
  CasePermission,
  FirmMember,
  getMyFirm,
  listCaseShares,
  listFirmMembers,
  revokeShare,
  shareCase,
  updateShare,
  designateFirmCase,
  removeFirmCase,
  isFirmCase,
  handoffCase,
} from "@/lib/firmWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  caseId: string;
  caseOwnerId: string;
  caseTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

const PERMISSIONS: { value: CasePermission; label: string; desc: string }[] = [
  { value: "viewer", label: "Viewer", desc: "Read everything, no edits" },
  { value: "contributor", label: "Contributor", desc: "Add documents, notes, research" },
  { value: "editor", label: "Editor", desc: "Full read & write" },
  { value: "co_owner", label: "Co-Owner", desc: "Same as owner, can re-share" },
];

export function ShareCaseDialog({ caseId, caseOwnerId, caseTitle, open, onOpenChange, onChanged }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firmPool, setFirmPool] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedPerm, setSelectedPerm] = useState<CasePermission>("viewer");
  const [loading, setLoading] = useState(false);
  const [handoffTo, setHandoffTo] = useState<string>("");

  const isOwner = user?.id === caseOwnerId;

  const refresh = async () => {
    if (!user) return;
    const { firm, member } = await getMyFirm();
    if (!firm) return;
    setFirmId(firm.id);
    setIsAdmin(firm.admin_user_id === user.id);
    const [m, s, pool] = await Promise.all([listFirmMembers(firm.id), listCaseShares(caseId), isFirmCase(caseId)]);
    setMembers(m.filter((x) => x.is_active && x.user_id !== caseOwnerId));
    setShares(s);
    setFirmPool(pool);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open, caseId]);

  const availableMembers = useMemo(() => {
    const sharedIds = new Set(shares.map((s) => s.shared_with_user_id));
    return members.filter((m) => !sharedIds.has(m.user_id));
  }, [members, shares]);

  const handleShare = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await shareCase({ case_id: caseId, shared_with_user_id: selectedUser, permission: selectedPerm });
      toast.success("Case shared");
      setSelectedUser("");
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to share");
    } finally {
      setLoading(false);
    }
  };

  const handlePermChange = async (id: string, perm: CasePermission) => {
    try {
      await updateShare(id, perm);
      toast.success("Permission updated");
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke access?")) return;
    try {
      await revokeShare(id);
      toast.success("Access revoked");
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleFirmPool = async () => {
    if (!firmId) return;
    try {
      if (firmPool) await removeFirmCase(caseId);
      else await designateFirmCase(firmId, caseId);
      toast.success(firmPool ? "Removed from firm pool" : "Designated as firm case");
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleHandoff = async () => {
    if (!handoffTo) return;
    if (!confirm("Transfer full ownership of this case? You will become an Editor.")) return;
    try {
      await handoffCase(caseId, handoffTo);
      toast.success("Ownership transferred");
      onOpenChange(false);
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Share case
          </DialogTitle>
          <DialogDescription className="truncate">{caseTitle}</DialogDescription>
        </DialogHeader>

        {!isOwner && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
            Only the owner or a co-owner can share this case.
          </div>
        )}

        {isOwner && (
          <>
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add member</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select firm member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No more members</div>
                    )}
                    {availableMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.display_name || m.email} <span className="text-muted-foreground">· {m.role}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedPerm} onValueChange={(v) => setSelectedPerm(v as CasePermission)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleShare} disabled={!selectedUser || loading}>
                  Share
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                People with access ({shares.length})
              </div>
              <div className="rounded-md border divide-y">
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>Owner (you)</span>
                  <Badge variant="outline">Owner</Badge>
                </div>
                {shares.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="text-sm min-w-0">
                      <div className="font-medium truncate">{s.display_name || s.email || "Member"}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={s.permission} onValueChange={(v) => handlePermChange(s.id, v as CasePermission)}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => handleRevoke(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Firm pool</div>
                    <div className="text-xs text-muted-foreground">
                      Make this case visible to all firm members.
                    </div>
                  </div>
                  <Button variant={firmPool ? "secondary" : "outline"} size="sm" onClick={toggleFirmPool}>
                    {firmPool ? "Remove from firm pool" : "Designate as firm case"}
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Handoff ownership
              </div>
              <div className="flex gap-2">
                <Select value={handoffTo} onValueChange={setHandoffTo}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Pick new owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.display_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleHandoff} disabled={!handoffTo}>
                  Transfer
                </Button>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
