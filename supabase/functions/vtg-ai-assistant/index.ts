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
  "Write in clean, natural business prose. Prefer short paragraphs and simple headings. Avoid Markdown tables, ASCII tables, decorative separators, emoji, excessive numbering, unusual Unicode symbols and long walls of text. Use ordinary hyphen bullets only when a list genuinely helps.",
  "Use Markdown emphasis sparingly: **bold** for key terms, *italics* for occasional emphasis, and __underlining__ only when genuinely useful. The chat interface renders these styles, so do not explain the formatting syntax.",
  "For sourcing and RFQ questions, organise the answer with clear headings and practical explanations. Do not force a fixed set of sections when they do not fit the question. Give examples only when relevant and label assumptions clearly.",
  "Keep ordinary answers focused, usually under 450 words unless the user asks for a detailed guide. Finish every answer cleanly: do not leave a heading, list, sentence or table unfinished. If the question needs more detail than fits, complete the useful core answer and offer to continue.",
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

  // Free providers are attempted first. Paid providers are only enabled when
  // VTG_ENABLE_PAID_AI_FALLBACKS is explicitly set to "true" in Supabase secrets.
  // All provider credentials remain server-side.
  const paidFallbacksEnabled = Deno.env.get("VTG_ENABLE_PAID_AI_FALLBACKS") === "true";
  const trimTrailingSlash = (value: string) => value.endsWith("/") ? value.slice(0, -1) : value;
  type Provider = {
    name: string;
    apiKey: string | undefined;
    model: string;
    protocol: "openai" | "anthropic";
    base: string;
  };
  const providers: Provider[] = [
    {
      name: "gemini",
      apiKey: Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VTG_AI_API_KEY"),
      base: trimTrailingSlash(Deno.env.get("VTG_AI_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta/openai"),
      model: Deno.env.get("VTG_AI_MODEL") || "gemini-2.5-flash",
      protocol: "openai",
    },
    {
      name: "groq",
      apiKey: Deno.env.get("GROQ_API_KEY"),
      base: "https://api.groq.com/openai/v1",
      model: Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b",
      protocol: "openai",
    },
    {
      name: "openrouter",
      apiKey: Deno.env.get("OPENROUTER_API_KEY"),
      base: "https://openrouter.ai/api/v1",
      model: Deno.env.get("OPENROUTER_MODEL") || "openrouter/free",
      protocol: "openai",
    },
    ...(paidFallbacksEnabled ? [
      {
        name: "deepseek",
        apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
        base: "https://api.deepseek.com",
        model: Deno.env.get("DEEPSEEK_MODEL") || "deepseek-flash",
        protocol: "openai" as const,
      },
      {
        name: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
        base: "https://api.anthropic.com",
        model: Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-5-5",
        protocol: "anthropic" as const,
      },
      {
        name: "openai",
        apiKey: Deno.env.get("OPENAI_API_KEY") || Deno.env.get("VTG_OPENAI_API_KEY"),
        base: trimTrailingSlash(Deno.env.get("VTG_OPENAI_BASE_URL") || "https://api.openai.com/v1"),
        model: Deno.env.get("VTG_OPENAI_MODEL") || "gpt-4o-mini",
        protocol: "openai" as const,
      },
    ] : []),
  ].filter((provider) => Boolean(provider.apiKey));

  if (providers.length === 0) {
    return response({ error: { code: "AI_NOT_CONFIGURED", message: "VTG AI has no server-side AI provider configured. Please contact VTG support." } }, 503);
  }

  let lastFailure: "timeout" | "connection" | "provider" | "empty" = "provider";
  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let upstream: Response;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let requestBody: Record<string, unknown>;

      if (provider.protocol === "anthropic") {
        headers["x-api-key"] = provider.apiKey!;
        headers["anthropic-version"] = "2023-06-01";
        requestBody = {
          model: provider.model,
          max_tokens: 1800,
          temperature: 0.3,
          system: SYSTEM_PROMPT + " " + ROLE_GUIDANCE[accountRole],
          messages: [{ role: "user", content: message }],
        };
      } else {
        headers.Authorization = `Bearer ${provider.apiKey}`;
        if (provider.name === "openrouter") {
          headers["HTTP-Referer"] = "https://vintageafricatrade.com";
          headers["X-Title"] = "VTG — The Private Trade House";
        }
        requestBody = {
          model: provider.model,
          temperature: 0.3,
          max_tokens: 1100,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + " " + ROLE_GUIDANCE[accountRole] },
            { role: "user", content: message },
          ],
        };
      }

      const endpoint = provider.protocol === "anthropic"
        ? provider.base + "/v1/messages"
        : provider.base + "/chat/completions";
      upstream = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify(requestBody),
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
      // Never write provider response bodies or credentials to application logs.
      console.warn("VTG AI provider returned an error; trying next provider", provider.name, upstream.status);
      continue;
    }

    const payload = await upstream.json().catch(() => ({}));
    const reply = provider.protocol === "anthropic"
      ? (Array.isArray(payload?.content)
          ? payload.content.find((block: { type?: string; text?: string }) => block?.type === "text")?.text
          : undefined)
      : payload?.choices?.[0]?.message?.content;
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
