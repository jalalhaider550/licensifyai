import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type FirmRole = "admin" | "partner" | "associate" | "paralegal" | "assistant" | "custom";
export type CasePermission = "viewer" | "contributor" | "editor" | "co_owner";
export type CaseAccessLevel = CasePermission | "owner" | "firm_pool" | null;

export interface Firm {
  id: string;
  name: string;
  account_type: "solo" | "firm";
  admin_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FirmMember {
  id: string;
  firm_id: string;
  user_id: string;
  role: FirmRole;
  custom_role_label: string;
  display_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface FirmInvite {
  id: string;
  firm_id: string;
  invited_by: string;
  email: string;
  role: FirmRole;
  custom_role_label: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface CaseShare {
  id: string;
  case_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: CasePermission;
  created_at: string;
}

export interface CaseActivityEntry {
  id: string;
  case_id: string;
  actor_user_id: string;
  actor_name: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  case_id: string | null;
  notif_type: string;
  title: string;
  body: string;
  link_path: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PresenceRow {
  id: string;
  case_id: string;
  user_id: string;
  display_name: string;
  color: string;
  last_seen_at: string;
}

const PRESENCE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

export async function getMyFirm(): Promise<{ firm: Firm | null; member: FirmMember | null }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { firm: null, member: null };
  const { data: members } = await db
    .from("firm_members")
    .select("*")
    .eq("user_id", u.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);
  const member = (members?.[0] as FirmMember) || null;
  if (!member) return { firm: null, member: null };
  const { data: firm } = await db.from("firms").select("*").eq("id", member.firm_id).maybeSingle();
  return { firm: (firm as Firm) || null, member };
}

export async function listFirmMembers(firmId: string): Promise<FirmMember[]> {
  const { data, error } = await db
    .from("firm_members")
    .select("*")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as FirmMember[];
}

export async function listFirmInvites(firmId: string): Promise<FirmInvite[]> {
  const { data, error } = await db
    .from("firm_invites")
    .select("*")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as FirmInvite[];
}

export async function createInvite(input: {
  firm_id: string;
  email: string;
  role: FirmRole;
  custom_role_label?: string;
}): Promise<FirmInvite> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await db
    .from("firm_invites")
    .insert({
      firm_id: input.firm_id,
      invited_by: u.user.id,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      custom_role_label: input.custom_role_label || "",
    })
    .select()
    .single();
  if (error) throw error;
  return data as FirmInvite;
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await db.from("firm_invites").update({ status: "revoked" }).eq("id", id);
  if (error) throw error;
}

export async function updateMemberRole(id: string, role: FirmRole, customLabel = ""): Promise<void> {
  const { error } = await db
    .from("firm_members")
    .update({ role, custom_role_label: customLabel })
    .eq("id", id);
  if (error) throw error;
}

export async function deactivateMember(id: string): Promise<void> {
  const { error } = await db.from("firm_members").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

export async function transferAdmin(firmId: string, newAdminUserId: string): Promise<void> {
  const { error } = await db.from("firms").update({ admin_user_id: newAdminUserId }).eq("id", firmId);
  if (error) throw error;
  // Promote the new admin's member role
  await db
    .from("firm_members")
    .update({ role: "admin" })
    .eq("firm_id", firmId)
    .eq("user_id", newAdminUserId);
}

export async function getMemberCaseCount(userId: string): Promise<number> {
  const { count } = await db
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count || 0;
}

// ---------- Case shares ----------
export async function listCaseShares(caseId: string): Promise<(CaseShare & { display_name: string; email: string; role: FirmRole })[]> {
  const { data: shares } = await db.from("case_shares").select("*").eq("case_id", caseId);
  if (!shares?.length) return [];
  const ids = shares.map((s: CaseShare) => s.shared_with_user_id);
  const { data: members } = await db.from("firm_members").select("user_id, display_name, email, role").in("user_id", ids);
  const byUser = new Map<string, any>((members || []).map((m: any) => [m.user_id, m]));
  return shares.map((s: CaseShare) => ({
    ...s,
    display_name: byUser.get(s.shared_with_user_id)?.display_name || "",
    email: byUser.get(s.shared_with_user_id)?.email || "",
    role: byUser.get(s.shared_with_user_id)?.role || "associate",
  }));
}

export async function shareCase(input: { case_id: string; shared_with_user_id: string; permission: CasePermission }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { error } = await db.from("case_shares").upsert(
    {
      case_id: input.case_id,
      shared_with_user_id: input.shared_with_user_id,
      shared_by_user_id: u.user.id,
      permission: input.permission,
    },
    { onConflict: "case_id,shared_with_user_id" },
  );
  if (error) throw error;
  // Notify
  await db.from("notifications").insert({
    user_id: input.shared_with_user_id,
    case_id: input.case_id,
    notif_type: "case_shared",
    title: "A case was shared with you",
    body: `You have been added as ${input.permission}`,
    link_path: `/cases/${input.case_id}`,
  });
  // Activity
  await logActivity(input.case_id, "case_shared", `Shared case as ${input.permission}`, {
    shared_with: input.shared_with_user_id,
    permission: input.permission,
  });
}

export async function updateShare(id: string, permission: CasePermission) {
  const { error } = await db.from("case_shares").update({ permission }).eq("id", id);
  if (error) throw error;
}

export async function revokeShare(id: string) {
  const { error } = await db.from("case_shares").delete().eq("id", id);
  if (error) throw error;
}

export async function listSharedWithMe(): Promise<any[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data: shares } = await db
    .from("case_shares")
    .select("*")
    .eq("shared_with_user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (!shares?.length) return [];
  const caseIds = shares.map((s: CaseShare) => s.case_id);
  const { data: cases } = await db.from("cases").select("*").in("id", caseIds);
  const byId = new Map<string, any>((cases || []).map((c: any) => [c.id, c]));
  return shares
    .map((s: CaseShare) => {
      const c = byId.get(s.case_id);
      if (!c) return null;
      return { ...c, _share_permission: s.permission, _share_owner: c.user_id };
    })
    .filter(Boolean);
}

// ---------- Firm pool ----------
export async function designateFirmCase(firmId: string, caseId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { error } = await db
    .from("firm_cases")
    .upsert({ firm_id: firmId, case_id: caseId, designated_by: u.user.id }, { onConflict: "case_id" });
  if (error) throw error;
}

export async function removeFirmCase(caseId: string) {
  const { error } = await db.from("firm_cases").delete().eq("case_id", caseId);
  if (error) throw error;
}

export async function isFirmCase(caseId: string): Promise<boolean> {
  const { data } = await db.from("firm_cases").select("id").eq("case_id", caseId).maybeSingle();
  return !!data;
}

export async function listFirmPool(firmId: string): Promise<any[]> {
  const { data: pool } = await db.from("firm_cases").select("case_id").eq("firm_id", firmId);
  if (!pool?.length) return [];
  const ids = pool.map((p: any) => p.case_id);
  const { data: cases } = await db.from("cases").select("*").in("id", ids);
  return (cases || []).map((c: any) => ({ ...c, _firm_pool: true }));
}

// ---------- Case access ----------
export async function getCasePermission(caseId: string): Promise<CaseAccessLevel> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db.rpc("get_case_permission", { _case_id: caseId, _user_id: u.user.id });
  if (error) return null;
  return (data as CaseAccessLevel) ?? null;
}

// ---------- Activity ----------
export async function logActivity(
  caseId: string,
  actionType: string,
  description: string,
  metadata: Record<string, unknown> = {},
  targetType = "",
  targetId: string | null = null,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: member } = await db
    .from("firm_members")
    .select("display_name, email")
    .eq("user_id", u.user.id)
    .limit(1)
    .maybeSingle();
  await db.from("case_activity_log").insert({
    case_id: caseId,
    actor_user_id: u.user.id,
    actor_name: member?.display_name || member?.email || "Lawyer",
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    description,
    metadata,
  });
}

export async function listActivity(caseId: string, limit = 100): Promise<CaseActivityEntry[]> {
  const { data } = await db
    .from("case_activity_log")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as CaseActivityEntry[];
}

// ---------- Comments ----------
export async function listComments(documentType: string, documentId: string) {
  const { data } = await db
    .from("document_comments")
    .select("*")
    .eq("document_type", documentType)
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function addComment(input: {
  case_id: string;
  document_type: string;
  document_id: string;
  body: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data: member } = await db
    .from("firm_members")
    .select("display_name, email")
    .eq("user_id", u.user.id)
    .limit(1)
    .maybeSingle();
  const { data, error } = await db
    .from("document_comments")
    .insert({
      case_id: input.case_id,
      document_type: input.document_type,
      document_id: input.document_id,
      author_user_id: u.user.id,
      author_name: member?.display_name || member?.email || "Lawyer",
      body: input.body,
    })
    .select()
    .single();
  if (error) throw error;
  await logActivity(input.case_id, "comment_added", `Commented on a document`, { document_id: input.document_id });
  return data;
}

export async function resolveComment(id: string) {
  const { data: u } = await supabase.auth.getUser();
  await db
    .from("document_comments")
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: u.user?.id })
    .eq("id", id);
}

