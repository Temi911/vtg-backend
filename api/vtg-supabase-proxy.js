/**
 * Same-origin proxy for the VTG Supabase Edge Function.
 *
 * Only Vercel rewrites for endpoints explicitly supported by vtg-api should
 * target this handler. Unsupported legacy endpoints continue to use the
 * existing Railway rewrite until their replacements are validated.
 */
const DEFAULT_PROJECT_URL = "https://lxrurbdzphqvkjprlfuv.supabase.co";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

module.exports = async function vtgSupabaseProxy(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET, POST, PATCH, OPTIONS");
    return res.end();
  }

  if (!["GET", "POST", "PATCH"].includes(req.method || "GET")) {
    res.setHeader("Allow", "GET, POST, PATCH, OPTIONS");
    return sendJson(res, 405, JSON.stringify({ error: "Method not allowed." }));
  }

  const rawPath = req.query && req.query.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath || "");
  const segments = path.split("/").filter(Boolean);
  const allowedRoots = new Set([
    "health", "products", "me", "orders", "role-requests", "shipments",
    "letters-of-credit", "lc", "conversations", "messages", "documents", "market",
  ]);
  if (!segments.length || !allowedRoots.has(segments[0]) || segments.some(part => part === "." || part === "..")) {
    return sendJson(res, 400, JSON.stringify({ error: "Invalid API route." }));
  }

  const projectUrl = (process.env.VTG_SUPABASE_URL || DEFAULT_PROJECT_URL).replace(/\/$/, "");
  let parsedProjectUrl;
  try {
    parsedProjectUrl = new URL(projectUrl);
  } catch {
    return sendJson(res, 500, JSON.stringify({ error: "Supabase API URL is invalid." }));
  }
  if (parsedProjectUrl.protocol !== "https:" || !parsedProjectUrl.hostname.endsWith(".supabase.co")) {
    return sendJson(res, 500, JSON.stringify({ error: "Supabase API URL is not allowed." }));
  }

  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!apiKey) {
    return sendJson(res, 503, JSON.stringify({ error: "Supabase API proxy is not configured for this deployment." }));
  }

  const incomingUrl = new URL(req.url || "/", "https://vtg.internal");
  incomingUrl.searchParams.delete("path");
  const targetUrl = new URL(
    "/functions/v1/vtg-api/" + segments.map(encodeURIComponent).join("/"),
    projectUrl
  );
  incomingUrl.searchParams.forEach((value, key) => targetUrl.searchParams.append(key, value));

  const headers = {
    apikey: apiKey,
    accept: req.headers.accept || "application/json",
  };
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];

  let body;
  if (req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!headers["content-type"]) headers["content-type"] = "application/json";
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
    const responseText = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(responseText);
  } catch (error) {
    return sendJson(res, 502, JSON.stringify({
      error: "Supabase API request failed.",
      detail: process.env.NODE_ENV === "development" ? String(error.message || error) : undefined,
    }));
  }
};
