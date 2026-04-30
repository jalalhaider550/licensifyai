// Workflow Runner — additive edge function for executing multi-step AI presets
// Does not affect existing case-ai or document generation logic
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  use_previous_output?: boolean;
}

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const resp = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 429) throw new Error("RATE_LIMIT");
    if (resp.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { workflow_id, input_context, case_id, model_override } = body;

    if (!workflow_id) {
      return new Response(JSON.stringify({ error: "workflow_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workflow, error: wfErr } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflow_id)
      .eq("user_id", userId)
      .single();

    if (wfErr || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = model_override || workflow.default_model || "google/gemini-2.5-flash";
    const steps: WorkflowStep[] = workflow.steps || [];

    const { data: run, error: runErr } = await supabase
      .from("workflow_runs")
      .insert({
        user_id: userId,
        workflow_id,
        case_id: case_id || null,
        input_context: input_context || "",
        status: "running",
        model_used: model,
      })
      .select()
      .single();

    if (runErr || !run) throw new Error("Could not create run");

    const stepResults: Array<{ step_id: string; name: string; output: string }> = [];
    let lastOutput = input_context || "";
    const systemPrompt =
      "You are an expert legal AI assistant operating inside a workflow. Output plain text. Be precise, concise, and follow each step's instruction exactly.";

    try {
      for (const step of steps) {
        const userPrompt = step.use_previous_output
          ? `${step.prompt}\n\n--- PREVIOUS STEP OUTPUT ---\n${lastOutput}`
          : `${step.prompt}\n\n--- INPUT CONTEXT ---\n${input_context || ""}`;
        const output = await callAI(apiKey, model, systemPrompt, userPrompt);
        stepResults.push({ step_id: step.id, name: step.name, output });
        lastOutput = output;
      }

      await supabase
        .from("workflow_runs")
        .update({
          status: "completed",
          step_results: stepResults,
          final_output: lastOutput,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return new Response(
        JSON.stringify({
          run_id: run.id,
          status: "completed",
          step_results: stepResults,
          final_output: lastOutput,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await supabase
        .from("workflow_runs")
        .update({
          status: "failed",
          step_results: stepResults,
          error_message: msg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      const httpStatus =
        msg === "RATE_LIMIT" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
      return new Response(JSON.stringify({ error: msg, run_id: run.id }), {
        status: httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("workflow-runner error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
