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
let failed = 0;
async function check(name, path, expectedStatus, validate) {
  try {
    const response = await fetch(base + path, { headers: path === "/me" ? { apikey: key } : headers });
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
await check("health checks database", "/health", 200, body => body.status === "ok" && body.database === "connected");
await check("public product catalogue", "/products", 200, body => Array.isArray(body.products));
await check("private profile rejects anonymous request", "/me", 401, body => body.error === "Authentication required.");
if (failed) process.exit(1);
console.log("VTG Supabase smoke tests passed.");
