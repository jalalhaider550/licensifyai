import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
9. Output must be clean, final, and ready to send to a client or opposing party.`;

const CLAUSE_LIBRARY = [
  "Indemnity",
  "Limitation of Liability",
  "Confidentiality",
  "Non-compete",
  "Dispute Resolution",
  "Governing Law",
  "Force Majeure",
  "Termination",
  "Intellectual Property",
  "Data Protection",
];

// --- Helpers ---

/** Remove control characters that break JSON.parse */
function sanitiseJsonString(raw: string): string {
  // Remove chars 0x00-0x1F except \n \r \t (which are valid in JSON when escaped)
  // deno-lint-ignore no-control-regex
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
}

/** Try to extract and parse the first JSON object from a string */
function extractJson(text: string): any {
  const clean = sanitiseJsonString(text);

  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch { /* fall through */ }

  // Try to find outermost { … }
  const start = clean.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === "{") depth++;
    else if (clean[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;

  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    // Last resort: try removing trailing commas before } or ]
    const patched = clean.slice(start, end + 1)
      .replace(/,\s*([\]}])/g, "$1");
    try {
      return JSON.parse(patched);
    } catch {
      return null;
    }
  }
}

/** Split text into chunks of roughly `maxWords` words, breaking on paragraph boundaries */
function chunkText(text: string, maxWords = 700): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  let wordCount = 0;

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).length;
    if (wordCount + paraWords > maxWords && current.trim()) {
      chunks.push(current.trim());
      current = "";
      wordCount = 0;
    }
    current += para + "\n\n";
    wordCount += paraWords;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

/** Call the AI gateway with retry on transient errors */
async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<{ ok: true; content: string } | { ok: false; status: number; error: string; errorType?: string }> {
  const { maxTokens = 12000, temperature = 0.3 } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + "\n\n" + DOCUMENT_OUTPUT_RULES },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[generate-legal-document] AI ${resp.status}:`, errText);
      if (resp.status === 429) return { ok: false, status: 429, error: "AI rate limit exceeded. Please wait a moment and try again.", errorType: "rate_limit" };
      if (resp.status === 402) return { ok: false, status: 402, error: "Your AI balance is used up. Please top up to continue.", errorType: "credits_exhausted" };
      return { ok: false, status: 502, error: "AI service temporarily unavailable. Please try again." };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { ok: true, content };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") return { ok: false, status: 504, error: "Request timed out. Please try again.", errorType: "timeout" };
    return { ok: false, status: 500, error: e.message || "AI request failed" };
  }
}

function ok(body: any) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function err(message: string, errorType?: string) {
  return ok({ success: false, error: message, errorType });
}

// --- Scenario detection (unchanged) ---
function detectScenarioRisks(body: any): string[] {
  const risks: string[] = [];
  const allText = [body.specialInstructions || "", body.specialClauses || "", body.scopeOfWork || "", body.paymentTerms || "", body.terminationClause || "", body.generationMode || ""].join(" ").toLowerCase();
  if (/non[- ]?payment|late payment|default|arrears|overdue|unpaid|deposit|upfront|advance payment/i.test(allText)) risks.push("HIGH_PAYMENT_RISK");
  if (/strict|protective|penalty|penalt|enforce|heavy|punitive/i.test(allText) || body.generationMode === "strict") risks.push("STRICT_PROTECTION");
  if (/favor.*party.*a|protect.*party.*a|benefit.*party.*a/i.test(allText) || body.generationMode === "favor_party_a") risks.push("FAVOR_PARTY_A");
  if (/favor.*party.*b|protect.*party.*b|benefit.*party.*b/i.test(allText) || body.generationMode === "favor_party_b") risks.push("FAVOR_PARTY_B");
  if (/kpi|performance|deliverable|milestone|sla|service level/i.test(allText)) risks.push("PERFORMANCE_BASED");
  if (/intellectual property|ip rights|copyright|patent|trade secret/i.test(allText)) risks.push("IP_SENSITIVE");
  if (/confidential|nda|non[- ]?disclosure|sensitive information/i.test(allText)) risks.push("CONFIDENTIALITY_EMPHASIS");
  if (/terminat|cancel|exit|walk away|break clause/i.test(allText)) risks.push("TERMINATION_RISK");
  return risks;
}

