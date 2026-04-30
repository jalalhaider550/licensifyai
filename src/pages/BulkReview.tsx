import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import {
  BulkReview,
  BulkReviewColumn,
  BulkReviewRow,
  listBulkReviews,
  getBulkReview,
  createBulkReview,
  updateBulkReview,
  deleteBulkReview,
  runBulkReviewCell,
} from "@/lib/bulkReview";

export default function BulkReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (id) return <BulkReviewDetail id={id} onBack={() => navigate("/bulk-review")} />;

  return <BulkReviewList onOpen={(rid) => navigate(`/bulk-review/${rid}`)} />;
}

function BulkReviewList({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<BulkReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { setItems(await listBulkReviews()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const r = await createBulkReview({ name, description });
      setCreateOpen(false);
      setName(""); setDescription("");
      onOpen(r.id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Bulk Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Spreadsheet-style document review. Add rows, define AI columns, extract data at scale.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New review</Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center bg-muted/30 border-dashed">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">No bulk reviews yet. Create one to start.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((r) => (
              <Card key={r.id} className="p-4 flex items-center gap-4 hover:border-primary/40 cursor-pointer" onClick={() => onOpen(r.id)}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{r.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.description || "No description"} · {r.rows.length} rows · {r.columns.length} columns</p>
                </div>
                <Button size="sm" variant="ghost" onClick={async (e) => { e.stopPropagation(); await deleteBulkReview(r.id); refresh(); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New bulk review</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name (e.g. Q3 Contract Audit)" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function BulkReviewDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [review, setReview] = useState<BulkReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyCells, setBusyCells] = useState<Record<string, boolean>>({});

  useEffect(() => { (async () => setReview(await getBulkReview(id)))(); }, [id]);

  const persist = async (next: BulkReview) => {
    setReview(next);
    setSaving(true);
    try { await updateBulkReview(id, next); } finally { setSaving(false); }
  };

  const addColumn = () => {
    if (!review) return;
    const col: BulkReviewColumn = { id: crypto.randomUUID(), name: `Column ${review.columns.length + 1}`, prompt: "Extract..." };
    persist({ ...review, columns: [...review.columns, col] });
  };

  const updateColumn = (cid: string, patch: Partial<BulkReviewColumn>) => {
    if (!review) return;
    persist({ ...review, columns: review.columns.map((c) => c.id === cid ? { ...c, ...patch } : c) });
  };

  const deleteColumn = (cid: string) => {
    if (!review) return;
    persist({
      ...review,
      columns: review.columns.filter((c) => c.id !== cid),
      rows: review.rows.map((r) => {
        const v = { ...r.values }; delete v[cid]; return { ...r, values: v };
      }),
    });
  };

  const addRow = () => {
    if (!review) return;
    const row: BulkReviewRow = { id: crypto.randomUUID(), label: `Row ${review.rows.length + 1}`, content: "", values: {} };
    persist({ ...review, rows: [...review.rows, row] });
  };

  const updateRow = (rid: string, patch: Partial<BulkReviewRow>) => {
    if (!review) return;
    persist({ ...review, rows: review.rows.map((r) => r.id === rid ? { ...r, ...patch } : r) });
  };

  const deleteRow = (rid: string) => {
    if (!review) return;
    persist({ ...review, rows: review.rows.filter((r) => r.id !== rid) });
  };

  const runCell = async (rid: string, cid: string) => {
    if (!review) return;
    const row = review.rows.find((r) => r.id === rid);
    const col = review.columns.find((c) => c.id === cid);
    if (!row || !col) return;
    if (!row.content.trim()) { toast.error("Add row content first"); return; }
    if (!col.prompt.trim()) { toast.error("Set a column prompt first"); return; }
    const key = `${rid}:${cid}`;
    setBusyCells((b) => ({ ...b, [key]: true }));
    try {
      const value = await runBulkReviewCell({ row_content: row.content, column_prompt: col.prompt });
      const next = { ...review, rows: review.rows.map((r) => r.id === rid ? { ...r, values: { ...r.values, [cid]: value } } : r) };
      await persist(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.toLowerCase().includes("payment") || msg.includes("402")) toast.error("AI credits exhausted. Top up to continue.");
      else if (msg.toLowerCase().includes("rate") || msg.includes("429")) toast.error("Rate limit. Try again shortly.");
      else toast.error(msg);
    } finally {
      setBusyCells((b) => ({ ...b, [key]: false }));
    }
  };

  const runAll = async () => {
    if (!review) return;
    for (const row of review.rows) {
      for (const col of review.columns) {
        if (!row.values[col.id] && row.content.trim() && col.prompt.trim()) {
          await runCell(row.id, col.id);
        }
      }
    }
  };

  if (!review) return <AppShell><div className="p-8 text-sm text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back</Button>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <Input value={review.name} onChange={(e) => persist({ ...review, name: e.target.value })} className="font-display text-xl font-bold border-0 px-0 h-auto focus-visible:ring-0" />
            <Textarea value={review.description} onChange={(e) => persist({ ...review, description: e.target.value })} placeholder="Description…" rows={1} className="mt-1 border-0 px-0 text-xs text-muted-foreground focus-visible:ring-0 resize-none" />
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            <Button size="sm" variant="outline" onClick={addColumn}><Plus className="mr-1 h-3.5 w-3.5" />Column</Button>
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-1 h-3.5 w-3.5" />Row</Button>
            <Button size="sm" onClick={runAll}><Sparkles className="mr-1 h-3.5 w-3.5" />Run all</Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left p-2 font-medium w-32 border-r">Row</th>
                <th className="text-left p-2 font-medium w-72 border-r">Content</th>
                {review.columns.map((c) => (
                  <th key={c.id} className="text-left p-2 font-medium border-r min-w-[220px]">
                    <div className="flex items-start gap-1">
                      <div className="flex-1 space-y-1">
                        <Input value={c.name} onChange={(e) => updateColumn(c.id, { name: e.target.value })} className="h-7 text-xs font-semibold" />
                        <Textarea value={c.prompt} onChange={(e) => updateColumn(c.id, { prompt: e.target.value })} rows={2} className="text-[10px] resize-none" placeholder="Prompt…" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteColumn(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {review.rows.length === 0 && (
                <tr><td colSpan={review.columns.length + 3} className="p-8 text-center text-muted-foreground">No rows. Click "+ Row" to add one.</td></tr>
              )}
              {review.rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="p-2 border-r align-top">
                    <Input value={r.label} onChange={(e) => updateRow(r.id, { label: e.target.value })} className="h-7 text-xs" />
                  </td>
                  <td className="p-2 border-r align-top">
                    <Textarea value={r.content} onChange={(e) => updateRow(r.id, { content: e.target.value })} rows={3} className="text-xs resize-none" placeholder="Paste content…" />
                  </td>
                  {review.columns.map((c) => {
                    const key = `${r.id}:${c.id}`;
                    const busy = busyCells[key];
                    const val = r.values[c.id] || "";
                    return (
                      <td key={c.id} className="p-2 border-r align-top">
                        <div className="space-y-1">
                          <pre className="text-[11px] whitespace-pre-wrap text-foreground/90 font-sans min-h-[40px]">{val || <span className="text-muted-foreground italic">empty</span>}</pre>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => runCell(r.id, c.id)} disabled={busy}>
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="mr-1 h-3 w-3" />Run</>}
                          </Button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 align-top">
                    <Button size="sm" variant="ghost" onClick={() => deleteRow(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
