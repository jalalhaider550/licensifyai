import { supabase } from "@/integrations/supabase/client";

export type CourtSystem =
  | "PACER" | "NYSCEF" | "TrueFiling" | "Tyler" | "FloridaEPortal" | "Odyssey"
  | "MyHMCTS" | "CE-File" | "PCOL";

export interface CourtSystemDef {
  id: CourtSystem;
  jurisdiction: "US" | "UK";
  label: string;
  fields: { key: string; label: string; required?: boolean }[];
  credentialFields?: { key: string; label: string }[];
}

export const COURT_SYSTEMS: CourtSystemDef[] = [
  { id: "PACER", jurisdiction: "US", label: "Federal (PACER/CM-ECF)",
    fields: [
      { key: "case_number", label: "Case Number", required: true },
      { key: "event_type", label: "Event Type", required: true },
      { key: "attorney_bar", label: "Attorney Bar Number", required: true },
      { key: "party_role", label: "Filing Party Role", required: true },
    ]},
  { id: "NYSCEF", jurisdiction: "US", label: "New York (NYSCEF)",
    fields: [
      { key: "index_number", label: "Index Number", required: true },
      { key: "county", label: "County", required: true },
      { key: "doc_type_code", label: "Document Type Code", required: true },
    ]},
  { id: "TrueFiling", jurisdiction: "US", label: "California (TrueFiling)",
    fields: [
      { key: "case_number", label: "Case Number", required: true },
      { key: "court_location", label: "Court Location", required: true },
      { key: "doc_type", label: "Document Type", required: true },
    ]},
  { id: "Tyler", jurisdiction: "US", label: "Texas (Tyler File and Serve)",
    fields: [
      { key: "case_number", label: "Case Number", required: true },
      { key: "court", label: "Court", required: true },
      { key: "filing_code", label: "Filing Code", required: true },
    ]},
  { id: "FloridaEPortal", jurisdiction: "US", label: "Florida (ePortal)",
    fields: [
      { key: "case_number", label: "Case Number", required: true },
      { key: "county", label: "County", required: true },
      { key: "doc_group", label: "Document Group", required: true },
    ]},
  { id: "Odyssey", jurisdiction: "US", label: "Illinois (Odyssey File and Serve)",
    fields: [
      { key: "case_number", label: "Case Number", required: true },
      { key: "county", label: "County", required: true },
      { key: "filing_code", label: "Filing Code", required: true },
    ]},
  { id: "MyHMCTS", jurisdiction: "UK", label: "Civil & Family (MyHMCTS)",
    fields: [
      { key: "claim_number", label: "Claim Number", required: true },
      { key: "case_type", label: "Case Type", required: true },
      { key: "party_role", label: "Party Role", required: true },
      { key: "fee_account_ref", label: "Fee Account Reference", required: true },
    ]},
  { id: "CE-File", jurisdiction: "UK", label: "High Court (CE-File)",
    fields: [
      { key: "case_reference", label: "Case Reference", required: true },
      { key: "division", label: "Division", required: true },
      { key: "doc_type", label: "Document Type", required: true },
    ]},
  { id: "PCOL", jurisdiction: "UK", label: "Possession Claims (PCOL)",
    fields: [
      { key: "claim_number", label: "Claim Number", required: true },
      { key: "party_role", label: "Party Role", required: true },
    ]},
];

export interface CourtCredential {
  id: string; user_id: string; court_system: string; jurisdiction: string;
  username: string; verification_status: string; last_verified_at: string | null;
  extra: Record<string, any>;
}

export interface CourtFilingSubmission {
  id: string; user_id: string; case_id: string | null; filing_id: string | null;
  court_system: string; jurisdiction: string; status: string;
  confirmation_number: string; submitted_at: string; last_polled_at: string | null;
  metadata: Record<string, any>; attachments: any[]; receipt: Record<string, any>;
  rejection_reason: string;
}

export async function getCredential(courtSystem: string): Promise<CourtCredential | null> {
  const { data } = await supabase.from("court_credentials").select("*").eq("court_system", courtSystem).maybeSingle();
  return (data as any) || null;
}

export async function testConnection(input: { courtSystem: CourtSystem; jurisdiction: "US" | "UK"; username: string; secret: string; extra?: Record<string, any>; }) {
  const { data, error } = await supabase.functions.invoke("court-efile", {
    body: { action: "test_connection", ...input },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; verified: boolean };
}

export async function submitFiling(input: {
  courtSystem: CourtSystem; jurisdiction: "US" | "UK";
  metadata: Record<string, any>;
  attachments: { name: string; bytes: number; passed: boolean }[];
  primaryContent: string;
  caseId?: string | null; filingId?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("court-efile", {
    body: { action: "submit", ...input },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; reason?: string; submission: CourtFilingSubmission };
}

export async function pollSubmission(submissionId: string) {
  const { data, error } = await supabase.functions.invoke("court-efile", {
    body: { action: "poll_status", submissionId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; status: string; submission: CourtFilingSubmission };
}

export async function listSubmissionsForCase(caseId: string): Promise<CourtFilingSubmission[]> {
  const { data, error } = await supabase.from("court_filing_submissions")
    .select("*").eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as any;
}
