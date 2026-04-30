import { supabase } from "@/integrations/supabase/client";

export interface BulkReviewColumn {
  id: string;
  name: string;
  prompt: string;
}

export interface BulkReviewRow {
  id: string;
  label: string;
  content: string;
  values: Record<string, string>; // columnId -> AI output
  loading?: Record<string, boolean>;
}

export interface BulkReview {
  id: string;
  case_id: string | null;
  name: string;
  description: string;
  columns: BulkReviewColumn[];
  rows: BulkReviewRow[];
  status: string;
  created_at: string;
  updated_at: string;
}

export async function listBulkReviews(): Promise<BulkReview[]> {
  const { data, error } = await supabase
    .from("bulk_reviews")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BulkReview[];
}

export async function getBulkReview(id: string): Promise<BulkReview | null> {
  const { data, error } = await supabase.from("bulk_reviews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as BulkReview) || null;
}

export async function createBulkReview(input: { name: string; description?: string; case_id?: string }): Promise<BulkReview> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("bulk_reviews")
    .insert({
      user_id: userData.user.id,
      name: input.name,
      description: input.description || "",
      case_id: input.case_id || null,
      columns: [
        { id: crypto.randomUUID(), name: "Summary", prompt: "Summarise the row content in one sentence." },
      ] as never,
      rows: [] as never,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BulkReview;
}

export async function updateBulkReview(id: string, patch: Partial<BulkReview>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.columns !== undefined) payload.columns = patch.columns;
  if (patch.rows !== undefined) {
    payload.rows = patch.rows.map((r) => ({
      id: r.id,
      label: r.label,
      content: r.content,
      values: r.values,
    }));
  }
  if (patch.status !== undefined) payload.status = patch.status;
  const { error } = await supabase.from("bulk_reviews").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteBulkReview(id: string): Promise<void> {
  const { error } = await supabase.from("bulk_reviews").delete().eq("id", id);
  if (error) throw error;
}

export async function runBulkReviewCell(params: {
  row_content: string;
  column_prompt: string;
  model?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("bulk-review-cell", { body: params });
  if (error) throw new Error(error.message || "AI failed");
  if (data?.error) throw new Error(data.error);
  return data?.value || "";
}
