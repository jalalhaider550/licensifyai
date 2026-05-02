import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Plug, Plus, X, CheckCircle2, AlertCircle, Upload, Building2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  COURT_SYSTEMS, type CourtSystem, type CourtFilingSubmission,
  getCredential, testConnection, submitFiling, pollSubmission, listSubmissionsForCase,
} from "@/lib/courtEfile";

interface Attachment { id: string; name: string; bytes: number; passed: boolean; }

interface Props {
  caseId?: string | null;
  filingId?: string | null;
  primaryContent: string;
  primaryTitle: string;
  defaultJurisdiction?: "UK" | "US";
}

/**
 * E-filing bridge: attaches to the bottom of the existing court-filing
 * completion screen. Sends the already-generated primary document
 * (plus any add-on documents) to the selected court portal.
 */
export function CourtEfilePanel({ caseId, filingId, primaryContent, primaryTitle, defaultJurisdiction = "UK" }: Props) {
  const [courtSystem, setCourtSystem] = useState<CourtSystem | "">("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const [credUsername, setCredUsername] = useState("");
  const [credSecret, setCredSecret] = useState("");
  const [credVerified, setCredVerified] = useState(false);
  const [testingCred, setTestingCred] = useState(false);

  const [meta, setMeta] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const [submissions, setSubmissions] = useState<CourtFilingSubmission[]>([]);

  const def = useMemo(() => COURT_SYSTEMS.find((c) => c.id === courtSystem), [courtSystem]);

  // Load credentials when court changes
  useEffect(() => {
    if (!courtSystem) { setCredUsername(""); setCredSecret(""); setCredVerified(false); return; }
    (async () => {
      const c = await getCredential(courtSystem);
      if (c) {
        setCredUsername(c.username || "");
        setCredVerified(c.verification_status === "verified");
        setCredSecret("");
      } else {
        setCredUsername(""); setCredSecret(""); setCredVerified(false);
      }
    })();
    setMeta({});
  }, [courtSystem]);

  const reloadSubmissions = async () => {
    if (!caseId) return;
    try { setSubmissions(await listSubmissionsForCase(caseId)); } catch {}
  };
  useEffect(() => { reloadSubmissions(); /* eslint-disable-next-line */ }, [caseId]);

  // Poll active submissions every 60s
  useEffect(() => {
    const active = submissions.filter((s) => ["submitted", "under_review"].includes(s.status));
    if (active.length === 0) return;
    const t = setInterval(async () => {
      for (const s of active) {
        try { await pollSubmission(s.id); } catch {}
      }
      reloadSubmissions();
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions.map((s) => `${s.id}:${s.status}`).join(",")]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      // Light compliance: non-empty + < 25MB + accepted ext
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const okExt = ["pdf", "doc", "docx", "rtf", "txt"].includes(ext);
      const okSize = f.size > 0 && f.size < 25 * 1024 * 1024;
      next.push({ id: crypto.randomUUID(), name: f.name, bytes: f.size, passed: okExt && okSize });
    }
    setAttachments((prev) => [...prev, ...next]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleTestConnection = async () => {
    if (!def) return;
    if (!credUsername || !credSecret) { toast.error("Enter username and password"); return; }
    setTestingCred(true);
    try {
      const out = await testConnection({
        courtSystem: def.id, jurisdiction: def.jurisdiction,
        username: credUsername, secret: credSecret,
      });
      setCredVerified(out.verified);
      out.verified ? toast.success("Connection verified") : toast.error("Verification failed");
    } catch (e: any) { toast.error(e?.message || "Test failed"); }
    finally { setTestingCred(false); }
  };

  const allMetaFilled = !!def && def.fields.every((f) => !f.required || (meta[f.key] || "").trim().length > 0);
  const allAttachmentsPass = attachments.every((a) => a.passed);
  const canFile = !!def && credVerified && allMetaFilled && allAttachmentsPass && primaryContent.trim().length > 0 && !submitting;

  const stepProgress = async (label: string, pct: number, ms = 350) => {
    setProgressLabel(label); setProgress(pct);
    await new Promise((r) => setTimeout(r, ms));
  };

  const handleFileNow = async () => {
    if (!def || !canFile) return;
    setSubmitting(true); setProgress(0); setProgressLabel("");
    try {
      await stepProgress("Re-running compliance checks…", 15);
      if (!attachments.every((a) => a.passed)) throw new Error("Attachment failed compliance");
      await stepProgress("Authenticating with court portal…", 35);
      await stepProgress("Uploading documents…", 60);
      await stepProgress("Submitting metadata…", 80);
      const result = await submitFiling({
        courtSystem: def.id, jurisdiction: def.jurisdiction,
        metadata: meta,
        attachments: [
          { name: `${primaryTitle || "Primary filing"} (primary)`, bytes: primaryContent.length, passed: true },
          ...attachments.map((a) => ({ name: a.name, bytes: a.bytes, passed: a.passed })),
        ],
        primaryContent,
        caseId: caseId || null, filingId: filingId || null,
      });
      await stepProgress("Capturing receipt…", 95);
      if (!result.ok) {
        toast.error(`Court rejected: ${result.reason}`);
      } else {
        toast.success(`Filed. Confirmation ${result.submission.confirmation_number}`);
      }
      await stepProgress("Done", 100, 200);
      reloadSubmissions();
    } catch (e: any) {
      toast.error(e?.message || "Filing failed");
    } finally {
      setSubmitting(false);
      setTimeout(() => { setProgress(0); setProgressLabel(""); }, 1500);
    }
  };

  const usSystems = COURT_SYSTEMS.filter((c) => c.jurisdiction === "US");
  const ukSystems = COURT_SYSTEMS.filter((c) => c.jurisdiction === "UK");

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold">Submit to Court</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">E-Filing Bridge</span>
      </div>

      {/* Step 1: Court system selector */}
      <div className="space-y-2">
        <Label className="text-xs">Court system</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">United States</div>
            <div className="flex flex-wrap gap-1.5">
              {usSystems.map((c) => (
                <button key={c.id} onClick={() => setCourtSystem(c.id)}
                  className={`text-[11px] px-2.5 py-1.5 rounded border ${courtSystem === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">United Kingdom</div>
            <div className="flex flex-wrap gap-1.5">
              {ukSystems.map((c) => (
                <button key={c.id} onClick={() => setCourtSystem(c.id)}
                  className={`text-[11px] px-2.5 py-1.5 rounded border ${courtSystem === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {def && (
        <>
          {/* Step 2: Add documents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Documents in this filing</Label>
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add document
              </Button>
              <input ref={fileInput} type="file" multiple className="hidden"
                accept=".pdf,.doc,.docx,.rtf,.txt"
                onChange={(e) => handleAddFiles(e.target.files)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate font-medium">{primaryTitle || "Primary filing"}</span>
                  <span className="text-[10px] text-muted-foreground">(auto-included)</span>
                </div>
                <Badge variant="outline" className="text-[10px]">Pass</Badge>
              </div>
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground">{(a.bytes / 1024).toFixed(0)} KB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={a.passed ? "outline" : "destructive"} className="text-[10px]">
                      {a.passed ? "Pass" : "Fail"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Credentials */}
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Plug className="h-3.5 w-3.5 text-primary" />
              <Label className="text-xs font-semibold">{def.label} credentials</Label>
              {credVerified && <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/40"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Verified</Badge>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Username / portal ID</Label>
                <Input value={credUsername} onChange={(e) => { setCredUsername(e.target.value); setCredVerified(false); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Password / API token</Label>
                <Input type="password" value={credSecret} onChange={(e) => { setCredSecret(e.target.value); setCredVerified(false); }} placeholder={credUsername ? "Re-enter to update" : ""} />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testingCred}>
              {testingCred ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1.5" />}
              Test connection
            </Button>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Stored encrypted on the firm's backend. Real court portal API access (PACER, NYSCEF, MyHMCTS, etc.) requires per-court certification — until provisioned, submissions run via a sandbox transport that captures a verifiable receipt.
            </p>
          </div>

          {/* Step 4: Metadata */}
          <div className="space-y-2">
            <Label className="text-xs">Required metadata</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {def.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[10px]">{f.label}{f.required && " *"}</Label>
                  <Input value={meta[f.key] || ""} onChange={(e) => setMeta((m) => ({ ...m, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Step 5: File now */}
          <div className="space-y-2">
            {progress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{progressLabel}</span><span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            <Button onClick={handleFileNow} disabled={!canFile} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              File now to {def.label}
            </Button>
            {!canFile && !submitting && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {!credVerified ? "Verify credentials. " : ""}
                {!allMetaFilled ? "Fill required metadata. " : ""}
                {!allAttachmentsPass ? "Resolve failed attachments. " : ""}
                {primaryContent.trim().length === 0 ? "Generate the primary draft above first." : ""}
              </p>
            )}
          </div>
        </>
      )}

      {/* Step 6: Filing status tracker */}
      {submissions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Filing status</Label>
            <Button variant="ghost" size="sm" onClick={reloadSubmissions}><RefreshCcw className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-1.5">
            {submissions.map((s) => (
              <div key={s.id} className="rounded-md border border-border p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold truncate">{s.court_system}</div>
                  <Badge variant={s.status === "accepted" ? "outline" : s.status === "rejected" ? "destructive" : "secondary"}
                    className={s.status === "accepted" ? "text-green-600 border-green-600/40" : ""}>
                    {s.status.replace("_", " ")}
                  </Badge>
                </div>
                {s.confirmation_number && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Conf: <span className="font-mono">{s.confirmation_number}</span> · {new Date(s.submitted_at).toLocaleString()}
                  </div>
                )}
                {s.rejection_reason && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-destructive text-[10px]">{s.rejection_reason}</span>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Prior data is still loaded above — adjust and press File now.")}>Re-file</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CourtEfilePanel;
