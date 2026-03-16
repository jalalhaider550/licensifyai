import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: () => void;
}

export const AddClientDialog = ({ open, onOpenChange, onClientAdded }: AddClientDialogProps) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("UK");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      company_name: companyName.trim(),
      jurisdiction,
      contact_email: contactEmail.trim() || null,
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to add client: " + error.message);
    } else {
      toast.success("Client added successfully");
      setCompanyName("");
      setContactEmail("");
      onOpenChange(false);
      onClientAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="NeoBank Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="rounded-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Jurisdiction</Label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="US">United States</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="legal@company.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
