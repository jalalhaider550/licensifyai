// Multi-model chat: supports Lovable AI gateway, direct Anthropic, and direct Google Gemini.
// Additive — does not replace any existing AI logic.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Msg = { role: "system" | "user" | "assistant"; content: string };

interface Body {
  provider: "lovable" | "anthropic" | "gemini";
  model: string;
  messages: Msg[];
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

async function callLovable(body: Body) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const messages = body.system
    ? [{ role: "system", content: body.system }, ...body.messages]
    : body.messages;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: body.model, messages, temperature: body.temperature }),
  });
  if (!r.ok) {
    const t = await r.text();
    return { ok: false, status: r.status, error: t };
  }
  const data = await r.json();
  return { ok: true, content: data.choices?.[0]?.message?.content ?? "", raw: data };
}

async function callAnthropic(body: Body) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: body.max_tokens ?? 4096,
      system: body.system,
      messages: body.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      temperature: body.temperature,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return { ok: false, status: r.status, error: t };
  }
  const data = await r.json();
  const content = (data.content ?? []).map((b: any) => b.text ?? "").join("");
  return { ok: true, content, raw: data };
}

async function callGemini(body: Body) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(body.model)}:generateContent?key=${key}`;
  const contents = body.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const payload: any = { contents };
  if (body.system) payload.systemInstruction = { parts: [{ text: body.system }] };
  if (body.temperature != null) payload.generationConfig = { temperature: body.temperature };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text();
    return { ok: false, status: r.status, error: t };
  }
  const data = await r.json();
  const content = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  return { ok: true, content, raw: data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.provider || !body?.model || !Array.isArray(body?.messages)) {
      return new Response(JSON.stringify({ error: "provider, model, messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;
    if (body.provider === "anthropic") result = await callAnthropic(body);
    else if (body.provider === "gemini") result = await callGemini(body);
    else result = await callLovable(body);

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error, status: result.status }), {
        status: result.status === 429 || result.status === 402 ? result.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ content: result.content, provider: body.provider, model: body.model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("multi-model-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
