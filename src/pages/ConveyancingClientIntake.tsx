import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ConveyancingIntakeForm } from "@/components/app/ConveyancingIntakeForm";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertTriangle, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ConveyancingClientIntake() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError("No intake token provided.");
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data, error: fetchErr } = await (supabase as any)
        .rpc("get_conveyancing_case_by_token", { _token: token });
      const row = Array.isArray(data) ? data[0] : data;

      if (fetchErr || !row) {
        setError("This intake link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setCaseData({ ...row, intake_token: token });
      setLoading(false);
    };

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Thank you!</h2>
            <p className="text-sm text-muted-foreground">
              Your information has been submitted. Your solicitor will review it and follow up if anything else is needed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Home className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Client Intake Form</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Please complete the information below for <strong>{caseData.property_address}</strong>.
        </p>

        <ConveyancingIntakeForm
          caseId={caseData.id}
          userId={caseData.user_id}
          intakeToken={token!}
          caseData={{
            property_address: caseData.property_address,
            postcode: caseData.postcode,
            client_name: caseData.client_name,
            client_type: caseData.client_type,
            price: caseData.price,
            tenure: caseData.tenure,
            property_category: caseData.property_category,
            mortgage_status: caseData.mortgage_status,
          }}
          onComplete={() => setSubmitted(true)}
        />
      </div>
    </div>
  );
}
