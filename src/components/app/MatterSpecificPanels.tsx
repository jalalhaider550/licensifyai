import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, Calendar, ChevronDown, ChevronUp, FileText,
  Gavel, Plus, Scale, Search, Shield, Trash2,
} from "lucide-react";
import type { CaseDeadline, CaseRisk, LitigationData, CorporateData } from "@/lib/cases";

/* ── Risk Engine Panel ── */
export function RiskPanel({ risks, onAdd, onRemove }: {
  risks: CaseRisk[];
  onAdd: (risk: CaseRisk) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", level: "MEDIUM" as CaseRisk["level"], category: "", description: "", mitigation: "" });

  const highCount = risks.filter(r => r.level === "HIGH").length;
  const medCount = risks.filter(r => r.level === "MEDIUM").length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Risk Engine</h3>
        </div>
        <div className="flex gap-1.5">
          {highCount > 0 && <Badge variant="destructive" className="text-[10px]">{highCount} HIGH</Badge>}
          {medCount > 0 && <Badge variant="secondary" className="text-[10px] text-yellow-600">{medCount} MED</Badge>}
          <Badge variant="outline" className="text-[10px]">{risks.length} total</Badge>
        </div>
      </div>

      {risks.map((risk) => (
        <div key={risk.id} className="rounded-lg border bg-background p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant={risk.level === "HIGH" ? "destructive" : risk.level === "MEDIUM" ? "secondary" : "outline"} className="text-[10px]">
                  {risk.level}
                </Badge>
                <span className="text-xs text-muted-foreground">{risk.category}</span>
              </div>
              <p className="text-xs font-medium text-foreground">{risk.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{risk.description}</p>
              {risk.mitigation && <p className="text-xs text-primary mt-1">Mitigation: {risk.mitigation}</p>}
            </div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => onRemove(risk.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <Input placeholder="Risk title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="text-xs h-8" />
          <div className="flex gap-2">
            <select className="flex-1 rounded border px-2 py-1 text-xs bg-background" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as CaseRisk["level"] }))}>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="flex-1 text-xs h-8" />
          </div>
          <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-xs" />
          <Input placeholder="Mitigation (optional)" value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} className="text-xs h-8" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              if (!form.title.trim()) return;
              onAdd({ ...form, id: crypto.randomUUID(), detectedAt: new Date().toISOString() });
              setForm({ title: "", level: "MEDIUM", category: "", description: "", mitigation: "" });
              setAdding(false);
            }}>Add Risk</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Add Risk
        </Button>
      )}
    </div>
  );
}

/* ── Deadline Tracker ── */
export function DeadlinePanel({ deadlines, onAdd, onRemove, onComplete }: {
  deadlines: CaseDeadline[];
  onAdd: (d: CaseDeadline) => void;
  onRemove: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", type: "milestone" as CaseDeadline["type"] });

  const sorted = [...deadlines].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const overdue = sorted.filter(d => d.status !== "completed" && new Date(d.date) < new Date());

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Deadlines</h3>
        </div>
        {overdue.length > 0 && <Badge variant="destructive" className="text-[10px]">{overdue.length} overdue</Badge>}
      </div>

      {sorted.map((d) => {
        const isOverdue = d.status !== "completed" && new Date(d.date) < new Date();
        return (
          <div key={d.id} className={`rounded-lg border p-2.5 flex items-center gap-2 ${isOverdue ? "border-destructive/40 bg-destructive/5" : d.status === "completed" ? "opacity-60" : "bg-background"}`}>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${d.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{d.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString()}</span>
                <Badge variant="outline" className="text-[9px] capitalize">{d.type}</Badge>
              </div>
            </div>
            {d.status !== "completed" && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => onComplete(d.id)}>Done</Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onRemove(d.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <Input placeholder="Deadline title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="text-xs h-8" />
          <div className="flex gap-2">
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="flex-1 text-xs h-8" />
            <select className="flex-1 rounded border px-2 py-1 text-xs bg-background" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CaseDeadline["type"] }))}>
              <option value="court">Court</option>
              <option value="filing">Filing</option>
              <option value="milestone">Milestone</option>
              <option value="limitation">Limitation</option>
              <option value="contractual">Contractual</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              if (!form.title.trim() || !form.date) return;
              onAdd({ ...form, id: crypto.randomUUID(), status: "upcoming" });
              setForm({ title: "", date: "", type: "milestone" });
              setAdding(false);
            }}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Add Deadline
        </Button>
      )}
    </div>
  );
}

/* ── Litigation Panel ── */
export function LitigationPanel({ data, onChange }: {
  data: LitigationData;
  onChange: (data: LitigationData) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    { key: "timeline", label: "Case Timeline", icon: Calendar, items: data.timeline },
    { key: "evidence", label: "Evidence Tracker", icon: Search, items: data.evidence },
    { key: "filings", label: "Court Filings", icon: FileText, items: data.filings },
    { key: "courtDates", label: "Court Dates", icon: Gavel, items: data.courtDates },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Litigation Workspace</h3>
      </div>

      {sections.map(({ key, label, icon: Icon, items }) => (
        <div key={key} className="rounded-lg border">
          <button className="w-full flex items-center justify-between px-3 py-2 text-left" onClick={() => toggle(key)}>
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">{label}</span>
              <Badge variant="outline" className="text-[9px]">{(items as any[])?.length || 0}</Badge>
            </div>
            {collapsed[key] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
          </button>
          {!collapsed[key] && (items as any[])?.length > 0 && (
            <div className="px-3 pb-2.5 space-y-1.5">
              {(items as any[]).map((item, i) => (
                <div key={i} className="rounded bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                  {Object.entries(item).map(([k, v]) => (
                    <span key={k} className="mr-3"><strong className="text-foreground">{k}:</strong> {String(v)}</span>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!collapsed[key] && (!(items as any[]) || (items as any[]).length === 0) && (
            <p className="px-3 pb-2.5 text-xs text-muted-foreground">No items yet. AI will populate this as the case progresses.</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Corporate / Due Diligence Panel ── */
export function CorporatePanel({ data, onChange }: {
  data: CorporateData;
  onChange: (data: CorporateData) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    { key: "dueDiligence", label: "Due Diligence", icon: Search, items: data.dueDiligence },
    { key: "obligations", label: "Obligations Tracker", icon: AlertTriangle, items: data.obligations },
    { key: "entities", label: "Entity Structure", icon: Scale, items: data.entities },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Corporate Workspace</h3>
      </div>

      {sections.map(({ key, label, icon: Icon, items }) => (
        <div key={key} className="rounded-lg border">
          <button className="w-full flex items-center justify-between px-3 py-2 text-left" onClick={() => toggle(key)}>
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">{label}</span>
              <Badge variant="outline" className="text-[9px]">{(items as any[])?.length || 0}</Badge>
            </div>
            {collapsed[key] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
          </button>
          {!collapsed[key] && (items as any[])?.length > 0 && (
            <div className="px-3 pb-2.5 space-y-1.5">
              {(items as any[]).map((item, i) => (
                <div key={i} className="rounded bg-muted/50 px-2.5 py-1.5 text-xs">
                  {Object.entries(item).map(([k, v]) => (
                    <span key={k} className="mr-3 text-muted-foreground">
                      <strong className="text-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!collapsed[key] && (!(items as any[]) || (items as any[]).length === 0) && (
            <p className="px-3 pb-2.5 text-xs text-muted-foreground">No items yet. Upload documents or run AI to populate.</p>
          )}
        </div>
      ))}
    </div>
  );
}
