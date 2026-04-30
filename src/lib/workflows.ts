import { supabase } from "@/integrations/supabase/client";

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  use_previous_output: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  default_model: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  case_id: string | null;
  status: "pending" | "running" | "completed" | "failed";
  input_context: string;
  step_results: Array<{ step_id: string; name: string; output: string }>;
  final_output: string;
  error_message: string | null;
  model_used: string | null;
  created_at: string;
  completed_at: string | null;
}

export const PRESET_TEMPLATES: Array<Omit<Workflow, "id" | "created_at" | "updated_at" | "is_favorite">> = [
  {
    name: "Contract Risk Triage",
    description: "Identify obligations, risks, and missing protective clauses in any contract.",
    category: "review",
    default_model: "google/gemini-2.5-flash",
    steps: [
      { id: "1", name: "Extract obligations", prompt: "List every obligation in the contract — for each, state who owes what, the trigger, and the deadline. Plain numbered list.", use_previous_output: false },
      { id: "2", name: "Identify risks", prompt: "Identify the top 10 commercial and legal risks in the contract. Rank by severity. Plain numbered list.", use_previous_output: false },
      { id: "3", name: "Suggest protective clauses", prompt: "Based on the risks above, suggest specific protective clauses or amendments to add. Provide drafted clause language.", use_previous_output: true },
    ],
  },
  {
    name: "Case Strategy Memo",
    description: "Build a strategic memo: facts, issues, options, recommendation.",
    category: "strategy",
    default_model: "google/gemini-2.5-pro",
    steps: [
      { id: "1", name: "Summarise facts", prompt: "Produce a chronological factual summary suitable for a senior partner briefing. Plain text, numbered.", use_previous_output: false },
      { id: "2", name: "Identify legal issues", prompt: "Identify each legal issue raised by the facts. For each, state the applicable law and burden of proof.", use_previous_output: false },
      { id: "3", name: "Strategic options", prompt: "Set out 3 strategic options with pros, cons, cost, and time to resolution.", use_previous_output: true },
      { id: "4", name: "Recommendation", prompt: "Make a single decisive recommendation with reasoning. No hedging.", use_previous_output: true },
    ],
  },
  {
    name: "Compliance Gap Analysis",
    description: "Compare client documents against regulatory requirements.",
    category: "compliance",
    default_model: "google/gemini-2.5-flash",
    steps: [
      { id: "1", name: "Extract client controls", prompt: "List all controls, policies, and procedures evidenced in the input.", use_previous_output: false },
      { id: "2", name: "Map to regulations", prompt: "Map each control to the relevant regulatory requirement. Highlight gaps.", use_previous_output: true },
      { id: "3", name: "Remediation plan", prompt: "Produce a prioritised remediation plan with owners and timelines.", use_previous_output: true },
    ],
  },
];

export async function listWorkflows(): Promise<Workflow[]> {
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Workflow[];
}

export async function createWorkflow(input: Partial<Workflow>): Promise<Workflow> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("workflows")
    .insert({
      user_id: userData.user.id,
      name: input.name || "Untitled workflow",
      description: input.description || "",
      category: input.category || "general",
      steps: (input.steps || []) as never,
      default_model: input.default_model || "google/gemini-2.5-flash",
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Workflow;
}

export async function updateWorkflow(id: string, patch: Partial<Workflow>): Promise<void> {
  const updatePayload: Record<string, unknown> = { ...patch };
  if (patch.steps) updatePayload.steps = patch.steps;
  const { error } = await supabase.from("workflows").update(updatePayload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase.from("workflows").delete().eq("id", id);
  if (error) throw error;
}

export async function runWorkflow(params: {
  workflow_id: string;
  input_context: string;
  case_id?: string;
  model_override?: string;
}): Promise<WorkflowRun> {
  const { data, error } = await supabase.functions.invoke("workflow-runner", {
    body: params,
  });
  if (error) throw new Error(error.message || "Workflow failed");
  if (data?.error) throw new Error(data.error);
  return data as WorkflowRun;
}

export async function listRuns(workflowId?: string): Promise<WorkflowRun[]> {
  let query = supabase.from("workflow_runs").select("*").order("created_at", { ascending: false }).limit(50);
  if (workflowId) query = query.eq("workflow_id", workflowId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as WorkflowRun[];
}
