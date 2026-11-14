import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const SYSTEM_PROMPT = [
  "You are VTG AI Trade Desk, a practical trade-preparation assistant for Africa-China-South Korea trade.",
  "Help buyers structure sourcing requests, compare supplier quotations using only supplied facts, prepare supplier due-diligence checklists, organise inspection evidence, prepare trade-document checklists, understand Incoterms at a general educational level, plan shipment milestones and identify questions to ask qualified professionals.",
  "Respond with a concise, actionable checklist when the user asks to build a checklist. Use sections: Objective, Checklist, Evidence to collect, Risks / items to verify, Next step.",
  "Ask focused follow-up questions when essential information is missing. Do not invent prices, suppliers, company verification, market data, shipping events, vessel positions, duties, taxes, official requirements or document authenticity.",
  "Clearly distinguish user-provided information, verified facts, estimates and items requiring confirmation. If no live source is connected, say so.",
  "For banking, credit, legal, customs, tax, sanctions, restricted goods and regulatory decisions, provide general educational context only and direct the user to their bank, licensed professional or relevant official authority for a decision.",
  "Never claim to submit an RFQ, verify a supplier, book an inspection, file customs documents, move funds or execute a trade. VTG AI only provides guidance.",
  "Do not ask for passwords, payment-card details, private keys, authentication codes or unnecessary sensitive personal information.",
  "Keep the tone professional, clear and practical. Do not treat user-supplied claims as independently verified."
].join(" ");

const ROLE_GUIDANCE: Record<string, string> = {
  buyer: "Adapt to the buyer/importer role. Help structure sourcing requests, assess quotations using only supplied facts, prepare due-diligence questions and organise import documentation.",
  supplier: "Adapt to the supplier/exporter role. Help prepare accurate quotations, product specifications, capacity evidence, production milestones, export documentation and buyer communications. Do not claim a buyer or supplier is verified unless a trusted verification source is explicitly provided.",
  bank: "Adapt to the bank/trade-finance operations role. Help organise document-review checklists, LC preparation questions, transaction workflow controls, exception tracking and customer communications. Never approve credit, issue or amend a financial instrument, authenticate funds, make compliance determinations or authorise a payment."
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

const buckets = new Map<string, { start: number; count: number }>();
function rateAllowed(userId: string) {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket || now - bucket.start >= 15 * 60 * 1000) {
    buckets.set(userId, { start: now, count: 1 });
    return true;
  }
  if (bucket.count >= 20) return false;
  bucket.count += 1;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to ask VTG AI." } }, 405);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return response({ error: { code: "UNAUTHENTICATED", message: "Sign in to use VTG AI." } }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) return response({ error: { code: "SERVER_CONFIGURATION", message: "VTG AI authentication is not configured. Please contact VTG support." } }, 503);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return response({ error: { code: "UNAUTHENTICATED", message: "Your session is invalid or expired. Sign in again." } }, 401);

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role,is_active").eq("id", userData.user.id).single();
  const accountRole = String(profile?.role || "").toLowerCase();
  if (profileError || !["buyer", "supplier", "bank"].includes(accountRole) || profile?.is_active !== true) {
    return response({ error: { code: "WORKSPACE_ACCESS_REQUIRED", message: "An active VTG buyer, supplier or bank account is required to use this assistant." } }, 403);
  }

  if (!rateAllowed(userData.user.id)) {
    return response({ error: { code: "RATE_LIMITED", message: "You have reached the VTG AI request limit. Please wait a few minutes and try again." } }, 429);
  }

  let body: { message?: unknown };
  try { body = await req.json(); } catch { return response({ error: { code: "INVALID_JSON", message: "Please send a valid trade question." } }, 400); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return response({ error: { code: "MESSAGE_REQUIRED", message: "Please enter your trade question." } }, 400);
  if (message.length > 6000) return response({ error: { code: "MESSAGE_TOO_LONG", message: "Please keep each question under 6,000 characters." } }, 413);

  // Provider order: Gemini first, OpenAI second. All credentials remain server-side.
  const providers = [
    {
      name: "gemini",
      apiKey: Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VTG_AI_API_KEY"),
      base: (Deno.env.get("VTG_AI_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, ""),
      model: Deno.env.get("VTG_AI_MODEL") || "gemini-2.5-flash",
    },
    {
      name: "openai",
      apiKey: Deno.env.get("OPENAI_API_KEY") || Deno.env.get("VTG_OPENAI_API_KEY"),
      base: (Deno.env.get("VTG_OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, ""),
      model: Deno.env.get("VTG_OPENAI_MODEL") || "gpt-4o-mini",
    },
  ].filter((provider) => Boolean(provider.apiKey));

  if (providers.length === 0) {
    return response({ error: { code: "AI_NOT_CONFIGURED", message: "VTG AI has no server-side AI provider configured. Please contact VTG support." } }, 503);
  }

  let lastFailure: "timeout" | "connection" | "provider" | "empty" = "provider";
  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let upstream: Response;
    try {
      upstream = await fetch(provider.base + "/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: provider.model, temperature: 0.3, max_tokens: 1100,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + " " + ROLE_GUIDANCE[accountRole] },
            { role: "user", content: message },
          ],
        }),
      });
    } catch (error) {
      lastFailure = error instanceof Error && error.name === "AbortError" ? "timeout" : "connection";
      console.warn("VTG AI provider unavailable; trying next provider", provider.name, lastFailure);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      lastFailure = "provider";
      const providerError = await upstream.text().catch(() => "");
      console.warn("VTG AI provider returned an error; trying next provider", provider.name, upstream.status, providerError.slice(0, 300));
      continue;
    }

    const payload = await upstream.json().catch(() => ({}));
    const reply = payload?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      lastFailure = "empty";
      console.warn("VTG AI provider returned an empty response; trying next provider", provider.name);
      continue;
    }

    return response({
      reply: reply.trim(),
      role: accountRole,
      model: provider.model,
      provider: provider.name,
      mode: "live",
    });
  }

  const messages = {
    timeout: "The AI providers took too long to respond. Please try again shortly.",
    connection: "The AI providers could not be reached. Please try again shortly.",
    empty: "The AI providers returned an empty response. Please try again shortly.",
    provider: "The AI providers could not complete this request. Please try again shortly.",
  };
  // Return a normal chat payload when providers are temporarily unavailable.
  // The dashboard can display this in the assistant bubble instead of surfacing
  // Supabase's generic "Edge Function returned a non-2xx status code" error.
  return response({
    reply: "VTG AI is temporarily unable to reach its response service. Your message has not been submitted as a trade instruction. Please try again shortly. If this continues, contact VTG support at vintageafricatrade@gmail.com.",
    role: accountRole,
    mode: "fallback",
    retryable: true,
    error: { code: "AI_PROVIDER_UNAVAILABLE", message: messages[lastFailure] },
  });
});
