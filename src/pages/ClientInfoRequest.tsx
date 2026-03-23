import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Loader2, Shield, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/documentParser";
import { getCaseInfoRequestStatusClasses, getCaseInfoRequestStatusLabel } from "@/lib/caseInfoRequests";

interface RequestItemState {
  responseText: string;
  file: File | null;
}

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const ClientInfoRequest = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [itemState, setItemState] = useState<Record<string, RequestItemState>>({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadRequest = async () => {
      if (!token) {
        setError("Invalid request link.");
        setLoading(false);
        return;
      }

      const { data, error: requestError } = await supabase.functions.invoke("case-info-request", {
        body: { action: "get-request", requestToken: token },
      });

      if (requestError || !data?.request) {
        setError(requestError?.message || "This request link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setRequestData(data.request);
      setSubmitted(data.request.status === "received");
      setItemState(
        (data.request.items || []).reduce((acc: Record<string, RequestItemState>, item: any) => {
          acc[item.id] = { responseText: item.response_text || "", file: null };
          return acc;
        }, {}),
      );
      setLoading(false);
    };

    loadRequest();
  }, [token]);

  const hasSubmissionContent = useMemo(
    () =>
      Object.values(itemState).some((item) => item.responseText.trim() || item.file) ||
      Boolean(submissionNotes.trim()),
    [itemState, submissionNotes],
  );

  const handleSubmit = async () => {
    if (!token || !requestData) return;
    if (!hasSubmissionContent) {
      toast.error("Add the requested information, upload a file, or leave notes before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const payloadItems = (
        await Promise.all(
          (requestData.items || []).map(async (item: any) => {
            const state = itemState[item.id] || { responseText: "", file: null };
            const responseText = state.responseText.trim();
            const file = state.file;

            if (!responseText && !file) return null;

            const attachment = file
              ? {
                  fileName: file.name,
                  contentType: file.type,
                  fileData: await readFileAsBase64(file),
                  extractedText: await extractTextFromFile(file).catch(() => ""),
                }
              : undefined;

            return {
              id: item.id,
              responseText,
              attachment,
            };
          }),
        )
      ).filter(Boolean);

      const { error: submitError } = await supabase.functions.invoke("case-info-request", {
        body: {
          action: "submit-request",
          requestToken: token,
          submissionNotes: submissionNotes.trim(),
          items: payloadItems,
        },
      });

      if (submitError) throw submitError;

      setSubmitted(true);
      setRequestData((current: any) => (current ? { ...current, status: "received" } : current));
      toast.success("Your information was submitted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit information");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !requestData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" /> Invalid or expired link
            </CardTitle>
            <CardDescription>{error || "This request could not be found."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{requestData.title}</CardTitle>
                <CardDescription className="mt-2">
                  {requestData.case_title} · {requestData.client_name}
                </CardDescription>
              </div>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${getCaseInfoRequestStatusClasses(requestData.status)}`}>
                {getCaseInfoRequestStatusLabel(requestData.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-foreground">{requestData.request_message}</p>
              {requestData.instructions ? <p className="mt-2 text-sm text-muted-foreground">{requestData.instructions}</p> : null}
            </div>

            {submitted ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">
                Thank you — your files and information have been received and added to the case.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {(requestData.items || []).map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getCaseInfoRequestStatusClasses(item.status)}`}>
                          {getCaseInfoRequestStatusLabel(item.status)}
                        </span>
                      </div>

                      <Textarea
                        value={itemState[item.id]?.responseText || ""}
                        onChange={(event) =>
                          setItemState((current) => ({
                            ...current,
                            [item.id]: {
                              ...(current[item.id] || { file: null }),
                              responseText: event.target.value,
                            },
                          }))
                        }
                        rows={4}
                        placeholder="Add the requested details here"
                      />

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                          <Upload className="h-4 w-4" /> Upload file
                          <Input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              setItemState((current) => ({
                                ...current,
                                [item.id]: {
                                  ...(current[item.id] || { responseText: "" }),
                                  file,
                                },
                              }));
                            }}
                          />
                        </label>
                        {itemState[item.id]?.file ? (
                          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" /> {itemState[item.id]?.file?.name}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Additional notes</label>
                  <Textarea value={submissionNotes} onChange={(event) => setSubmissionNotes(event.target.value)} rows={4} placeholder="Add any extra context for your legal team" />
                </div>

                <Button onClick={handleSubmit} disabled={submitting || !hasSubmissionContent}>
                  {submitting ? "Submitting…" : "Submit information"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientInfoRequest;
