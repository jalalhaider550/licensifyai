import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_OUTPUT_RULES = `
DOCUMENT OUTPUT RULES — APPLY TO ALL GENERATED DOCUMENTS:
1. NEVER use quotation marks (double or single) in document output.
2. NEVER output JSON, code blocks, or structured data markup in documents.
3. NEVER include the words: draft, confidence, caveats, uncertain, caveat, follow-up questions, or internal reasoning.
4. NEVER ask questions inside the document body.
5. NEVER expose missing data issues or uncertainty in the document text.
6. ALWAYS assume reasonable facts where minor details are missing — do not flag gaps in the document itself.
7. ALWAYS produce a complete, client-ready document with a strong professional legal tone.
8. ALWAYS structure output with clear headings and paragraphs.
9. Output must be clean, final, and ready to send to a client or opposing party.
10. HEADING FORMAT — MANDATORY:
    - NEVER use any markdown symbols in headings — no ###, ##, #, and no ** asterisks.
    - ALL headings must be plain numbered text only.
    - Correct format: 1. Background, 2. Legal Position, 3. Demand, 4. Next Steps
    - Maintain consistent sequential numbering throughout the entire document.
    - Sub-sections use decimal numbering: 1.1, 1.2, 2.1, etc.
    - NEVER mix heading styles — every heading in the document must follow this format.`;

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "-");

const parseJsonContent = (value: string) => {
  try {
    const jsonMatch = value.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(value);
  } catch {
    return {};
  }
};

