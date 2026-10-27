#!/usr/bin/env node
// Public-safe smoke tests for the VTG Supabase Edge Function.
// Run with: SUPABASE_PUBLISHABLE_KEY=... node scripts/vtg-supabase-smoke.js
const base = (process.env.VTG_API_URL || "https://lxrurbdzphqvkjprlfuv.supabase.co/functions/v1/vtg-api").replace(/\/$/, "");
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!key) {
  console.error("Set SUPABASE_PUBLISHABLE_KEY to the project's public publishable key.");
  process.exit(2);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const anonymousHeaders = { apikey: key };
let failed = 0;
async function check(name, path, expectedStatus, validate, options = {}) {
  try {
    const response = await fetch(base + path, {
      method: options.method || "GET",
      headers: options.anonymous ? anonymousHeaders : headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const body = await response.json().catch(() => ({}));
    const ok = response.status === expectedStatus && (!validate || validate(body));
    console.log(`${ok ? "PASS" : "FAIL"} ${name}: HTTP ${response.status}`);
    if (!ok) {
      failed++;
      console.error(JSON.stringify(body));
    }
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
const authRequired = body => body.error === "Authentication required.";
await check("health checks database", "/health", 200, body => body.status === "ok" && body.database === "connected");
await check("public product catalogue", "/products", 200, body => Array.isArray(body.products));
await check("private profile rejects anonymous request", "/me", 401, authRequired, { anonymous: true });
for (const path of ["/orders", "/role-requests", "/shipments", "/letters-of-credit", "/conversations", "/messages", "/documents/order/not-a-real-id"]) {
  await check(`protected route rejects anonymous request (${path})`, path, 401, authRequired, { anonymous: true });
}
await check("product creation rejects anonymous request", "/products", 401, authRequired, { method: "POST", anonymous: true, body: { name: "Smoke-test item" } });
if (failed) process.exit(1);
console.log("VTG Supabase smoke tests passed.");
