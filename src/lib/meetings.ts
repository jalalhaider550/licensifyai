// Meetings module — additive. Does not touch existing logic.
import { supabase } from "@/integrations/supabase/client";

export interface Meeting {
  id: string;
  user_id: string;
  case_id: string | null;
  client_id: string | null;
  title: string;
  source: "live" | "upload";
  status: "recording" | "processing" | "ready" | "failed";
  duration_seconds: number;
  transcript: string;
  tldr: string | null;
  detailed_summary: string | null;
  lawyer_brief: string | null;
  key_points: string[];
  action_items: Array<{ title: string; owner?: string; due?: string }>;
  deadlines: Array<{ description: string; date?: string }>;
  parties: Array<{ name: string; role?: string }>;
  legal_issues: string[];
  legal_risks: Array<{ risk: string; severity?: string }>;
  important_facts: string[];
  case_type: string | null;
  jurisdiction: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export async function listMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase.from("meetings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Meeting[];
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const { data, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Meeting) ?? null;
}

export async function createMeeting(input: { title: string; source: "live" | "upload"; case_id?: string | null; client_id?: string | null }): Promise<Meeting> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("meetings").insert({
    user_id: auth.user.id,
    title: input.title || "Untitled Meeting",
    source: input.source,
    case_id: input.case_id ?? null,
    client_id: input.client_id ?? null,
    status: input.source === "live" ? "recording" : "processing",
  }).select("*").single();
  if (error) throw error;
  return data as unknown as Meeting;
}

export async function appendTranscript(meetingId: string, addition: string, durationDelta: number): Promise<void> {
  const { data: existing, error: e1 } = await supabase.from("meetings").select("transcript,duration_seconds").eq("id", meetingId).single();
  if (e1) throw e1;
  const newTranscript = (existing.transcript || "") + (existing.transcript ? " " : "") + addition.trim();
  const { error } = await supabase.from("meetings").update({
    transcript: newTranscript,
    duration_seconds: (existing.duration_seconds || 0) + Math.round(durationDelta),
  }).eq("id", meetingId);
  if (error) throw error;
}

export async function addSegment(meetingId: string, text: string, startSeconds: number, endSeconds: number): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { error } = await supabase.from("meeting_segments").insert({
    meeting_id: meetingId,
    user_id: auth.user.id,
    text,
    start_seconds: startSeconds,
    end_seconds: endSeconds,
  });
  if (error) throw error;
}

export async function transcribeChunk(audioBlob: Blob): Promise<string> {
  const base64 = await blobToBase64(audioBlob);
  const { data, error } = await supabase.functions.invoke("meeting-ai", {
    body: { action: "transcribe", audio_base64: base64, mime_type: audioBlob.type || "audio/webm" },
  });
  if (error) throw new Error(error.message);
  if (data?.ok === false) throw new Error(data.message || "Transcription failed");
  return data.text || "";
}

export async function generateMeetingNotes(meetingId: string): Promise<Meeting> {
  const m = await getMeeting(meetingId);
  if (!m) throw new Error("Meeting not found");
  await supabase.from("meetings").update({ status: "processing" }).eq("id", meetingId);
  const { data, error } = await supabase.functions.invoke("meeting-ai", {
    body: { action: "notes", transcript: m.transcript },
  });
  if (error) throw new Error(error.message);
  if (data?.ok === false) {
    await supabase.from("meetings").update({ status: "failed" }).eq("id", meetingId);
    throw new Error(data.message || "Notes generation failed");
  }
  const n = data.notes;
  const { data: updated, error: upErr } = await supabase.from("meetings").update({
    tldr: n.tldr,
    detailed_summary: n.detailed_summary,
    lawyer_brief: n.lawyer_brief,
    key_points: n.key_points,
    action_items: n.action_items,
    deadlines: n.deadlines,
    parties: n.parties,
    legal_issues: n.legal_issues,
    legal_risks: n.legal_risks,
    important_facts: n.important_facts,
    case_type: n.case_type || null,
    jurisdiction: n.jurisdiction || null,
    status: "ready",
  }).eq("id", meetingId).select("*").single();
  if (upErr) throw upErr;
  return updated as unknown as Meeting;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

export async function searchMeetings(query: string): Promise<Meeting[]> {
  if (!query.trim()) return listMeetings();
  const q = `%${query}%`;
  const { data, error } = await supabase.from("meetings").select("*")
    .or(`title.ilike.${q},transcript.ilike.${q},tldr.ilike.${q},detailed_summary.ilike.${q}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Meeting[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
