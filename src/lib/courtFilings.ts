import { supabase } from "@/integrations/supabase/client";
import { createLegalDocxBlob, createLegalPdfBlob, parseLegalWorkProduct, slugifyFileName } from "@/lib/legalDocuments";
import { prepareBrowserDownload, triggerBrowserDownload } from "@/lib/fileDownloads";

export interface CourtFilingInput {
  jurisdiction: "UK" | "US";
  court: string;
  filing_type: string;
  title: string;
  case_number?: string;
  parties?: Record<string, string>;
  facts?: string;
  relief?: string;
  case_id?: string | null;
  client_id?: string | null;
}

export interface CourtFiling extends CourtFilingInput {
  id: string;
  user_id: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const FILING_TYPES_UK = [
  "Claim Form (CPR Part 7)",
  "Particulars of Claim",
  "Defence",
  "Reply to Defence",
  "Witness Statement",
  "Application Notice (N244)",
  "Skeleton Argument",
  "Notice of Appeal",
];

export const FILING_TYPES_US = [
  "Complaint",
  "Answer",
  "Motion to Dismiss",
  "Motion for Summary Judgment",
  "Memorandum of Law",
  "Affidavit / Declaration",
  "Notice of Motion",
  "Notice of Appeal",
];

export async function generateCourtFiling(input: CourtFilingInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke("court-filing-ai", { body: input });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data?.content as string) || "";
}

export async function saveCourtFiling(input: CourtFilingInput & { content: string; id?: string }): Promise<CourtFiling> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const payload = {
    user_id: userData.user.id,
    jurisdiction: input.jurisdiction,
    court: input.court,
    filing_type: input.filing_type,
    title: input.title,
    case_number: input.case_number || "",
    parties: input.parties || {},
    facts: input.facts || "",
    relief: input.relief || "",
    content: input.content,
    case_id: input.case_id || null,
    client_id: input.client_id || null,
  };

  if (input.id) {
    const { data, error } = await supabase.from("court_filings").update(payload).eq("id", input.id).select().single();
    if (error) throw error;
    return data as CourtFiling;
  }
  const { data, error } = await supabase.from("court_filings").insert(payload).select().single();
  if (error) throw error;
  return data as CourtFiling;
}

export async function listCourtFilings(): Promise<CourtFiling[]> {
  const { data, error } = await supabase.from("court_filings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as CourtFiling[];
}

export async function deleteCourtFiling(id: string): Promise<void> {
  const { error } = await supabase.from("court_filings").delete().eq("id", id);
  if (error) throw error;
}

function buildSimplePayload(title: string, content: string) {
  return parseLegalWorkProduct(JSON.stringify({
    kind: "document",
    title,
    date: new Date().toLocaleDateString(),
    sections: [{ heading: "Filing", body: content.split(/\n+/).filter(Boolean) }],
  }));
}

export async function exportCourtFilingPdf(title: string, content: string) {
  const payload = buildSimplePayload(title, content);
  const blob = await createLegalPdfBlob(payload);
  const file = `${slugifyFileName(title) || "court-filing"}_${new Date().toISOString().slice(0, 10)}.pdf`;
  triggerBrowserDownload(prepareBrowserDownload(blob, file, "application/pdf"));
}

export async function exportCourtFilingDocx(title: string, content: string) {
  const payload = buildSimplePayload(title, content);
  const blob = await createLegalDocxBlob(payload);
  const file = `${slugifyFileName(title) || "court-filing"}_${new Date().toISOString().slice(0, 10)}.docx`;
  triggerBrowserDownload(prepareBrowserDownload(blob, file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
}
