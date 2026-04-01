import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User, Shield, Home, Banknote, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STEPS = [
  { num: 1, label: "Personal Info", icon: User },
  { num: 2, label: "Identity", icon: Shield },
  { num: 3, label: "Property", icon: Home },
  { num: 4, label: "Financial", icon: Banknote },
  { num: 5, label: "Final", icon: CheckCircle2 },
];

const SOURCE_OF_FUNDS_OPTIONS = [
  "Salary", "Savings", "Business income", "Gift", "Investment", "Other",
];

interface IntakeFormProps {
  caseId: string;
  caseData: {
    property_address: string;
    postcode: string;
    client_name: string;
    client_type: string;
    price: number;
    tenure: string;
    property_category: string;
    mortgage_status: string;
  };
  /** Override user_id for public/anonymous usage (client-facing link) */
  userId?: string;
  onComplete: () => void;
}

type FormData = {
  full_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  address_postcode: string;
  country: string;
  id_document_type: string;
  id_file: File | null;
  proof_file: File | null;
  client_role: string;
  property_address: string;
  property_postcode: string;
  property_type: string;
  tenure: string;
  transaction_price: string;
  has_mortgage: boolean;
  lender_name: string;
  mortgage_broker: string;
  source_of_funds: string;
  source_funds_file: File | null;
  first_time_buyer: boolean;
  buying_with_another: boolean;
  second_buyer_name: string;
  owns_property_fully: boolean;
  existing_mortgage: boolean;
  existing_lender_name: string;
  property_vacant: boolean;
  lease_years_remaining: string;
  ground_rent: string;
  declaration_confirmed: boolean;
};