function buildScenarioInstructions(risks: string[], partyA: string, partyB: string): string {
  if (risks.length === 0) return "";
  const instructions: string[] = ["\n\nSCENARIO-SPECIFIC INSTRUCTIONS (MANDATORY):"];
  if (risks.includes("HIGH_PAYMENT_RISK")) instructions.push(`PAYMENT RISK — Include: upfront deposit (25-50%), late payment interest (2-4% above base rate/month), right to suspend on non-payment after 14 days, minimum commitment with exit penalties, payment milestones, debt collection cost recovery.`);
  if (risks.includes("STRICT_PROTECTION")) instructions.push(`STRICT MODE — Limit ${partyB}'s termination rights, 90-day notice minimum, liquidated damages for early termination, penalty clauses, payment acceleration, audit rights for ${partyA}, KPI clauses.`);
  if (risks.includes("FAVOR_PARTY_A")) instructions.push(`FAVOR ${partyA} — Liability cap only for ${partyA}, broader termination rights, IP ownership vests in ${partyA}, indemnity on ${partyB}, assignment without consent.`);
  if (risks.includes("FAVOR_PARTY_B")) instructions.push(`FAVOR ${partyB} — Flexible termination, liability cap for ${partyB}, favorable payment terms, more IP rights.`);
  if (risks.includes("PERFORMANCE_BASED")) instructions.push(`PERFORMANCE — KPIs with measurable targets, review periods, termination for underperformance, bonus/penalty structure, SLA.`);
  if (risks.includes("IP_SENSITIVE")) instructions.push(`IP — Detailed ownership/assignment, pre-existing IP carve-outs, license-back, IP indemnification, non-compete.`);
  if (risks.includes("TERMINATION_RISK")) instructions.push(`TERMINATION — Graduated notice periods, cause vs convenience distinction, wind-down obligations, survival clauses, return of materials.`);
  return instructions.join("\n");
}

// --- Prompt builders ---

function buildContractPrompt(body: any) {
  const { contractType, partyA, partyB, jurisdiction, scopeOfWork, paymentTerms, duration, terminationClause, specialClauses, specialInstructions, generationMode } = body;
  const risks = detectScenarioRisks(body);
  const scenario = buildScenarioInstructions(risks, partyA, partyB);
  let modeInstr = "";
  switch (generationMode) {
    case "strict": modeInstr = "Very strict, protective clauses. Heavy penalties for breach."; break;
    case "favor_party_a": modeInstr = `Strongly favor ${partyA}.`; break;
    case "favor_party_b": modeInstr = `Strongly favor ${partyB}.`; break;
    case "balanced": modeInstr = "Balanced, fair terms for both parties."; break;
    default: modeInstr = "Standard professional clauses.";
  }
  return `You are a practising senior commercial solicitor (15+ years PQE). Generate a COMPLETE, PROFESSIONAL ${contractType} contract. Write with authority — every clause must be definitive legal text ready for execution.
PARTIES: Party A: ${partyA} | Party B: ${partyB}
JURISDICTION: ${jurisdiction}
SCOPE: ${scopeOfWork || "To be defined"}
PAYMENT: ${paymentTerms || "As agreed"}
DURATION: ${duration || "12 months"}
${terminationClause ? `TERMINATION: ${terminationClause}` : ""}
${specialClauses ? `SPECIAL CLAUSES: ${specialClauses}` : ""}
MODE: ${modeInstr}
${specialInstructions ? `INSTRUCTIONS: ${specialInstructions}` : ""}
${risks.length ? `RISK PROFILE: ${risks.join(", ")}` : ""}
${scenario}

Return a JSON object (NO markdown fences):
{"title":"...","date":"...","parties":{"partyA":"...","partyB":"..."},"recitals":"...","definitions":[{"term":"...","definition":"..."}],"clauses":[{"number":"1","title":"...","body":"...","subClauses":[{"number":"1.1","body":"..."}]}],"governingLaw":"...","signatureBlock":"...","warnings":[{"type":"missing_clause","message":"..."}]}

MANDATORY: Definitions, Scope, Payment, Duration, Termination, Confidentiality, IP, Limitation of Liability, Indemnity, Dispute Resolution, Governing Law, Force Majeure, General Provisions.
Each clause must be FULL legal text. Tailor to scenario. Do NOT use markdown.`;
}

