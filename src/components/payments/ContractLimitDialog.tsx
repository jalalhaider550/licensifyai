import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

interface ContractLimitDialogProps {
  open: boolean;
  onClose: () => void;
  used: number;
  limit: number;
  bonus: number;
}

export const ContractLimitDialog = ({ open, onClose, used, limit, bonus }: ContractLimitDialogProps) => {
  const { user } = useAuth();
  const { openCheckout, checkoutElement, isOpen: checkoutOpen } = useStripeCheckout();
  const [launching, setLaunching] = useState(false);

  const handleTopUp = () => {
    setLaunching(true);
    openCheckout({
      priceId: "contract_topup_10",
      customerEmail: user?.email,
      userId: user?.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&topup=1`,
      metadata: { price_id: "contract_topup_10" },
    });
    setLaunching(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">You have reached your plan limit</DialogTitle>
          <DialogDescription className="text-center">
            You've used {used} of {limit + bonus} contracts this billing cycle.
          </DialogDescription>
        </DialogHeader>

        {checkoutOpen ? (
          <div className="rounded-lg border border-border bg-card p-3">{checkoutElement}</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-sm text-muted-foreground">Top up instantly</p>
              <p className="font-display text-2xl font-bold text-foreground mt-1">
                10 extra contracts — £20
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Added to your current billing cycle. Resets at next renewal.
              </p>
              <Button className="w-full mt-4" onClick={handleTopUp} disabled={launching}>
                {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy 10 extra contracts"}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              licensifyai@gmail.com
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
