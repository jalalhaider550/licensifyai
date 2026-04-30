// Meeting AI: transcribe audio chunks + generate structured notes.
// Separate module — does not touch existing AI/document logic.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

async function transcribeWithGemini(base64Audio: string, mimeType: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: "Transcribe this audio verbatim. Return ONLY the transcript text, no commentary, no timestamps, no speaker labels unless clearly distinct voices." },
          { inline_data: { mime_type: mimeType, data: base64Audio } },
        ],
      }],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini transcribe failed: ${await r.text()}`);
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  return text.trim();
}

async function generateNotes(transcript: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const sys = `You are a Senior Commercial Solicitor (15+ years PQE) acting as a meeting note-taker. Read the meeting transcript and produce structured legal notes. Return ONLY valid JSON matching the tool schema. Plain text in fields — no markdown, no quotes around values.`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Meeting transcript:\n\n${transcript}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "meeting_notes",
          description: "Structured legal meeting notes",
          parameters: {
            type: "object",
            properties: {
              tldr: { type: "string", description: "2-3 sentence TL;DR" },
              detailed_summary: { type: "string", description: "Detailed narrative summary, 1-3 paragraphs" },
              lawyer_brief: { type: "string", description: "Lawyer-ready structured brief in plain text using numbered headings (1. Background 2. Issues 3. Advice 4. Next Steps)" },
              key_points: { type: "array", items: { type: "string" } },
              action_items: { type: "array", items: { type: "object", properties: { title: { type: "string" }, owner: { type: "string" }, due: { type: "string" } }, required: ["title"] } },
              deadlines: { type: "array", items: { type: "object", properties: { description: { type: "string" }, date: { type: "string" } }, required: ["description"] } },
              parties: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } }, required: ["name"] } },
              legal_issues: { type: "array", items: { type: "string" } },
              legal_risks: { type: "array", items: { type: "object", properties: { risk: { type: "string" }, severity: { type: "string", enum: ["low","medium","high"] } }, required: ["risk"] } },
              important_facts: { type: "array", items: { type: "string" } },
              case_type: { type: "string", description: "Inferred case/matter type, or empty" },
              jurisdiction: { type: "string", description: "Jurisdiction if mentioned, or empty" },
            },
            required: ["tldr","detailed_summary","lawyer_brief","key_points","action_items","deadlines","parties","legal_issues","legal_risks","important_facts","case_type","jurisdiction"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "meeting_notes" } },
    }),
  });
  if (!r.ok) throw new Error(`Notes generation failed: ${await r.text()}`);
  const data = await r.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No notes returned");
  return JSON.parse(args);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "transcribe") {
      const text = await transcribeWithGemini(body.audio_base64, body.mime_type ?? "audio/webm");
      return new Response(JSON.stringify({ ok: true, text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "notes") {
      if (!body.transcript || body.transcript.trim().length < 20) {
        return new Response(JSON.stringify({ ok: false, message: "Transcript too short to analyse." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const notes = await generateNotes(body.transcript);
      return new Response(JSON.stringify({ ok: true, notes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meeting-ai error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, message: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