function buildNdaPrompt(body: any) {
  const { disclosingParty, receivingParty, jurisdiction, purpose, duration, ndaType, specialInstructions } = body;
  const typeInstr = ndaType === "mutual" ? "MUTUAL NDA — both parties disclose." : `ONE-WAY NDA — ${disclosingParty} discloses to ${receivingParty}.`;
  return `You are a practising senior commercial solicitor. Generate a COMPLETE NDA with full legal authority. Every clause must be definitive and enforceable.
${typeInstr}
DISCLOSING: ${disclosingParty} | RECEIVING: ${receivingParty}
JURISDICTION: ${jurisdiction}
PURPOSE: ${purpose || "Business discussions"}
DURATION: ${duration || "2 years"}
${specialInstructions ? `INSTRUCTIONS: ${specialInstructions}` : ""}

Return a JSON object (NO markdown fences):
{"title":"NON-DISCLOSURE AGREEMENT","date":"...","parties":{"disclosingParty":"...","receivingParty":"..."},"recitals":"...","definitions":[{"term":"...","definition":"..."}],"clauses":[{"number":"1","title":"...","body":"...","subClauses":[{"number":"1.1","body":"..."}]}],"governingLaw":"...","signatureBlock":"...","warnings":[{"type":"...","message":"..."}]}

Include: Definition of Confidential Information, Obligations, Exclusions, Term/Termination, Return of Materials, Remedies, No License/Warranty, Governing Law, Dispute Resolution, General Provisions.
Full legal text. No markdown.`;
}

function buildRegenerateClausePrompt(body: any) {
  const { clause, instruction, documentContext } = body;
  return `You are a practising senior commercial solicitor. Regenerate this clause with authority. The output must be definitive legal text.
CURRENT CLAUSE: #${clause.number} "${clause.title}": ${clause.body}
${clause.subClauses?.length ? `Sub-clauses: ${JSON.stringify(clause.subClauses)}` : ""}
CONTEXT: ${documentContext || "Standard commercial agreement"}
INSTRUCTION: ${instruction}

Return JSON (NO markdown): {"number":"${clause.number}","title":"...","body":"...","subClauses":[{"number":"X.X","body":"..."}]}`;
}

function buildReviewChunkPrompt(chunkText: string, chunkIndex: number, totalChunks: number, documentType: string, improvementMode: string, userInstruction?: string) {
  let modeInstr = "";
  switch (improvementMode) {
    case "strict": modeInstr = "Make clauses stricter and more protective."; break;
    case "balanced": modeInstr = "Balance clauses to protect both parties equally."; break;
    case "favor_party_a": modeInstr = "Revise to strongly favor the first party."; break;
    case "add_missing": modeInstr = "Focus on identifying missing clauses."; break;
    default: modeInstr = "Improve professionally.";
  }
  return `You are a PRACTISING SENIOR COMMERCIAL SOLICITOR performing a legal review. Give definitive assessments — do not hedge.
DOCUMENT TYPE: ${documentType || "Legal Agreement"}
MODE: ${modeInstr}
${userInstruction ? `USER INSTRUCTION: ${userInstruction}` : ""}
This is chunk ${chunkIndex + 1} of ${totalChunks}.

TEXT:
---
${chunkText}
---

Analyze EVERY clause in this chunk. Return JSON (NO markdown fences):
{"clauses":[{"clauseName":"...","whatItDoes":"...","strength":"strong|weak|moderate","favors":"Party A|Party B|Neutral","riskLevel":"high|medium|low","analysis":"..."}],"issues":["..."],"redFlags":["..."]}`;
}

