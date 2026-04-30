import { supabase } from "@/integrations/supabase/client";

export type AuthorType = "user" | "ai";

export interface DocumentVersion {
  id: string;
  user_id: string;
  document_type: string;
  document_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string;
  author_type: AuthorType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SaveVersionInput {
  documentType: string;
  documentId: string;
  title: string;
  content: string;
  changeSummary?: string;
  authorType?: AuthorType;
  metadata?: Record<string, unknown>;
}

export async function saveDocumentVersion(input: SaveVersionInput): Promise<DocumentVersion> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Compute next version number
  const { data: latest } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_type", input.documentType)
    .eq("document_id", input.documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      user_id: userId,
      document_type: input.documentType,
      document_id: input.documentId,
      version_number: nextVersion,
      title: input.title,
      content: input.content,
      change_summary: input.changeSummary ?? "",
      author_type: input.authorType ?? "user",
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as DocumentVersion;
}

export async function listDocumentVersions(
  documentType: string,
  documentId: string,
): Promise<DocumentVersion[]> {
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_type", documentType)
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentVersion[];
}

export async function getDocumentVersion(id: string): Promise<DocumentVersion | null> {
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DocumentVersion) ?? null;
}

export async function deleteDocumentVersion(id: string): Promise<void> {
  const { error } = await supabase.from("document_versions").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Compute a simple line-based diff between two text contents.
 * Returns rows tagged as 'same' | 'added' | 'removed'.
 */
export function computeLineDiff(oldText: string, newText: string) {
  const oldLines = (oldText || "").split(/\r?\n/);
  const newLines = (newText || "").split(/\r?\n/);
  // LCS-based diff (small docs)
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: { type: "same" | "added" | "removed"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      rows.push({ type: "same", text: oldLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "removed", text: oldLines[i] });
      i++;
    } else {
      rows.push({ type: "added", text: newLines[j] });
      j++;
    }
  }
  while (i < m) rows.push({ type: "removed", text: oldLines[i++] });
  while (j < n) rows.push({ type: "added", text: newLines[j++] });
  return rows;
}
