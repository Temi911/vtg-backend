import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/vtg-api/, "").replace(/^\/+/, "");
  const segments = route.split("/").filter(Boolean);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const apiKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !apiKey) return respond({ error: "Backend configuration is incomplete." }, 500);
  if (segments[0] === "health" || route === "") {
    return respond({ service: "VTG API", status: "ok", database: "configured", timestamp: new Date().toISOString() });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabase = createClient(supabaseUrl, apiKey, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null }, error: new Error("Authentication required") };
  const user = authData?.user;
  if (authError || !user) return respond({ error: "Authentication required." }, 401);

  if (segments[0] === "me" && req.method === "GET") {
    const { data, error } = await supabase.from("profiles")
      .select("id,email,full_name,phone,role,preferred_language,country,city,is_active,created_at")
      .eq("id", user.id).maybeSingle();
    if (error) return respond({ error: "Could not load profile." }, 500);
    return respond({ user: data });
  }

  if (segments[0] === "products" && req.method === "GET") {
    const search = url.searchParams.get("q");
    let query = supabase.from("products")
      .select("id,supplier_id,name,category,description,unit_price,currency,minimum_order_quantity,hs_code,lead_time_days,origin_country,image_urls,is_verified,created_at")
      .eq("is_active", true).order("created_at", { ascending: false }).limit(100);
    if (search) query = query.ilike("name", `%${search.replace(/[,%()]/g, "")}%`);
    const { data, error } = await query;
    if (error) return respond({ error: "Could not load products." }, 500);
    return respond({ products: data ?? [] });
  }

  if (segments[0] === "products" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== "string" || !body.name.trim()) return respond({ error: "Product name is required." }, 400);
    const { data, error } = await supabase.from("products").insert({
      supplier_id: user.id, name: body.name.trim(),
      category: typeof body.category === "string" ? body.category : null,
      description: typeof body.description === "string" ? body.description : null,
      unit_price: Number.isFinite(Number(body.unit_price)) ? Number(body.unit_price) : null,
      currency: ["USD","NGN","CNY","KRW"].includes(body.currency) ? body.currency : "USD",
      minimum_order_quantity: Math.max(1, Math.floor(Number(body.minimum_order_quantity) || 1)),
      hs_code: typeof body.hs_code === "string" ? body.hs_code : null,
      origin_country: typeof body.origin_country === "string" ? body.origin_country : null,
      image_urls: Array.isArray(body.image_urls) ? body.image_urls.filter((x: unknown) => typeof x === "string").slice(0, 10) : [],
    }).select().single();
    if (error) return respond({ error: "Product could not be created. Confirm your supplier account is approved." }, 403);
    return respond({ product: data }, 201);
  }

  if (segments[0] === "orders" && req.method === "GET") {
    const { data, error } = await supabase.from("trade_orders")
      .select("id,reference,buyer_id,supplier_id,product_id,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,notes,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) return respond({ error: "Could not load orders." }, 500);
    return respond({ orders: data ?? [] });
  }

  if (segments[0] === "orders" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.supplier_id !== "string" || typeof body.product_id !== "string") return respond({ error: "Supplier and product are required." }, 400);
    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100000000) return respond({ error: "Quantity must be a positive whole number." }, 400);
    const { data: product, error: productError } = await supabase.from("products")
      .select("id,supplier_id,unit_price,currency,is_active").eq("id", body.product_id).eq("is_active", true).maybeSingle();
    if (productError || !product || product.supplier_id !== body.supplier_id) return respond({ error: "Active product and matching supplier not found." }, 404);
    const { data, error } = await supabase.from("trade_orders").insert({
      buyer_id: user.id, supplier_id: product.supplier_id, product_id: product.id,
      quantity, unit_price: Number(product.unit_price ?? 0), currency: product.currency,
      incoterm: typeof body.incoterm === "string" ? body.incoterm : null,
      origin_port: typeof body.origin_port === "string" ? body.origin_port : null,
      destination_port: typeof body.destination_port === "string" ? body.destination_port : "Tin Can Island, Lagos",
      notes: typeof body.notes === "string" ? body.notes : null,
    }).select().single();
    if (error) return respond({ error: "Order could not be created. Confirm your account is approved as a buyer." }, 403);
    return respond({ order: data }, 201);
  }

  return respond({ error: "Route not found.", available: ["GET /health", "GET /me", "GET /products", "POST /products", "GET /orders", "POST /orders"] }, 404);
});