function buildReviewSummaryPrompt(chunkResults: any[], documentType: string, improvementMode: string, userInstruction?: string) {
  let modeInstr = "";
  switch (improvementMode) {
    case "strict": modeInstr = "Make all clauses stricter and more protective. Add heavy penalties."; break;
    case "balanced": modeInstr = "Balance all clauses to protect both parties equally."; break;
    case "favor_party_a": modeInstr = "Revise clauses to strongly favor the first party."; break;
    case "add_missing": modeInstr = "Add all missing essential clauses."; break;
    default: modeInstr = "Improve professionally.";
  }

  const allClauses = chunkResults.flatMap(c => c.clauses || []);
  const allIssues = chunkResults.flatMap(c => c.issues || []);
  const allRedFlags = chunkResults.flatMap(c => c.redFlags || []);

  return `You are a PRACTISING SENIOR COMMERCIAL SOLICITOR. Synthesise this clause-by-clause analysis into a final review and generate an improved document. Be authoritative and decisive in your assessment.
DOCUMENT TYPE: ${documentType || "Legal Agreement"}
MODE: ${modeInstr}
${userInstruction ? `USER INSTRUCTION: ${userInstruction}` : ""}

CLAUSE ANALYSIS:
${JSON.stringify(allClauses).slice(0, 8000)}

ISSUES FOUND: ${JSON.stringify(allIssues).slice(0, 2000)}
RED FLAGS: ${JSON.stringify(allRedFlags).slice(0, 1000)}

Return JSON (NO markdown fences):
{"review":{"caseSummary":{"parties":{"partyA":"...","partyB":"..."},"documentType":"...","jurisdiction":"...","purpose":"..."},"clauseByClauseBreakdown":[{"clauseName":"...","whatItDoes":"...","strength":"strong|weak|moderate","favors":"Party A|Party B|Neutral","riskLevel":"high|medium|low","analysis":"..."}],"keyIssues":["..."],"applicableLaws":{"statutes":["..."],"caseReferences":[{"caseName":"...","year":"...","principle":"...","relevance":"..."}]},"legalAnalysis":{"overallStrength":"...","enforceability":"...","commercialFairness":"...","riskExposure":"..."},"improvements":[{"clause":"...","currentIssue":"...","suggestedFix":"..."}],"strengthScore":7,"riskLevel":"medium","redFlags":["..."],"summary":"..."},"improvedDocument":{"title":"...","date":"${new Date().toISOString().split("T")[0]}","parties":{"partyA":"...","partyB":"..."},"recitals":"...","definitions":[{"term":"...","definition":"..."}],"clauses":[{"number":"1","title":"...","body":"...","subClauses":[{"number":"1.1","body":"..."}]}],"governingLaw":"...","signatureBlock":"...","warnings":[{"type":"missing_clause","message":"..."}]}}

RULES:
1. clauseByClauseBreakdown must cover EVERY major clause
2. Include 1-3 REAL case law references (UK first, then US). Never fabricate authorities.
3. improvements must be SPECIFIC with exact clause references
4. strengthScore: 1 (dangerous) to 10 (excellent)
5. The improved document MUST fix all identified issues
6. Do NOT use markdown. Pure JSON only.`;
}

function buildGenerateFromDocumentPrompt(body: any) {
  const { documentText, documentType, userInstruction, targetDocumentType } = body;
  return `You are a practising senior commercial solicitor. Using the source document, generate a NEW ${targetDocumentType || documentType || "Legal Agreement"} with full legal authority.
INSTRUCTION: ${userInstruction || "Improve and restructure professionally"}

SOURCE (truncated):
---
${(documentText || "").slice(0, 15000)}
---

Extract key details and generate a new professional document.
Return JSON (NO markdown fences):
{"title":"...","date":"${new Date().toISOString().split("T")[0]}","parties":{"partyA":"...","partyB":"..."},"recitals":"...","definitions":[{"term":"...","definition":"..."}],"clauses":[{"number":"1","title":"...","body":"...","subClauses":[{"number":"1.1","body":"..."}]}],"governingLaw":"...","signatureBlock":"...","warnings":[{"type":"...","message":"..."}]}

Each clause must be FULL legal text. No markdown.`;
}