export function ConveyancingIntakeForm({ caseId, caseData, userId: userIdProp, onComplete }: IntakeFormProps) {
  const { user } = useAuth();
  const effectiveUserId = userIdProp || user?.id;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    full_name: caseData.client_name || "",
    date_of_birth: "",
    email: "",
    phone: "",
    current_address: "",
    address_postcode: "",
    country: "United Kingdom",
    id_document_type: "",
    id_file: null,
    proof_file: null,
    client_role: caseData.client_type || "buyer",
    property_address: caseData.property_address || "",
    property_postcode: caseData.postcode || "",
    property_type: caseData.property_category || "residential",
    tenure: caseData.tenure || "freehold",
    transaction_price: caseData.price > 0 ? String(caseData.price) : "",
    has_mortgage: caseData.mortgage_status === "yes",
    lender_name: "",
    mortgage_broker: "",
    source_of_funds: "",
    source_funds_file: null,
    first_time_buyer: false,
    buying_with_another: false,
    second_buyer_name: "",
    owns_property_fully: true,
    existing_mortgage: false,
    existing_lender_name: "",
    property_vacant: false,
    lease_years_remaining: "",
    ground_rent: "",
    declaration_confirmed: false,
  });

  // Load existing intake if any
  useEffect(() => {
    if (!effectiveUserId) return;
    (supabase as any)
      .from("conveyancing_client_intake")
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExistingId(data.id);
          setStep(data.current_step || 1);
          setForm((prev) => ({
            ...prev,
            full_name: data.full_name || prev.full_name,
            date_of_birth: data.date_of_birth || "",
            email: data.email || "",
            phone: data.phone || "",
            current_address: data.current_address || "",
            address_postcode: data.address_postcode || "",
            country: data.country || "United Kingdom",
            id_document_type: data.id_document_type || "",
            client_role: data.client_role || prev.client_role,
            property_address: data.property_address || prev.property_address,
            property_postcode: data.property_postcode || prev.property_postcode,
            property_type: data.property_type || prev.property_type,
            tenure: data.tenure || prev.tenure,
            transaction_price: data.transaction_price > 0 ? String(data.transaction_price) : prev.transaction_price,
            has_mortgage: data.has_mortgage ?? prev.has_mortgage,
            lender_name: data.lender_name || "",
            mortgage_broker: data.mortgage_broker || "",
            source_of_funds: data.source_of_funds || "",
            first_time_buyer: data.first_time_buyer ?? false,
            buying_with_another: data.buying_with_another ?? false,
            second_buyer_name: data.second_buyer_name || "",
            owns_property_fully: data.owns_property_fully ?? true,
            existing_mortgage: data.existing_mortgage ?? false,
            existing_lender_name: data.existing_lender_name || "",
            property_vacant: data.property_vacant ?? false,
            lease_years_remaining: data.lease_years_remaining ? String(data.lease_years_remaining) : "",
            ground_rent: data.ground_rent || "",
            declaration_confirmed: data.declaration_confirmed ?? false,
          }));
        }
      });
  }, [user, caseId]);

  const set = (field: keyof FormData, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.full_name.trim() && form.email.trim();
    if (step === 3) return form.property_address.trim();
    if (step === 4) return Number(form.transaction_price) > 0;
    if (step === 5) return form.declaration_confirmed;
    return true;
  };

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const path = `conveyancing/${caseId}/${prefix}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    return path;
  };

  const saveIntake = async (complete: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      // Upload files if present
      let id_document_path: string | null = null;
      let proof_of_address_path: string | null = null;
      let source_of_funds_document_path: string | null = null;

      if (form.id_file) id_document_path = await uploadFile(form.id_file, "id");
      if (form.proof_file) proof_of_address_path = await uploadFile(form.proof_file, "proof");
      if (form.source_funds_file) source_of_funds_document_path = await uploadFile(form.source_funds_file, "funds");

      const payload: Record<string, any> = {
        case_id: caseId,
        user_id: user.id,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        email: form.email,
        phone: form.phone,
        current_address: form.current_address,
        address_postcode: form.address_postcode,
        country: form.country,
        id_document_type: form.id_document_type,
        client_role: form.client_role,
        property_address: form.property_address,
        property_postcode: form.property_postcode,
        property_type: form.property_type,
        tenure: form.tenure,
        transaction_price: Number(form.transaction_price) || 0,
        has_mortgage: form.has_mortgage,
        lender_name: form.lender_name,
        mortgage_broker: form.mortgage_broker,
        source_of_funds: form.source_of_funds,
        first_time_buyer: form.first_time_buyer,
        buying_with_another: form.buying_with_another,
        second_buyer_name: form.second_buyer_name,
        owns_property_fully: form.owns_property_fully,
        existing_mortgage: form.existing_mortgage,
        existing_lender_name: form.existing_lender_name,
        property_vacant: form.property_vacant,
        lease_years_remaining: form.lease_years_remaining ? Number(form.lease_years_remaining) : null,
        ground_rent: form.ground_rent,
        declaration_confirmed: form.declaration_confirmed,
        intake_complete: complete,
        current_step: complete ? 5 : step,
        submitted_at: complete ? new Date().toISOString() : null,
      };

      if (id_document_path) payload.id_document_path = id_document_path;
      if (proof_of_address_path) payload.proof_of_address_path = proof_of_address_path;
      if (source_of_funds_document_path) payload.source_of_funds_document_path = source_of_funds_document_path;

      const db = supabase as any;
      if (existingId) {
        const { error } = await db.from("conveyancing_client_intake").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("conveyancing_client_intake").insert(payload).select("id").single();
        if (error) throw error;
        setExistingId(data.id);
      }

      if (complete) {
        toast.success("Client intake submitted successfully");
        onComplete();
      } else {
        toast.success("Progress saved");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save intake");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step < 5) {
      saveIntake(false);
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!form.declaration_confirmed) {
      toast.error("Please confirm the declaration");
      return;
    }
    saveIntake(true);
  };

  const progressPct = ((step - 1) / 4) * 100;
  const isBuyer = form.client_role === "buyer";

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.num;
          const done = step > s.num;
          return (
            <button
              key={s.num}
              onClick={() => s.num <= step && setStep(s.num)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>
      <Progress value={progressPct} className="h-1.5" />

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="John Smith" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+44 7700 000000" />
            </div>
          </div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">Address</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Current Address</Label>
              <Input value={form.current_address} onChange={(e) => set("current_address", e.target.value)} placeholder="123 High Street, London" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Postcode</Label>
              <Input value={form.address_postcode} onChange={(e) => set("address_postcode", e.target.value)} placeholder="SW1A 1AA" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Country</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Identity */}
      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Identity Verification</h3>
          <div className="space-y-1">
            <Label className="text-xs">ID Document Type</Label>
            <Select value={form.id_document_type} onValueChange={(v) => set("id_document_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="passport">Passport</SelectItem>
                <SelectItem value="driving_license">Driving License</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Upload ID Document</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground hover:bg-muted/50 transition-colors w-full">
                <Upload className="h-4 w-4" />
                {form.id_file ? form.id_file.name : "Choose file (PDF, JPG, PNG)"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => set("id_file", e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Upload Proof of Address</Label>
            <p className="text-[11px] text-muted-foreground">Utility bill or bank statement (within 3 months)</p>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground hover:bg-muted/50 transition-colors w-full">
              <Upload className="h-4 w-4" />
              {form.proof_file ? form.proof_file.name : "Choose file (PDF, JPG, PNG)"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => set("proof_file", e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      )}

      {/* Step 3: Property */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Property Details</h3>
          <div className="space-y-1">
            <Label className="text-xs">Client Role *</Label>
            <Select value={form.client_role} onValueChange={(v) => set("client_role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Property Address *</Label>
              <Input value={form.property_address} onChange={(e) => set("property_address", e.target.value)} placeholder="42 Victoria Road, Manchester" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Postcode</Label>
              <Input value={form.property_postcode} onChange={(e) => set("property_postcode", e.target.value)} placeholder="M1 2AB" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Property Type</Label>
              <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tenure</Label>
              <Select value={form.tenure} onValueChange={(v) => set("tenure", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="freehold">Freehold</SelectItem>
                  <SelectItem value="leasehold">Leasehold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Is Property Vacant?</Label>
              <Select value={form.property_vacant ? "yes" : "no"} onValueChange={(v) => set("property_vacant", v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No — Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.tenure === "leasehold" && (
            <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Lease Years Remaining</Label>
                <Input type="number" value={form.lease_years_remaining} onChange={(e) => set("lease_years_remaining", e.target.value)} placeholder="e.g. 85" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ground Rent (optional)</Label>
                <Input value={form.ground_rent} onChange={(e) => set("ground_rent", e.target.value)} placeholder="e.g. £250/year" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Financial */}
      {step === 4 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Financial Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{isBuyer ? "Purchase" : "Sale"} Price *</Label>
              <Input type="number" value={form.transaction_price} onChange={(e) => set("transaction_price", e.target.value)} placeholder="350000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mortgage?</Label>
              <Select value={form.has_mortgage ? "yes" : "no"} onValueChange={(v) => set("has_mortgage", v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.has_mortgage && (
            <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Lender Name</Label>
                <Input value={form.lender_name} onChange={(e) => set("lender_name", e.target.value)} placeholder="e.g. Nationwide" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mortgage Broker (optional)</Label>
                <Input value={form.mortgage_broker} onChange={(e) => set("mortgage_broker", e.target.value)} />
              </div>
            </div>
          )}

          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">Source of Funds</h4>
          <div className="space-y-1">
            <Label className="text-xs">Primary Source</Label>
            <Select value={form.source_of_funds} onValueChange={(v) => set("source_of_funds", v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {SOURCE_OF_FUNDS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Supporting Document</Label>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground hover:bg-muted/50 transition-colors w-full">
              <Upload className="h-4 w-4" />
              {form.source_funds_file ? form.source_funds_file.name : "Bank statement or proof of savings"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => set("source_funds_file", e.target.files?.[0] || null)} />
            </label>
          </div>

          {isBuyer && (
            <div className="border-t border-border pt-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buyer Info</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">First-time Buyer?</Label>
                  <Select value={form.first_time_buyer ? "yes" : "no"} onValueChange={(v) => set("first_time_buyer", v === "yes")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Buying with someone else?</Label>
                  <Select value={form.buying_with_another ? "yes" : "no"} onValueChange={(v) => set("buying_with_another", v === "yes")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.buying_with_another && (
                <div className="space-y-1">
                  <Label className="text-xs">Second Buyer Name</Label>
                  <Input value={form.second_buyer_name} onChange={(e) => set("second_buyer_name", e.target.value)} />
                </div>
              )}
            </div>
          )}

          {!isBuyer && (
            <div className="border-t border-border pt-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seller Info</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Own property fully?</Label>
                  <Select value={form.owns_property_fully ? "yes" : "no"} onValueChange={(v) => set("owns_property_fully", v === "yes")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Existing Mortgage?</Label>
                  <Select value={form.existing_mortgage ? "yes" : "no"} onValueChange={(v) => set("existing_mortgage", v === "yes")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.existing_mortgage && (
                <div className="space-y-1">
                  <Label className="text-xs">Existing Lender</Label>
                  <Input value={form.existing_lender_name} onChange={(e) => set("existing_lender_name", e.target.value)} placeholder="e.g. HSBC" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Final */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Declaration & Submit</h3>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Please review your details before submitting.</p>
            <div className="grid gap-1.5 text-xs">
              <p><span className="font-medium text-foreground">Name:</span> {form.full_name}</p>
              <p><span className="font-medium text-foreground">Email:</span> {form.email}</p>
              <p><span className="font-medium text-foreground">Property:</span> {form.property_address}</p>
              <p><span className="font-medium text-foreground">Role:</span> <Badge variant="secondary" className="text-[10px] capitalize">{form.client_role}</Badge></p>
              <p><span className="font-medium text-foreground">Price:</span> £{Number(form.transaction_price).toLocaleString()}</p>
              <p><span className="font-medium text-foreground">Mortgage:</span> {form.has_mortgage ? "Yes" : "No"}</p>
              <p><span className="font-medium text-foreground">Source of Funds:</span> {form.source_of_funds || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="declaration"
              checked={form.declaration_confirmed}
              onCheckedChange={(c) => set("declaration_confirmed", !!c)}
            />
            <label htmlFor="declaration" className="text-xs text-muted-foreground leading-snug cursor-pointer">
              I confirm that the information provided is accurate and complete to the best of my knowledge.
            </label>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={prevStep} disabled={step === 1 || saving}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">Step {step} of 5</span>
        {step < 5 ? (
          <Button size="sm" onClick={nextStep} disabled={!canProceed() || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSubmit} disabled={!form.declaration_confirmed || saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Submit Intake
          </Button>
        )}
      </div>
    </div>
  );
}
