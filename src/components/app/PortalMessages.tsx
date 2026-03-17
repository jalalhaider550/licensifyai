import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface PortalMessagesProps {
  clientId: string;
}

export const PortalMessages = ({ clientId }: PortalMessagesProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`lawyer-messages-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portal_messages", filter: `client_id=eq.${clientId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("portal_messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    const { error } = await supabase.from("portal_messages").insert({
      client_id: clientId,
      sender_type: "lawyer",
      message: msgText.trim(),
    });
    if (error) { toast.error("Failed to send"); setSending(false); return; }
    setMsgText("");
    setSending(false);
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
              <p className={`text-[10px] mt-1 ${msg.sender_type === "lawyer" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
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