const refreshCaseContext = async ({
  lovableApiKey,
  caseRow,
  requestRow,
  requestItems,
  submissionNotes,
  submittedItems,
}: {
  lovableApiKey: string;
  caseRow: Record<string, any>;
  requestRow: Record<string, any>;
  requestItems: Record<string, any>[];
  submissionNotes: string;
  submittedItems: Record<string, any>[];
}) => {
  const systemPrompt = `You are a practising senior commercial solicitor (England & Wales qualified, 15+ years PQE) updating a matter file after receiving a client response to an information request. You process information decisively, draw conclusions, and update the case with authority. You do not hedge or add disclaimers. 

MANDATORY RULES:
1. Use precise legal terminology throughout. Material facts should be legally significant facts that affect liability, quantum, or strategy.
2. The updated case summary must reflect the new information's impact on the legal position — not just acknowledge receipt.
3. The client summary must be in plain English suitable for a non-lawyer client.
4. Remaining missing items must include specific legal reasoning for why each is still needed.
5. Progress percentage must realistically reflect matter readiness — receiving documents alone does not complete a matter.
6. If the submitted information reveals new legal issues or changes the case strategy, flag this in the key facts.
7. Do not hallucinate. If the submitted information is unclear or incomplete, note this.
8. Return ONLY valid JSON.`;
  const userPrompt = `Case type: ${caseRow.case_type || "general_legal"}\nCase title: ${caseRow.title || ""}\nCurrent case summary: ${caseRow.case_summary || ""}\nCurrent client summary: ${caseRow.client_summary || ""}\nCurrent key facts: ${JSON.stringify(caseRow.key_facts || [], null, 2)}\nCurrent missing items: ${JSON.stringify(caseRow.ai_context?.missingItems || [], null, 2)}\nRequest title: ${requestRow.title || ""}\nRequest instructions: ${requestRow.instructions || ""}\nRequested items: ${JSON.stringify(requestItems, null, 2)}\nClient submission notes: ${submissionNotes || ""}\nSubmitted items: ${JSON.stringify(submittedItems, null, 2)}\n\nReturn JSON exactly like:\n{\n  "summary": "updated professional summary",\n  "clientSummary": "short plain-English update for the client",\n  "keyFacts": ["fact 1", "fact 2"],\n  "missingItems": [\n    {\n      "label": "Upload signed agreement",\n      "actionLabel": "Upload now",\n      "actionType": "upload_document",\n      "priority": "high",\n      "documentCategory": "agreement",\n      "why": "Explain why the item is still required."\n    }\n  ],\n  "progressPercentage": 75,\n  "status": "In Progress"\n}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt + "\n\n" + DOCUMENT_OUTPUT_RULES },
        { role: "user", content: userPrompt },
      ],
      reasoning: { effort: "medium" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("case-info-request ai error:", response.status, text);
    throw new Error("Failed to refresh case context");
  }

  const data = await response.json();
  return parseJsonContent(data.choices?.[0]?.message?.content || "{}");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const body = await req.json();
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    if (body.action === "get-request") {
      const requestToken = body.requestToken;
      if (!requestToken) {
        return new Response(JSON.stringify({ error: "Request token is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: requestRow } = await service
        .from("case_info_requests")
        .select("*")
        .eq("token", requestToken)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!requestRow) {
        return new Response(JSON.stringify({ error: "This request link is invalid or has expired." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [{ data: items }, { data: caseRow }] = await Promise.all([
        service.from("case_info_request_items").select("*").eq("request_id", requestRow.id).order("sort_order", { ascending: true }),
        service.from("cases").select("id, title, client_name").eq("id", requestRow.case_id).single(),
      ]);

      const nextStatus = requestRow.status === "requested" ? "pending" : requestRow.status;
      if (nextStatus !== requestRow.status) {
        await service.from("case_info_requests").update({ status: nextStatus }).eq("id", requestRow.id);
      }

      return new Response(
        JSON.stringify({
          request: {
            ...requestRow,
            status: nextStatus,
            case_title: caseRow?.title || "Case",
            client_name: caseRow?.client_name || "Client",
            items: items || [],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "submit-request") {
      const requestToken = body.requestToken;
      if (!requestToken) {
        return new Response(JSON.stringify({ error: "Request token is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: requestRow } = await service
        .from("case_info_requests")
        .select("*")
        .eq("token", requestToken)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!requestRow) {
        return new Response(JSON.stringify({ error: "This request link is invalid or has expired." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [{ data: requestItems }, { data: caseRow }] = await Promise.all([
        service.from("case_info_request_items").select("*").eq("request_id", requestRow.id).order("sort_order", { ascending: true }),
        service.from("cases").select("*").eq("id", requestRow.case_id).single(),
      ]);

      const itemMap = new Map((requestItems || []).map((item: any) => [item.id, item]));
      const submittedItems: Record<string, any>[] = [];

      for (const submittedItem of body.items || []) {
        const itemRow = itemMap.get(submittedItem.id);
        if (!itemRow) continue;

        const responseText = typeof submittedItem.responseText === "string" ? submittedItem.responseText.trim() : "";
        const attachment = submittedItem.attachment;
        let attachmentSummary: Record<string, any> | null = null;

        if (attachment?.fileData && attachment?.fileName) {
          const safeName = sanitizeFileName(attachment.fileName);
          const storagePath = `${requestRow.user_id}/case-info-requests/${requestRow.client_id}/${requestRow.case_id}/${requestRow.id}/${Date.now()}-${safeName}`;
          const bytes = decodeBase64(attachment.fileData);
          const { error: uploadError } = await service.storage.from("documents").upload(storagePath, bytes, {
            contentType: attachment.contentType || "application/octet-stream",
            upsert: false,
          });

          if (uploadError) throw uploadError;

          await service.from("case_documents").insert({
            case_id: requestRow.case_id,
            user_id: requestRow.user_id,
            name: attachment.fileName,
            document_category: itemRow.document_category || "supporting",
            file_type: attachment.contentType || null,
            storage_path: storagePath,
            raw_text: String(attachment.extractedText || "").slice(0, 20000),
            ai_status: attachment.extractedText ? "processed" : "pending",
            uploaded_by: "client",
            client_visible: true,
            metadata: {
              source: "case-info-request",
              request_id: requestRow.id,
              request_item_id: itemRow.id,
            },
          });

          attachmentSummary = {
            name: attachment.fileName,
            contentType: attachment.contentType || null,
            extractedText: String(attachment.extractedText || "").slice(0, 4000),
          };
        }

        if (!responseText && !attachmentSummary) continue;

        const combinedResponse = [responseText].filter(Boolean).join("\n\n");

        await service
          .from("case_info_request_items")
          .update({
            status: "received",
            response_text: combinedResponse || null,
            metadata: {
              ...(itemRow.metadata || {}),
              request_id: requestRow.id,
              request_item_id: itemRow.id,
              attachment: attachmentSummary,
            },
          })
          .eq("id", itemRow.id);

        await service
          .from("case_actions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("case_id", requestRow.case_id)
          .contains("metadata", { request_item_id: itemRow.id });

        submittedItems.push({
          id: itemRow.id,
          label: itemRow.label,
          description: itemRow.description,
          requestType: itemRow.request_type,
          documentCategory: itemRow.document_category,
          responseText,
          attachment: attachmentSummary,
        });
      }

      const submissionNotes = typeof body.submissionNotes === "string" ? body.submissionNotes.trim() : "";
      if (!submittedItems.length && !submissionNotes) {
        return new Response(JSON.stringify({ error: "No information was submitted." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const receivedItemIds = new Set(submittedItems.map((item) => item.id));
      const hasOutstandingItems = (requestItems || []).some((item: any) => !receivedItemIds.has(item.id) && item.status !== "received");
      const nextStatus = hasOutstandingItems ? "pending" : "received";
      const submittedAt = new Date().toISOString();

      await service
        .from("case_info_requests")
        .update({
          status: nextStatus,
          submitted_at: submittedAt,
          submission_notes: submissionNotes || null,
          submitted_data: {
            items: submittedItems,
            notes: submissionNotes,
          },
        })
        .eq("id", requestRow.id);

      const refreshedContext = await refreshCaseContext({
        lovableApiKey: LOVABLE_API_KEY,
        caseRow,
        requestRow,
        requestItems: requestItems || [],
        submissionNotes,
        submittedItems,
      });

      await service
        .from("cases")
        .update({
          case_summary: refreshedContext.summary || caseRow.case_summary,
          client_summary: refreshedContext.clientSummary || caseRow.client_summary,
          key_facts: Array.isArray(refreshedContext.keyFacts) ? refreshedContext.keyFacts : caseRow.key_facts,
          progress_percentage:
            typeof refreshedContext.progressPercentage === "number"
              ? refreshedContext.progressPercentage
              : caseRow.progress_percentage,
          status: refreshedContext.status || caseRow.status,
          ai_context: {
            ...(caseRow.ai_context || {}),
            missingItems: Array.isArray(refreshedContext.missingItems)
              ? refreshedContext.missingItems
              : caseRow.ai_context?.missingItems || [],
            lastClientSubmissionAt: submittedAt,
            lastClientSubmission: {
              request_id: requestRow.id,
              items: submittedItems,
              notes: submissionNotes,
            },
          },
          intake_data: {
            ...(caseRow.intake_data || {}),
            latest_client_request_submission: {
              request_id: requestRow.id,
              items: submittedItems,
              notes: submissionNotes,
              submitted_at: submittedAt,
            },
          },
        })
        .eq("id", caseRow.id);

      await service.from("case_activities").insert({
        case_id: requestRow.case_id,
        user_id: requestRow.user_id,
        activity_type: "client_submission",
        title: "Client submitted requested information",
        content: `${submittedItems.length} requested item${submittedItems.length === 1 ? "" : "s"} received through the secure client request form.`,
        metadata: {
          request_id: requestRow.id,
          status: nextStatus,
        },
        client_visible: false,
      });

      return new Response(JSON.stringify({ success: true, status: nextStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("case-info-request error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
