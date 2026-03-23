import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ClientInfoRequestDialogProps {
  open: boolean;
  saving: boolean;
  itemLabel?: string;
  itemCount?: number;
  values: {
    title: string;
    requestMessage: string;
    instructions: string;
  };
  onOpenChange: (open: boolean) => void;
  onValueChange: (field: "title" | "requestMessage" | "instructions", value: string) => void;
  onSubmit: () => void;
}

export const ClientInfoRequestDialog = ({
  open,
  saving,
  itemLabel,
  itemCount = itemLabel ? 1 : 0,
  values,
  onOpenChange,
  onValueChange,
  onSubmit,
}: ClientInfoRequestDialogProps) => {
  const itemDescriptor = itemLabel || (itemCount > 1 ? `${itemCount} missing items` : "this missing item");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{itemCount > 1 ? "Request missing information" : "Request from Client"}</DialogTitle>
          <DialogDescription>
            Generate a secure link for {itemDescriptor} so the client can upload files, add details, and submit notes without logging in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Request title</label>
            <Input value={values.title} onChange={(event) => onValueChange("title", event.target.value)} placeholder="Request supporting documents" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Client message</label>
            <Textarea
              value={values.requestMessage}
              onChange={(event) => onValueChange("requestMessage", event.target.value)}
              rows={4}
              placeholder="Please provide the requested documents using the secure link below."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Instructions</label>
            <Textarea
              value={values.instructions}
              onChange={(event) => onValueChange("instructions", event.target.value)}
              rows={6}
              placeholder="Explain exactly what the client should upload or clarify."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving || !values.title.trim() || !values.requestMessage.trim()}>
            {saving ? "Generating link…" : itemCount > 1 ? "Generate client link for all items" : "Generate client link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
