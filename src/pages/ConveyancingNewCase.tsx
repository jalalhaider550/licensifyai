import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, Home, User, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const WORKFLOW_STEPS = [
  "client_intake", "contract_pack", "searches", "enquiries",
  "mortgage", "report", "exchange", "completion", "post_completion",
];

const WIZARD_STEPS = [
  { key: "property", label: "Property", icon: Home },
  { key: "client", label: "Client", icon: User },
  { key: "basics", label: "Basics", icon: Settings2 },
];

function computeReadiness(data: {
  address: string; price: string; clientName: string;
  tenure: string; mortgageStatus: string;
}) {
  let score = 0;
  if (data.address.trim()) score += 25;
  if (data.price && parseFloat(data.price) > 0) score += 20;
  if (data.clientName.trim()) score += 25;
  if (data.tenure !== "") score += 15;
  if (data.mortgageStatus !== "unknown") score += 15;
  return Math.min(score, 100);
}

export default function ConveyancingNewCase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 - Property
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [price, setPrice] = useState("");
  const [transactionType, setTransactionType] = useState("purchase");

  // Step 2 - Client
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState("buyer");
  const [otherSideName, setOtherSideName] = useState("");
  const [otherSideFirm, setOtherSideFirm] = useState("");

  // Step 3 - Basics
  const [tenure, setTenure] = useState("freehold");
  const [propertyCategory, setPropertyCategory] = useState("residential");
  const [mortgageStatus, setMortgageStatus] = useState("unknown");
  const [targetDate, setTargetDate] = useState("");
  const [estateAgent, setEstateAgent] = useState("");
  const [referralSource, setReferralSource] = useState("");

  const canProceedStep0 = address.trim().length > 0 && price.trim().length > 0 && parseFloat(price) > 0;
  const canProceedStep1 = clientName.trim().length > 0;

  const readiness = computeReadiness({ address, price, clientName, tenure, mortgageStatus });

  const handleCreate = async () => {
    if (!user) return;
    if (!address.trim() || !clientName.trim() || !price.trim() || parseFloat(price) <= 0) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: caseData, error: caseError } = await supabase
        .from("conveyancing_cases" as any)
        .insert({
          user_id: user.id,
          property_address: address.trim(),
          postcode: postcode.trim(),
          price: parseFloat(price),
          transaction_type: transactionType,
          client_name: clientName.trim(),
          client_type: clientType,
          other_side_name: otherSideName.trim(),
          other_side_firm: otherSideFirm.trim(),
          tenure,
          property_category: propertyCategory,
          mortgage_status: mortgageStatus,
          target_completion_date: targetDate || null,
          estate_agent: estateAgent.trim(),
          referral_source: referralSource.trim(),
          readiness_score: readiness,
        } as any)
        .select("id")
        .single();

      if (caseError) throw caseError;
      const caseId = (caseData as any).id;

      // Create workflow steps - buyer vs seller gets different initial missing items
      const isBuyer = clientType === "buyer";
      const stepsMeta: Record<string, string[]> = {
        client_intake: ["Client ID", "Source of funds", "Proof of address"],
        contract_pack: isBuyer ? [] : ["Title deeds", "Property info forms", "Fixtures list"],
        searches: isBuyer ? ["Local authority search", "Environmental search", "Water & drainage"] : [],
        enquiries: isBuyer ? ["Raise enquiries after contract pack received"] : ["Respond to buyer enquiries"],
        mortgage: mortgageStatus === "yes" ? ["Mortgage offer", "Lender requirements"] : [],
        report: isBuyer ? ["Report on title after searches"] : [],
        exchange: ["Signed contract", "Deposit funds"],
        completion: ["Transfer deed", "Completion statement"],
        post_completion: isBuyer ? ["SDLT return", "Land Registry application"] : ["Discharge mortgage", "Notify freeholder"],
      };

      const steps = WORKFLOW_STEPS.map((key) => ({
        case_id: caseId,
        user_id: user.id,
        step_key: key,
        status: "pending",
        missing_items: stepsMeta[key] || [],
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

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {WIZARD_STEPS.map((ws, i) => (
            <div key={ws.key} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => {
                  if (i === 0) setStep(0);
                  else if (i === 1 && canProceedStep0) setStep(1);
                  else if (i === 2 && canProceedStep0 && canProceedStep1) setStep(2);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors w-full justify-center ${
                  step === i ? "bg-primary text-primary-foreground" : step > i ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <ws.icon className="h-3.5 w-3.5" />
                {ws.label}
              </button>
              {i < WIZARD_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {step === 0 && "Property Details"}
              {step === 1 && "Client Details"}
              {step === 2 && "Transaction Basics"}
            </CardTitle>
            <CardDescription>
              {step === 0 && "Address, price, and transaction type"}
              {step === 1 && "Your client and the other side"}
              {step === 2 && "Tenure, mortgage, and timeline — optional fields auto-fill later"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* STEP 0: Property */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Property Address *</Label>
                  <Input placeholder="e.g. 42 King Street, London" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input placeholder="e.g. SW1A 1AA" value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>Price (£) *</Label>
                  <Input type="number" placeholder="e.g. 350000" value={price} onChange={(e) => setPrice(e.target.value)} min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={!canProceedStep0} onClick={() => setStep(1)}>
                  Next: Client <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {/* STEP 1: Client */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input placeholder="Your client's full name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Client Role</Label>
                  <Select value={clientType} onValueChange={setClientType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Other Side — Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="Counterparty name" value={otherSideName} onChange={(e) => setOtherSideName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Other Side — Law Firm <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="Opposing solicitors" value={otherSideFirm} onChange={(e) => setOtherSideFirm(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button className="flex-1" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                    Next: Basics <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* STEP 2: Basics */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tenure</Label>
                    <Select value={tenure} onValueChange={setTenure}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freehold">Freehold</SelectItem>
                        <SelectItem value="leasehold">Leasehold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select value={propertyCategory} onValueChange={setPropertyCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mortgage</Label>
                  <Select value={mortgageStatus} onValueChange={setMortgageStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Completion Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Estate Agent <span className="text-muted-foreground text-xs">(opt)</span></Label>
                    <Input placeholder="Agent name" value={estateAgent} onChange={(e) => setEstateAgent(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Referral <span className="text-muted-foreground text-xs">(opt)</span></Label>
                    <Input placeholder="Referral source" value={referralSource} onChange={(e) => setReferralSource(e.target.value)} />
                  </div>
                </div>

                {/* Readiness preview */}
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Case Readiness</p>
                    <span className="text-xs font-bold text-primary">{readiness}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${readiness}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Missing items will be requested via client intake link after creation.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…</> : "Create Case"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
