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

type JsonRecord = Record<string, unknown>;
type AnthropicContentBlock = { text?: string };
type GeminiPart = { text?: string };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProviderMessage(parsed: unknown, fallback: string) {
  if (!isRecord(parsed)) return fallback;
  if (isRecord(parsed.error) && typeof parsed.error.message === "string") return parsed.error.message;
  if (typeof parsed.message === "string") return parsed.message;
  return fallback;
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
  const data = await r.json() as { content?: AnthropicContentBlock[] };
  const content = (data.content ?? []).map((b) => b.text ?? "").join("");
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
  const payload: { contents: typeof contents; systemInstruction?: { parts: { text: string }[] }; generationConfig?: { temperature: number } } = { contents };
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
  const data = await r.json() as { candidates?: { content?: { parts?: GeminiPart[] } }[] };
  const content = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
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
      const raw = String(result.error ?? "");
      let parsed: unknown = null;
      try { parsed = JSON.parse(raw); } catch { /* not JSON */ }
      const upstreamMsg = getProviderMessage(parsed, raw);

      const isCredits = /credit balance is too low|insufficient.*(credit|balance|quota)|billing/i.test(upstreamMsg);
      const isRate = result.status === 429;
      const isAuth = result.status === 401 || result.status === 403;

      const code = isCredits ? "INSUFFICIENT_CREDITS"
        : isRate ? "RATE_LIMITED"
        : isAuth ? "AUTH_FAILED"
        : "PROVIDER_ERROR";

      const friendly = isCredits
        ? `${body.provider === "anthropic" ? "Anthropic" : body.provider === "gemini" ? "Google Gemini" : "Provider"} API key has no credits. Top up the provider account or switch to another model.`
        : isRate ? "Rate limit reached. Please retry shortly."
        : isAuth ? `${body.provider} API key is invalid or unauthorised.`
        : `Provider error: ${upstreamMsg.slice(0, 240)}`;

      // Always 200 so the client can render the friendly message instead of crashing.
      return new Response(JSON.stringify({
        ok: false,
        code,
        message: friendly,
        provider: body.provider,
        upstream_status: result.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ content: result.content, provider: body.provider, model: body.model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("multi-model-chat error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const isConfig = /API_KEY not configured|invalid|unauthorised|unauthorized/i.test(message);
    return new Response(JSON.stringify({
      ok: false,
      code: isConfig ? "AUTH_FAILED" : "FUNCTION_ERROR",
      message: isConfig ? "The selected provider is not configured correctly. Switch to another model or update the provider key." : "The model gateway could not complete the request. Please switch models or retry shortly.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
