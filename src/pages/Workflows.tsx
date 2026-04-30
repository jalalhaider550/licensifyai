import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Play, Trash2, Sparkles, Loader2, ChevronRight } from "lucide-react";
import {
  Workflow,
  WorkflowStep,
  PRESET_TEMPLATES,
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  runWorkflow,
} from "@/lib/workflows";

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (deep)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "openai/gpt-5", label: "GPT-5 (reasoning)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [running, setRunning] = useState<Workflow | null>(null);
  const [runInput, setRunInput] = useState("");
  const [runOutput, setRunOutput] = useState<{ name: string; output: string }[]>([]);
  const [runLoading, setRunLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setWorkflows(await listWorkflows());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const installPreset = async (preset: typeof PRESET_TEMPLATES[number]) => {
    try {
      await createWorkflow(preset);
      toast.success(`Added "${preset.name}"`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const newBlank = async () => {
    const wf = await createWorkflow({
      name: "New workflow",
      description: "",
      steps: [{ id: crypto.randomUUID(), name: "Step 1", prompt: "", use_previous_output: false }],
    });
    setEditing(wf);
    refresh();
  };

  const saveEditing = async () => {
    if (!editing) return;
    await updateWorkflow(editing.id, {
      name: editing.name,
      description: editing.description,
      steps: editing.steps,
      default_model: editing.default_model,
    });
    toast.success("Saved");
    setEditing(null);
    refresh();
  };

  const removeStep = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== idx) });
  };
  const addStep = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      steps: [...editing.steps, { id: crypto.randomUUID(), name: `Step ${editing.steps.length + 1}`, prompt: "", use_previous_output: true }],
    });
  };
  const updateStep = (idx: number, patch: Partial<WorkflowStep>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      steps: editing.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });
  };

  const executeRun = async () => {
    if (!running) return;
    setRunLoading(true);
    setRunOutput([]);
    try {
      const result = await runWorkflow({
        workflow_id: running.id,
        input_context: runInput,
      });
      setRunOutput(result.step_results || []);
      toast.success("Workflow completed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("402") || msg.toLowerCase().includes("payment")) {
        toast.error("AI credits exhausted. Top up to continue.");
      } else if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
        toast.error("Rate limit reached. Try again shortly.");
      } else {
        toast.error(msg);
      }
    } finally {
      setRunLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Workflows</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reusable AI task presets. Chain steps together to automate repetitive legal work.
            </p>
          </div>
          <Button onClick={newBlank}>
            <Plus className="mr-2 h-4 w-4" /> New workflow
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {workflows.length === 0 && (
              <Card className="p-6 mb-8 bg-muted/30 border-dashed">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Start with a preset</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {PRESET_TEMPLATES.map((p) => (
                    <Card key={p.name} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{p.name}</h3>
                        <Badge variant="secondary" className="text-[10px]">{p.steps.length} steps</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{p.description}</p>
                      <Button size="sm" variant="outline" onClick={() => installPreset(p)} className="w-full">Install</Button>
                    </Card>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid gap-3">
              {workflows.map((wf) => (
                <Card key={wf.id} className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{wf.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{wf.steps.length} steps</Badge>
                      <Badge variant="secondary" className="text-[10px]">{wf.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{wf.description || "No description"}</p>
                  </div>
                  <Button size="sm" variant="default" onClick={() => { setRunning(wf); setRunInput(""); setRunOutput([]); }}>
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Run
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(wf)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await deleteWorkflow(wf.id); refresh(); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>

            {workflows.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-base font-semibold mb-3">Add another preset</h2>
                <div className="grid gap-2 md:grid-cols-3">
                  {PRESET_TEMPLATES.map((p) => (
                    <Button key={p.name} variant="outline" size="sm" onClick={() => installPreset(p)} className="justify-start">
                      <Plus className="mr-2 h-3.5 w-3.5" /> {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit workflow</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium">Name</label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Description</label>
                  <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <label className="text-xs font-medium">Default model</label>
                  <Select value={editing.default_model} onValueChange={(v) => setEditing({ ...editing, default_model: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium">Steps</label>
                    <Button size="sm" variant="outline" onClick={addStep}><Plus className="mr-1 h-3 w-3" />Add step</Button>
                  </div>
                  <div className="space-y-3">
                    {editing.steps.map((s, idx) => (
                      <Card key={s.id} className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{idx + 1}</Badge>
                          <Input value={s.name} onChange={(e) => updateStep(idx, { name: e.target.value })} className="flex-1" placeholder="Step name" />
                          <Button size="sm" variant="ghost" onClick={() => removeStep(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                        <Textarea value={s.prompt} onChange={(e) => updateStep(idx, { prompt: e.target.value })} placeholder="Prompt for this step…" rows={3} />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={s.use_previous_output} onChange={(e) => updateStep(idx, { use_previous_output: e.target.checked })} />
                          Use previous step output as input
                        </label>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEditing}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Run dialog */}
        <Dialog open={!!running} onOpenChange={(o) => !o && setRunning(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Run: {running?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium">Input context</label>
                <Textarea value={runInput} onChange={(e) => setRunInput(e.target.value)} rows={6} placeholder="Paste the document, facts, or context for this workflow…" />
              </div>
              <Button onClick={executeRun} disabled={runLoading || !runInput.trim()}>
                {runLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running…</> : <><Play className="mr-2 h-4 w-4" />Execute</>}
              </Button>
              {runOutput.length > 0 && (
                <div className="space-y-3 mt-4">
                  {runOutput.map((r, i) => (
                    <Card key={i} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ChevronRight className="h-3.5 w-3.5 text-primary" />
                        <h4 className="font-semibold text-sm">{r.name}</h4>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap text-foreground/90 font-sans">{r.output}</pre>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