// --- Main handler ---
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    console.log(`[generate-legal-document] action=${action}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return err("AI service not configured");

    // --- Review document: chunked approach ---
    if (action === "review-document") {
      const { documentText, documentType, improvementMode, userInstruction } = body;
      const text = (documentText || "").slice(0, 30000);
      const wordCount = text.split(/\s+/).length;

      // For small docs (< 800 words), do a single call with combined prompt
      if (wordCount <= 800) {
        const prompt = buildReviewSummaryPrompt(
          [{ clauses: [], issues: [], redFlags: [] }],
          documentType,
          improvementMode,
          userInstruction,
        );
        // Replace the chunk analysis placeholder with the actual text
        const singlePrompt = `You are a PRACTISING SENIOR COMMERCIAL SOLICITOR performing a FULL LEGAL REVIEW. Be authoritative and decisive.
DOCUMENT TYPE: ${documentType || "Legal Agreement"}
MODE: ${improvementMode || "improve"}
${userInstruction ? `USER INSTRUCTION: ${userInstruction}` : ""}

DOCUMENT TEXT:
---
${text}
---

Analyze EVERY clause. Return JSON (NO markdown fences):
{"review":{"caseSummary":{"parties":{"partyA":"...","partyB":"..."},"documentType":"...","jurisdiction":"...","purpose":"..."},"clauseByClauseBreakdown":[{"clauseName":"...","whatItDoes":"...","strength":"strong|weak|moderate","favors":"Party A|Party B|Neutral","riskLevel":"high|medium|low","analysis":"..."}],"keyIssues":["..."],"applicableLaws":{"statutes":["..."],"caseReferences":[{"caseName":"...","year":"...","principle":"...","relevance":"..."}]},"legalAnalysis":{"overallStrength":"...","enforceability":"...","commercialFairness":"...","riskExposure":"..."},"improvements":[{"clause":"...","currentIssue":"...","suggestedFix":"..."}],"strengthScore":7,"riskLevel":"medium","redFlags":["..."],"summary":"..."},"improvedDocument":{"title":"...","date":"${new Date().toISOString().split("T")[0]}","parties":{"partyA":"...","partyB":"..."},"recitals":"...","definitions":[{"term":"...","definition":"..."}],"clauses":[{"number":"1","title":"...","body":"...","subClauses":[{"number":"1.1","body":"..."}]}],"governingLaw":"...","signatureBlock":"...","warnings":[{"type":"missing_clause","message":"..."}]}}

RULES: Analyze every clause. Include 1-3 REAL case law references. strengthScore 1-10. Fix all issues in improved document. NO markdown.`;

        const LAWYER_SYSTEM = "You are a practising senior commercial solicitor. Return valid JSON only. No markdown fences. No hedging. No disclaimers.";
        const result = await callAI(LOVABLE_API_KEY, LAWYER_SYSTEM, singlePrompt, { maxTokens: 16000 });
        if (!result.ok) return err(result.error, result.errorType);

        const parsed = extractJson(result.content);
        if (!parsed) {
          console.error("[generate-legal-document] Failed to parse review JSON");
          return err("Failed to parse review. Please try again.");
        }
        return ok({ success: true, document: parsed, clauseLibrary: CLAUSE_LIBRARY });
      }

      // For larger docs: chunk → analyze each → summarise
      const chunks = chunkText(text, 700);
      console.log(`[generate-legal-document] Chunked into ${chunks.length} parts (${wordCount} words)`);

      const chunkResults: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkPrompt = buildReviewChunkPrompt(chunks[i], i, chunks.length, documentType, improvementMode, userInstruction);
        const result = await callAI(LOVABLE_API_KEY, "You are a practising senior commercial solicitor. Return valid JSON only. No markdown fences. No hedging.", chunkPrompt, { maxTokens: 6000 });
        if (!result.ok) return err(result.error, result.errorType);

        const parsed = extractJson(result.content);
        if (parsed) {
          chunkResults.push(parsed);
        } else {
          console.warn(`[generate-legal-document] Chunk ${i + 1} parse failed, skipping`);
          chunkResults.push({ clauses: [], issues: ["Parse error on chunk " + (i + 1)], redFlags: [] });
        }
      }

      // Summarise all chunks
      const summaryPrompt = buildReviewSummaryPrompt(chunkResults, documentType, improvementMode, userInstruction);
      const summaryResult = await callAI(LOVABLE_API_KEY, "You are a practising senior commercial solicitor. Return valid JSON only. No markdown fences. No hedging.", summaryPrompt, { maxTokens: 16000 });
      if (!summaryResult.ok) return err(summaryResult.error, summaryResult.errorType);

      const finalParsed = extractJson(summaryResult.content);
      if (!finalParsed) {
        console.error("[generate-legal-document] Failed to parse summary JSON");
        return err("Failed to compile review. Please try again.");
      }

      return ok({ success: true, document: finalParsed, clauseLibrary: CLAUSE_LIBRARY });
    }

    // --- All other actions: single call ---
    let prompt: string;
    switch (action) {
      case "generate-contract": prompt = buildContractPrompt(body); break;
      case "generate-nda": prompt = buildNdaPrompt(body); break;
      case "regenerate-clause": prompt = buildRegenerateClausePrompt(body); break;
      case "generate-from-document": prompt = buildGenerateFromDocumentPrompt(body); break;
      default: return err("Unknown action");
    }

    const result = await callAI(LOVABLE_API_KEY, "You are a practising senior commercial solicitor. Return valid JSON only. No markdown fences. No hedging.", prompt, { maxTokens: 12000 });
    if (!result.ok) return err(result.error, result.errorType);

    const parsed = extractJson(result.content);
    if (!parsed) {
      console.error("[generate-legal-document] No valid JSON in AI response");
      return err("Failed to parse document. Please try again.");
    }

    return ok({ success: true, document: parsed, clauseLibrary: CLAUSE_LIBRARY });
  } catch (e: any) {
    console.error("[generate-legal-document] Error:", e);
    return err(e.message || "Internal error");
  }
});
