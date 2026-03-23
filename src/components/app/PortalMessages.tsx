import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/documentParser";

interface PortalMessagesProps {
  clientId: string;
  caseId?: string;
}

export const PortalMessages = ({ clientId, caseId }: PortalMessagesProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`lawyer-messages-${clientId}-${caseId || "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portal_messages", filter: `client_id=eq.${clientId}` }, (payload) => {
        if (caseId && payload.new.case_id !== caseId) return;
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, caseId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    let query = supabase
      .from("portal_messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    const { data } = await query;

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    const { error } = await supabase.from("portal_messages").insert({
      client_id: clientId,
      case_id: caseId || null,
      sender_type: "lawyer",
      sender_name: "Legal team",
      message: msgText.trim(),
      attachments: [],
    });
    if (error) { toast.error("Failed to send"); setSending(false); return; }
    setMsgText("");
    setSending(false);
  };

  const handleAttachmentUpload = async (file: File) => {
    if (!file) return;
    setAttachmentBusy(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const extractedText = await extractTextFromFile(file).catch(() => "");
      const { data, error } = await supabase.functions.invoke("case-collaboration", {
        body: {
          action: "upload-file",
          target: "message_attachment",
          clientId,
          caseId: caseId || null,
          fileName: file.name,
          contentType: file.type,
          fileData: base64,
          extractedText,
        },
      });

      if (error) throw error;

      const { error: messageError } = await supabase.from("portal_messages").insert({
        client_id: clientId,
        case_id: caseId || null,
        sender_type: "lawyer",
        sender_name: "Legal team",
        message: `Attached ${file.name}`,
        attachments: [data.attachment],
      });

      if (messageError) throw messageError;
      toast.success("Attachment sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send attachment");
    } finally {
      setAttachmentBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openAttachment = async (storagePath: string) => {
    const { data, error } = await supabase.functions.invoke("case-collaboration", {
      body: { action: "get-download-url", clientId, caseId: caseId || null, storagePath },
    });

    if (error) {
      toast.error("Failed to open attachment");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Client Messages</h3>
        {messages.length > 0 && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{messages.length}</span>
        )}
      </div>
      <div className="h-64 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_type === "lawyer" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.sender_type === "lawyer"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              <p>{msg.message}</p>
              {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {msg.attachments.map((attachment: any, index: number) => (
                    <button
                      key={`${msg.id}-${index}`}
                      type="button"
                      onClick={() => openAttachment(attachment.storage_path)}
                      className="block text-left text-xs underline underline-offset-2"
                    >
                      {attachment.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <p className={`text-[10px] mt-1 ${msg.sender_type === "lawyer" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAttachmentUpload(file); }} />
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={attachmentBusy}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Reply to client..."
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <Button size="sm" onClick={sendMessage} disabled={sending || !msgText.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
