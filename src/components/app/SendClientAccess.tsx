import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link2, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SendClientAccessProps {
  clientId: string;
  clientName: string;
}

export const SendClientAccess = ({ clientId, clientName }: SendClientAccessProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingToken, setExistingToken] = useState<any>(null);

  useEffect(() => {
    if (!open || !user) return;
    checkExistingToken();
  }, [open, user]);

  const checkExistingToken = async () => {
    const { data } = await supabase
      .from("client_access_tokens")
      .select("*")
      .eq("client_id", clientId)
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setExistingToken(data);
      setPortalLink(`${window.location.origin}/portal?token=${data.token}`);
    }
  };

  const generateLink = async () => {
    if (!user) return;
    setLoading(true);

    // Deactivate old tokens
    await supabase
      .from("client_access_tokens")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("user_id", user.id);

    const { data, error } = await supabase
      .from("client_access_tokens")
      .insert({ client_id: clientId, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error("Failed to generate access link");
      setLoading(false);
      return;
    }

    const link = `${window.location.origin}/portal?token=${data.token}`;
    setPortalLink(link);
    setExistingToken(data);
    setLoading(false);
    toast.success("Client access link generated!");
  };

  const copyLink = () => {
    if (!portalLink) return;
    navigator.clipboard.writeText(portalLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-1 h-4 w-4" /> Send Client Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Client Portal Access</DialogTitle>
          <DialogDescription className="text-xs">
            Generate a secure link for <strong>{clientName}</strong> to submit their data and documents directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {portalLink ? (
            <>
              <div className="flex gap-2">
                <Input value={portalLink} readOnly className="text-xs font-mono" />
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 30 days. Share it with your client via email.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={generateLink} disabled={loading}>
                  {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Regenerate Link
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <a href={portalLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" /> Preview Portal
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={generateLink} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}
              Generate Access Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