export async function deleteComment(id: string) {
  await db.from("document_comments").delete().eq("id", id);
}

// ---------- Notifications ----------
export async function listMyNotifications(limit = 50): Promise<NotificationRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as NotificationRow[];
}

export async function markNotificationRead(id: string) {
  await db.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db.from("notifications").update({ is_read: true }).eq("user_id", u.user.id).eq("is_read", false);
}

export async function notifyCollaborators(input: {
  case_id: string;
  exclude_user_id?: string;
  notif_type: string;
  title: string;
  body?: string;
  link_path?: string;
}) {
  // Build recipient list: case owner + share targets + firm-pool members
  const { data: c } = await db.from("cases").select("user_id").eq("id", input.case_id).maybeSingle();
  const recipients = new Set<string>();
  if (c?.user_id) recipients.add(c.user_id);
  const { data: shares } = await db.from("case_shares").select("shared_with_user_id").eq("case_id", input.case_id);
  (shares || []).forEach((s: any) => recipients.add(s.shared_with_user_id));
  const { data: pool } = await db.from("firm_cases").select("firm_id").eq("case_id", input.case_id).maybeSingle();
  if (pool?.firm_id) {
    const { data: members } = await db.from("firm_members").select("user_id").eq("firm_id", pool.firm_id).eq("is_active", true);
    (members || []).forEach((m: any) => recipients.add(m.user_id));
  }
  if (input.exclude_user_id) recipients.delete(input.exclude_user_id);
  const rows = Array.from(recipients).map((uid) => ({
    user_id: uid,
    case_id: input.case_id,
    notif_type: input.notif_type,
    title: input.title,
    body: input.body || "",
    link_path: input.link_path || `/cases/${input.case_id}`,
  }));
  if (rows.length) await db.from("notifications").insert(rows);
}

