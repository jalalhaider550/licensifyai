import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Mic, Square, Upload, Search, Trash2, Sparkles, Clock, FileAudio, Circle, Loader2,
} from "lucide-react";
import {
  Meeting, listMeetings, createMeeting, appendTranscript, addSegment,
  transcribeChunk, generateMeetingNotes, deleteMeeting, searchMeetings, getMeeting,
} from "@/lib/meetings";

const CHUNK_MS = 8000;

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [recMeetingId, setRecMeetingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const refresh = async () => {
    try { setMeetings(await listMeetings()); } catch (e) { console.error(e); }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const meeting = await createMeeting({ title: `Meeting ${new Date().toLocaleString()}`, source: "live" });
      setRecMeetingId(meeting.id);
      setElapsed(0);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      chunkStartRef.current = 0;

      recorder.ondataavailable = async (e) => {
        if (!e.data || e.data.size < 500) return;
        const start = chunkStartRef.current;
        const end = start + CHUNK_MS / 1000;
        chunkStartRef.current = end;
        try {
          const text = await transcribeChunk(e.data);
          if (text && text.trim()) {
            await appendTranscript(meeting.id, text, CHUNK_MS / 1000);
            await addSegment(meeting.id, text, start, end);
            await refresh();
          }
        } catch (err) {
          console.error("chunk transcribe failed", err);
        }
      };

      recorder.start(CHUNK_MS);
      setRecording(true);
      toast({ title: "Recording started", description: "Speak naturally — transcription happens every few seconds." });
      await refresh();
    } catch (e) {
      console.error(e);
      toast({ title: "Microphone error", description: "Could not access microphone.", variant: "destructive" });
    }
  };

  const stopRecording = async () => {
    const id = recMeetingId;
    try {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) { console.error(e); }
    setRecording(false);
    setRecMeetingId(null);
    if (id) {
      toast({ title: "Recording stopped", description: "Generating structured notes…" });
      try {
        setGenerating(true);
        const updated = await generateMeetingNotes(id);
        setSelected(updated);
        await refresh();
        toast({ title: "Notes ready" });
      } catch (e) {
        toast({ title: "Notes failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
      } finally {
        setGenerating(false);
      }
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const meeting = await createMeeting({ title: file.name, source: "upload" });
      const text = await transcribeChunk(file);
      await appendTranscript(meeting.id, text, 0);
      await addSegment(meeting.id, text, 0, 0);
      const updated = await generateMeetingNotes(meeting.id);
      setSelected(updated);
      await refresh();
      toast({ title: "Recording processed" });
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    try { setMeetings(await searchMeetings(query)); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meeting and its transcript?")) return;
    await deleteMeeting(id);
    if (selected?.id === id) setSelected(null);
    await refresh();
  };

  const openMeeting = async (id: string) => {
    const m = await getMeeting(id);
    setSelected(m);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Meeting Intelligence</h1>
          <p className="text-sm text-muted-foreground">Record live conversations or upload recordings — get structured legal notes automatically.</p>
        </header>

        {/* Controls */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            {!recording ? (
              <Button onClick={startRecording} disabled={uploading || generating}>
                <Mic className="h-4 w-4 mr-2" /> Start live recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive">
                <Square className="h-4 w-4 mr-2" /> Stop ({fmtTime(elapsed)})
              </Button>
            )}

            <label className="inline-flex">
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                disabled={recording || uploading || generating}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
              />
              <Button asChild variant="outline" disabled={recording || uploading || generating}>
                <span><Upload className="h-4 w-4 mr-2" /> {uploading ? "Processing…" : "Upload recording"}</span>
              </Button>
            </label>

            {recording && (
              <span className="inline-flex items-center gap-2 text-sm text-destructive font-medium">
                <Circle className="h-3 w-3 fill-destructive animate-pulse" /> Recording — your mic is active
              </span>
            )}
            {generating && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating notes…
              </span>
            )}
          </div>
        </Card>

        {/* Search */}
        <div className="flex gap-2">
          <Input placeholder="Search transcripts, summaries, titles…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* List */}
          <div className="space-y-2">
            {meetings.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground text-center">No meetings yet.</Card>
            )}
            {meetings.map((m) => (
              <Card
                key={m.id}
                className={`p-4 cursor-pointer transition hover:border-primary ${selected?.id === m.id ? "border-primary" : ""}`}
                onClick={() => openMeeting(m.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{m.source}</Badge>
                      <Badge variant={m.status === "ready" ? "default" : m.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{m.status}</Badge>
                      <span className="inline-flex items-center text-[11px] text-muted-foreground gap-1"><Clock className="h-3 w-3" />{fmtTime(m.duration_seconds)}</span>
                    </div>
                    {m.tldr && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.tldr}</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Detail */}
          <div>
            {!selected ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                <FileAudio className="h-8 w-8 mx-auto mb-3 opacity-50" />
                Select a meeting to view its transcript and AI-generated notes.
              </Card>
            ) : (
              <MeetingDetail meeting={selected} onRegenerate={async () => {
                setGenerating(true);
                try { const u = await generateMeetingNotes(selected.id); setSelected(u); await refresh(); }
                catch (e) { toast({ title: "Failed", description: e instanceof Error ? e.message : "", variant: "destructive" }); }
                finally { setGenerating(false); }
              }} regenerating={generating} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MeetingDetail({ meeting, onRegenerate, regenerating }: { meeting: Meeting; onRegenerate: () => void; regenerating: boolean }) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">{meeting.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(meeting.created_at).toLocaleString()} · {meeting.source}
              {meeting.case_type ? ` · ${meeting.case_type}` : ""}
              {meeting.jurisdiction ? ` · ${meeting.jurisdiction}` : ""}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
            Regenerate notes
          </Button>
        </div>

        {meeting.tldr && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">TL;DR</p>
            <p className="text-sm">{meeting.tldr}</p>
          </div>
        )}
      </Card>

      <Section title="Key Discussion Points" items={meeting.key_points} />
      <ListSection title="Action Items" items={meeting.action_items.map((a) => `${a.title}${a.owner ? ` — ${a.owner}` : ""}${a.due ? ` (due ${a.due})` : ""}`)} />
      <ListSection title="Deadlines" items={meeting.deadlines.map((d) => `${d.description}${d.date ? ` — ${d.date}` : ""}`)} />
      <ListSection title="Parties Involved" items={meeting.parties.map((p) => `${p.name}${p.role ? ` (${p.role})` : ""}`)} />
      <Section title="Legal Issues Identified" items={meeting.legal_issues} />
      <ListSection title="Legal Risks" items={meeting.legal_risks.map((r) => `${r.risk}${r.severity ? ` [${r.severity}]` : ""}`)} />
      <Section title="Important Facts" items={meeting.important_facts} />

      {meeting.detailed_summary && (
        <Card className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detailed Summary</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{meeting.detailed_summary}</p>
        </Card>
      )}

      {meeting.lawyer_brief && (
        <Card className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Lawyer-Ready Brief</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{meeting.lawyer_brief}</p>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Full Transcript</p>
        <Textarea value={meeting.transcript} readOnly className="min-h-[200px] text-xs font-mono" />
      </Card>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Card className="p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <ul className="space-y-1.5 text-sm list-disc pl-5">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </Card>
  );
}
function ListSection({ title, items }: { title: string; items: string[] }) {
  return <Section title={title} items={items} />;
}
