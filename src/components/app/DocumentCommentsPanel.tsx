import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment, listComments, resolveComment } from "@/lib/firmWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  caseId: string;
  documentType: string;
  documentId: string;
}

export function DocumentCommentsPanel({ caseId, documentType, documentId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const list = await listComments(documentType, documentId);
    setComments(list);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`comments:${documentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_comments", filter: `document_id=eq.${documentId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [documentId]);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addComment({ case_id: caseId, document_type: documentType, document_id: documentId, body: body.trim() });
      setBody("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
        <MessageSquare className="h-4 w-4" /> Comments
      </div>
      <div className="divide-y max-h-72 overflow-auto">
        {comments.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground">No comments yet.</div>}
        {comments.map((c) => (
          <div key={c.id} className={`px-4 py-2.5 text-xs ${c.resolved ? "opacity-50" : ""}`}>
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{c.author_name}</span>
              <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              {c.resolved && <span className="ml-1 text-emerald-600">resolved</span>}
              <div className="ml-auto flex gap-1">
                {!c.resolved && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => resolveComment(c.id).then(refresh)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {(c.author_user_id === user?.id) && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteComment(c.id).then(refresh)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{c.body}</div>
          </div>
        ))}
      </div>
      <div className="border-t p-3 space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Leave a comment…" rows={2} />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
