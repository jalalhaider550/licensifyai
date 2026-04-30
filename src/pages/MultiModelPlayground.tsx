import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelPicker } from "@/components/app/ModelPicker";
import { runMultiModel } from "@/lib/multiModel";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export default function MultiModelPlayground() {
  const [modelId, setModelId] = useState("lovable-gemini-3-flash");
  const [system, setSystem] = useState("You are a senior commercial solicitor. Respond with precision and no hedging.");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);

  const run = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    setLoading(true);
    setOutput("");
    setMeta(null);
    try {
      const res = await runMultiModel({
        modelId,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      setOutput(res.content);
      setMeta({ provider: res.provider, model: res.model });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold flex items-center gap-2">
            <Sparkles className="h-7 w-7" /> Multi-Model Playground
          </h1>
          <p className="text-muted-foreground mt-1">
            Run prompts against Lovable AI, Anthropic Claude, or Google Gemini directly. Existing AI workflows are unaffected.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Model</label>
              <ModelPicker value={modelId} onChange={setModelId} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">System prompt</label>
              <Textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prompt</label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} placeholder="Ask anything..." />
            </div>
            <Button onClick={run} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</> : "Run"}
            </Button>
          </CardContent>
        </Card>

        {(output || loading) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Output</span>
                {meta && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {meta.provider} · {meta.model}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm font-sans">{output || "..."}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
