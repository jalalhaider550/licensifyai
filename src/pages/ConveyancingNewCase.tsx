import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const WORKFLOW_STEPS = [
  "client_intake", "contract_pack", "searches", "enquiries",
  "mortgage", "report", "exchange", "completion", "post_completion",
];

export default function ConveyancingNewCase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState("");
  const [clientType, setClientType] = useState("buyer");
  const [price, setPrice] = useState("");

  const handleCreate = async () => {
    if (!user || !address.trim()) {
      toast({ title: "Property address is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: caseData, error: caseError } = await supabase
        .from("conveyancing_cases" as any)
        .insert({
          user_id: user.id,
          property_address: address.trim(),
          client_type: clientType,
          price: parseFloat(price) || 0,
        } as any)
        .select("id")
        .single();

      if (caseError) throw caseError;
      const caseId = (caseData as any).id;

      // Create all workflow steps
      const steps = WORKFLOW_STEPS.map((key, i) => ({
        case_id: caseId,
        user_id: user.id,
        step_key: key,
        status: i === 0 ? "pending" : "pending",
      }));

      const { error: stepsError } = await supabase
        .from("conveyancing_steps" as any)
        .insert(steps as any);

      if (stepsError) throw stepsError;

      toast({ title: "Case created" });
      navigate(`/conveyancing/${caseId}`);
    } catch (err: any) {
      toast({ title: "Error creating case", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-lg mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/conveyancing")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Start Conveyancing Case</CardTitle>
            <CardDescription>Enter the basic property details. Everything else auto-fills later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="address">Property Address *</Label>
              <Input id="address" placeholder="e.g. 42 King Street, London SW1A 1AA" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Client Type</Label>
              <Select value={clientType} onValueChange={setClientType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (£)</Label>
              <Input id="price" type="number" placeholder="e.g. 350000" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <Button onClick={handleCreate} disabled={saving || !address.trim()} className="w-full">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…</> : "Create Case"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
