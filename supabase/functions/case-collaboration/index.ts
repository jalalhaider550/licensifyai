import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "-");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const body = await req.json();
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    let userId: string | null = null;
    let clientId: string | null = null;
    let caseId: string | null = body.caseId || null;
    let accessMode: "lawyer" | "client" | null = null;

    if (body.portalToken) {
      const { data: tokenRow } = await service
        .from("client_access_tokens")
        .select("client_id, user_id")
        .eq("token", body.portalToken)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!tokenRow) {
        return new Response(JSON.stringify({ error: "Invalid or expired portal token." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = tokenRow.user_id;
      clientId = tokenRow.client_id;
      accessMode = "client";
    } else if (authHeader.startsWith("Bearer ")) {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData } = await authClient.auth.getUser();

      if (!authData.user) {
        return new Response(JSON.stringify({ error: "Authentication required." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = authData.user.id;
      clientId = body.clientId || null;
      accessMode = "lawyer";
    }

    if (!userId || !accessMode) {
      return new Response(JSON.stringify({ error: "Missing access context." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (caseId) {
      const { data: caseRow } = await service
        .from("cases")
        .select("id, client_id, user_id")
        .eq("id", caseId)
        .maybeSingle();

      if (!caseRow || caseRow.user_id !== userId || (clientId && caseRow.client_id !== clientId)) {
        return new Response(JSON.stringify({ error: "You do not have access to this case." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      clientId = caseRow.client_id;
    }

    if (!clientId) {
      return new Response(JSON.stringify({ error: "A client context is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "upload-file") {
      if (!body.fileData || !body.fileName) {
        return new Response(JSON.stringify({ error: "File data is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fileName = sanitizeFileName(body.fileName);
      const storagePath = `${userId}/case-collaboration/${clientId}/${caseId || "general"}/${Date.now()}-${fileName}`;
      const bytes = decodeBase64(body.fileData);
      const { error: uploadError } = await service.storage.from("documents").upload(storagePath, bytes, {
        contentType: body.contentType || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) throw uploadError;

      if (body.target === "case_document") {
        const { data: insertedDocument, error: insertError } = await service
          .from("case_documents")
          .insert({
            case_id: caseId,
            user_id: userId,
            name: body.fileName,
            document_category: body.documentCategory || "supporting",
            file_type: body.contentType || null,
            storage_path: storagePath,
            raw_text: (body.extractedText || "").slice(0, 20000),
            ai_status: body.extractedText ? "processed" : "pending",
            uploaded_by: accessMode,
            client_visible: true,
            metadata: {
              uploaded_from: accessMode,
              source: body.source || "case-collaboration",
            },
          })
          .select("*")
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify({ document: insertedDocument, storagePath }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          attachment: {
            name: body.fileName,
            storage_path: storagePath,
            content_type: body.contentType || "application/octet-stream",
            uploaded_by: accessMode,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "get-download-url") {
      if (!body.storagePath) {
        return new Response(JSON.stringify({ error: "A storage path is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowedPrefix = `${userId}/case-collaboration/${clientId}/`;
      const draftPrefix = `${userId}/case-drafts/`;
      const casePrefix = `${userId}/cases/`;
      if (!body.storagePath.startsWith(allowedPrefix) && !body.storagePath.startsWith(draftPrefix) && !body.storagePath.startsWith(casePrefix)) {
        return new Response(JSON.stringify({ error: "You do not have access to this file." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await service.storage.from("documents").createSignedUrl(body.storagePath, 60 * 15);
      if (error) throw error;

      return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("case-collaboration error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});