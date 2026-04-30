// Multi-model client library (additive — does not replace existing AI logic).
import { supabase } from "@/integrations/supabase/client";

export type ModelProvider = "lovable" | "anthropic" | "gemini";

export interface ModelOption {
  id: string;
  label: string;
  provider: ModelProvider;
  model: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // Lovable AI Gateway (existing)
  { id: "lovable-gemini-3-flash", label: "Gemini 3 Flash (Lovable)", provider: "lovable", model: "google/gemini-3-flash-preview", description: "Fast, balanced — default" },
  { id: "lovable-gemini-2.5-pro", label: "Gemini 2.5 Pro (Lovable)", provider: "lovable", model: "google/gemini-2.5-pro", description: "Top-tier reasoning" },
  { id: "lovable-gpt-5", label: "GPT-5 (Lovable)", provider: "lovable", model: "openai/gpt-5", description: "OpenAI flagship" },
  { id: "lovable-gpt-5-mini", label: "GPT-5 Mini (Lovable)", provider: "lovable", model: "openai/gpt-5-mini", description: "Faster, cheaper GPT-5" },

  // Direct Anthropic
  { id: "anthropic-sonnet-4-5", label: "Claude Sonnet 4.5 (Direct)", provider: "anthropic", model: "claude-sonnet-4-5-20250929", description: "Anthropic flagship via direct API" },
  { id: "anthropic-opus-4-1", label: "Claude Opus 4.1 (Direct)", provider: "anthropic", model: "claude-opus-4-1-20250805", description: "Anthropic deep-reasoning model" },
  { id: "anthropic-haiku-3-5", label: "Claude Haiku 3.5 (Direct)", provider: "anthropic", model: "claude-3-5-haiku-20241022", description: "Fast, low-cost Anthropic model" },

  // Direct Google Gemini
  { id: "gemini-2.5-pro-direct", label: "Gemini 2.5 Pro (Direct)", provider: "gemini", model: "gemini-2.5-pro", description: "Google direct API" },
  { id: "gemini-2.5-flash-direct", label: "Gemini 2.5 Flash (Direct)", provider: "gemini", model: "gemini-2.5-flash", description: "Google direct API, fast" },
];

export interface MultiModelMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MultiModelRequest {
  modelId: string;
  messages: MultiModelMessage[];
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

export async function runMultiModel(req: MultiModelRequest): Promise<{ content: string; provider: ModelProvider; model: string }> {
  const opt = AVAILABLE_MODELS.find((m) => m.id === req.modelId);
  if (!opt) throw new Error(`Unknown model: ${req.modelId}`);

  const { data, error } = await supabase.functions.invoke("multi-model-chat", {
    body: {
      provider: opt.provider,
      model: opt.model,
      messages: req.messages,
      system: req.system,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
    },
  });

  if (error) throw new Error(error.message || "Multi-model call failed");
  if (data && data.ok === false) {
    throw new Error(data.message || "Provider error");
  }
  if (!data?.content) throw new Error("Empty response from model");
  return { content: data.content, provider: data.provider, model: data.model };
}

export function getModelsByProvider(): Record<ModelProvider, ModelOption[]> {
  return {
    lovable: AVAILABLE_MODELS.filter((m) => m.provider === "lovable"),
    anthropic: AVAILABLE_MODELS.filter((m) => m.provider === "anthropic"),
    gemini: AVAILABLE_MODELS.filter((m) => m.provider === "gemini"),
  };
}
