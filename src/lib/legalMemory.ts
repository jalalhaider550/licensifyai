import { supabase } from "@/integrations/supabase/client";

export interface LegalMemoryEntry {
  id: string;
  user_id: string;
  case_id?: string | null;
  client_id?: string | null;
  memory_type: string;
  jurisdiction?: string | null;
  topic: string;
  title: string;
  summary: string;
  decision: string;
  outcome: string;
  lessons: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type LegalMemoryInput = Omit<Partial<LegalMemoryEntry>, "id" | "user_id" | "created_at" | "updated_at"> & {
  title: string;
};

export async function listLegalMemory(search?: string): Promise<LegalMemoryEntry[]> {
  let q = supabase.from("legal_memory").select("*").order("created_at", { ascending: false });
  if (search && search.trim()) {
    q = q.or(`title.ilike.%${search}%,summary.ilike.%${search}%,topic.ilike.%${search}%,lessons.ilike.%${search}%`);
  }
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data || []) as LegalMemoryEntry[];
}

export async function saveLegalMemory(entry: LegalMemoryInput & { id?: string }): Promise<LegalMemoryEntry> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const payload = {
    user_id: userData.user.id,
    memory_type: entry.memory_type || "case",
    jurisdiction: entry.jurisdiction || null,
    topic: entry.topic || "",
    title: entry.title,
    summary: entry.summary || "",
    decision: entry.decision || "",
    outcome: entry.outcome || "",
    lessons: entry.lessons || "",
    tags: entry.tags || [],
    metadata: entry.metadata || {},
    case_id: entry.case_id || null,
    client_id: entry.client_id || null,
  };

  if (entry.id) {
    const { data, error } = await supabase.from("legal_memory").update(payload).eq("id", entry.id).select().single();
    if (error) throw error;
    return data as LegalMemoryEntry;
  }
  const { data, error } = await supabase.from("legal_memory").insert(payload).select().single();
  if (error) throw error;
  return data as LegalMemoryEntry;
}

export async function deleteLegalMemory(id: string): Promise<void> {
  const { error } = await supabase.from("legal_memory").delete().eq("id", id);
  if (error) throw error;
}