// ---------- Presence ----------
export async function heartbeatPresence(caseId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: member } = await db
    .from("firm_members")
    .select("display_name, email")
    .eq("user_id", u.user.id)
    .limit(1)
    .maybeSingle();
  await db.from("case_presence").upsert(
    {
      case_id: caseId,
      user_id: u.user.id,
      display_name: member?.display_name || member?.email || "Lawyer",
      color: colorForUser(u.user.id),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "case_id,user_id" },
  );
}

export async function clearPresence(caseId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db.from("case_presence").delete().eq("case_id", caseId).eq("user_id", u.user.id);
}

export async function listActivePresence(caseId: string, withinSeconds = 60): Promise<PresenceRow[]> {
  const cutoff = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const { data } = await db
    .from("case_presence")
    .select("*")
    .eq("case_id", caseId)
    .gt("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false });
  return (data || []) as PresenceRow[];
}

// ---------- Handoff ----------
export async function handoffCase(caseId: string, newOwnerId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  // The case is updated to new owner; previous owner becomes Editor
  const { error: e1 } = await db.from("cases").update({ user_id: newOwnerId }).eq("id", caseId);
  if (e1) throw e1;
  await db.from("case_shares").upsert(
    {
      case_id: caseId,
      shared_with_user_id: u.user.id,
      shared_by_user_id: newOwnerId,
      permission: "editor",
    },
    { onConflict: "case_id,shared_with_user_id" },
  );
  await logActivity(caseId, "case_handoff", "Case ownership transferred", { from: u.user.id, to: newOwnerId });
  await notifyCollaborators({
    case_id: caseId,
    notif_type: "case_handoff",
    title: "Case ownership transferred",
    body: "You are now the owner of this case.",
  });
}
