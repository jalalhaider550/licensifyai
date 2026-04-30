import { supabase } from "@/integrations/supabase/client";

export interface VaultProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  case_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VaultFile {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  description: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function listVaultProjects(): Promise<VaultProject[]> {
  const { data, error } = await supabase
    .from("vault_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VaultProject[];
}

export async function getVaultProject(id: string): Promise<VaultProject | null> {
  const { data, error } = await supabase
    .from("vault_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as VaultProject) ?? null;
}

export async function createVaultProject(
  input: { name: string; description?: string; color?: string; case_id?: string | null },
): Promise<VaultProject> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("vault_projects")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? "",
      color: input.color ?? "navy",
      case_id: input.case_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VaultProject;
}

export async function deleteVaultProject(id: string): Promise<void> {
  const { error } = await supabase.from("vault_projects").delete().eq("id", id);
  if (error) throw error;
}

export async function listVaultFiles(projectId: string): Promise<VaultFile[]> {
  const { data, error } = await supabase
    .from("vault_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VaultFile[];
}

export async function uploadVaultFile(
  projectId: string,
  file: File,
  tags: string[] = [],
  description = "",
): Promise<VaultFile> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `vault/${userId}/${projectId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("vault_files")
    .insert({
      user_id: userId,
      project_id: projectId,
      name: file.name,
      description,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      tags,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VaultFile;
}

export async function deleteVaultFile(file: VaultFile): Promise<void> {
  if (file.storage_path) {
    await supabase.storage.from("documents").remove([file.storage_path]);
  }
  const { error } = await supabase.from("vault_files").delete().eq("id", file.id);
  if (error) throw error;
}

export async function updateVaultFileTags(id: string, tags: string[]): Promise<void> {
  const { error } = await supabase.from("vault_files").update({ tags }).eq("id", id);
  if (error) throw error;
}

export async function getVaultFileSignedUrl(path: string, expiresInSec = 3600) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export function searchFiles(files: VaultFile[], query: string): VaultFile[] {
  const q = query.trim().toLowerCase();
  if (!q) return files;
  return files.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.tags.some((t) => t.toLowerCase().includes(q)),
  );
}
