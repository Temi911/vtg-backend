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
const isText = (value: unknown): value is string => typeof value === "string";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/vtg-api/, "").replace(/^\/+/, "").replace(/^api\/?/, "");
  const segments = route.split("/").filter(Boolean);
  // Compatibility aliases used by the existing VTG dashboards.
  if (segments[0] === "lc") segments[0] = "letters-of-credit";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const apiKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !apiKey) return respond({ error: "Backend configuration is incomplete." }, 500);
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabase = createClient(supabaseUrl, apiKey, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (segments[0] === "health" || route === "") {
    const { error } = await supabase.from("products").select("id", { head: true, count: "exact" });
    if (error) return respond({ service: "VTG API", status: "degraded", database: "unavailable" }, 503);
    return respond({ service: "VTG API", status: "ok", database: "connected", timestamp: new Date().toISOString() });
  }

  // Product discovery is intentionally public; database RLS limits this to active listings.
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

  // Public marketplace feed; RLS limits reads to active posts only.
  if (segments[0] === "marketplace" && segments[1] === "feed" && segments.length === 2 && req.method === "GET") {
    const requestedLimit = Number(url.searchParams.get("limit") || 30);
    const limit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 30));
    const { data: posts, error } = await supabase.from("marketplace_feed_posts")
      .select("id,author_id,author_name,author_role,body,post_type,external_url,created_at")
      .eq("is_active", true).order("created_at", { ascending: false }).limit(limit);
    if (error) return respond({ error: "Could not load marketplace feed." }, 500);
    const ids = (posts ?? []).map(post => post.id);
    if (!ids.length) return respond({ posts: [] });
    const [{ data: reactions, error: reactionsError }, { data: comments, error: commentsError }] = await Promise.all([
      supabase.from("marketplace_feed_reactions").select("post_id").in("post_id", ids),
      supabase.from("marketplace_feed_comments").select("post_id").in("post_id", ids),
    ]);
    if (reactionsError || commentsError) return respond({ error: "Could not load marketplace feed activity." }, 500);
    const reactionCounts = new Map(), commentCounts = new Map();
    for (const item of reactions ?? []) reactionCounts.set(item.post_id, (reactionCounts.get(item.post_id) ?? 0) + 1);
    for (const item of comments ?? []) commentCounts.set(item.post_id, (commentCounts.get(item.post_id) ?? 0) + 1);
    return respond({ posts: (posts ?? []).map(post => ({
      id: post.id, author_id: post.author_id, full_name: post.author_name,
      storefront_name: post.author_name, role: post.author_role, created_at: post.created_at,
      body: post.body, post_type: post.post_type, external_url: post.external_url,
      reaction_count: reactionCounts.get(post.id) ?? 0, comment_count: commentCounts.get(post.id) ?? 0,
    })) });
  }

  const { data: authData, error: authError } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null }, error: new Error("Authentication required") };
  const user = authData?.user;
  if (authError || !user) return respond({ error: "Authentication required." }, 401);


  if (segments[0] === "marketplace" && segments[1] === "feed" && segments[2] === "account" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !isText(body.body) || !body.body.trim() || body.body.trim().length > 5000) {
      return respond({ error: "Post text is required (maximum 5,000 characters)." }, 400);
    }
    const postType = ["update", "product", "logistics", "question"].includes(body.postType) ? body.postType : "update";
    const externalUrl = isText(body.external_url) && body.external_url.trim() ? body.external_url.trim() : null;
    if (externalUrl && (!/^https:\/\//i.test(externalUrl) || /\s/.test(externalUrl))) {
      return respond({ error: "External links must use a valid HTTPS URL." }, 400);
    }
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("full_name,role").eq("id", user.id).maybeSingle();
    if (profileError || !profile) return respond({ error: "Could not verify your VTG profile." }, 403);
    const authorName = (profile.full_name || "VTG trade member").trim().slice(0, 160);
    const { data, error } = await supabase.from("marketplace_feed_posts").insert({
      author_id: user.id, author_name: authorName, author_role: profile.role,
      body: body.body.trim(), post_type: postType, external_url: externalUrl,
    }).select("id,author_id,author_name,author_role,body,post_type,external_url,created_at").single();
    if (error) return respond({ error: "Post could not be published." }, 403);
    return respond({ post: { ...data, full_name: data.author_name, storefront_name: data.author_name, role: data.author_role, reaction_count: 0, comment_count: 0 } }, 201);
  }

  if (segments[0] === "marketplace" && segments[1] === "feed" && segments[2] && segments[3] === "reactions" && req.method === "POST") {
    const postId = segments[2];
    const body = await req.json().catch(() => null);
    if (body && body.reaction !== undefined && body.reaction !== "like") return respond({ error: "Only the like reaction is supported." }, 400);
    const { data: post, error: postError } = await supabase.from("marketplace_feed_posts").select("id").eq("id", postId).eq("is_active", true).maybeSingle();
    if (postError || !post) return respond({ error: "Post not found." }, 404);
    const { data: existing, error: existingError } = await supabase.from("marketplace_feed_reactions")
      .select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (existingError) return respond({ error: "Could not check your reaction." }, 500);
    let liked = false;
    if (existing) {
      const { error } = await supabase.from("marketplace_feed_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
      if (error) return respond({ error: "Could not remove reaction." }, 403);
    } else {
      const { error } = await supabase.from("marketplace_feed_reactions").insert({ post_id: postId, user_id: user.id, reaction: "like" });
      if (error) return respond({ error: "Could not add reaction." }, 403);
      liked = true;
    }
    const { count, error: countError } = await supabase.from("marketplace_feed_reactions")
      .select("post_id", { count: "exact", head: true }).eq("post_id", postId);
    if (countError) return respond({ error: "Reaction saved but count could not be refreshed." }, 500);
    return respond({ liked, count: count ?? 0 });
  }

  if (segments[0] === "marketplace" && segments[1] === "feed" && segments[2] && segments[3] === "comments" && req.method === "GET") {
    const postId = segments[2];
    const { data, error } = await supabase.from("marketplace_feed_comments")
      .select("id,post_id,author_id,author_name,body,created_at")
      .eq("post_id", postId).order("created_at", { ascending: true }).limit(200);
    if (error) return respond({ error: "Could not load comments." }, 403);
    return respond({ comments: (data ?? []).map(comment => ({ ...comment, full_name: comment.author_name })) });
  }

  if (segments[0] === "marketplace" && segments[1] === "feed" && segments[2] && segments[3] === "comments" && req.method === "POST") {
    const postId = segments[2];
    const body = await req.json().catch(() => null);
    if (!body || !isText(body.body) || !body.body.trim() || body.body.trim().length > 2000) {
      return respond({ error: "Comment text is required (maximum 2,000 characters)." }, 400);
    }
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("full_name").eq("id", user.id).maybeSingle();
    if (profileError || !profile) return respond({ error: "Could not verify your VTG profile." }, 403);
    const { data, error } = await supabase.from("marketplace_feed_comments").insert({
      post_id: postId, author_id: user.id,
      author_name: (profile.full_name || user.email || "VTG trade member").trim().slice(0, 160),
      body: body.body.trim(),
    }).select("id,post_id,author_id,author_name,body,created_at").single();
    if (error) return respond({ error: "Comment could not be added. Confirm the post is active." }, 403);
    return respond({ comment: { ...data, full_name: data.author_name } }, 201);
  }

  if (segments[0] === "market" && segments[1] === "dashboard" && req.method === "GET") {
    const [productsResult, ordersResult, shipmentsResult] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("trade_orders").select("id", { count: "exact", head: true }),
      supabase.from("shipments").select("id", { count: "exact", head: true }),
    ]);
    if (productsResult.error || ordersResult.error || shipmentsResult.error) return respond({ error: "Could not load trade dashboard summary." }, 500);
    return respond({ products: productsResult.count ?? 0, orders: ordersResult.count ?? 0, shipments: shipmentsResult.count ?? 0 });
  }

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
    if (!body || !isText(body.name) || !body.name.trim()) return respond({ error: "Product name is required." }, 400);
    const { data, error } = await supabase.from("products").insert({
      supplier_id: user.id, name: body.name.trim(),
      category: isText(body.category) ? body.category : null,
      description: isText(body.description) ? body.description : null,
      unit_price: Number.isFinite(Number(body.unit_price)) ? Number(body.unit_price) : null,
      currency: ["USD","NGN","CNY","KRW"].includes(body.currency) ? body.currency : "USD",
      minimum_order_quantity: Math.max(1, Math.floor(Number(body.minimum_order_quantity) || 1)),
      hs_code: isText(body.hs_code) ? body.hs_code : null,
      origin_country: isText(body.origin_country) ? body.origin_country : null,
      image_urls: Array.isArray(body.image_urls) ? body.image_urls.filter((x: unknown) => isText(x)).slice(0, 10) : [],
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
    if (!body || !isText(body.supplier_id) || !isText(body.product_id)) return respond({ error: "Supplier and product are required." }, 400);
    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100000000) return respond({ error: "Quantity must be a positive whole number." }, 400);
    const { data: product, error: productError } = await supabase.from("products")
      .select("id,supplier_id,unit_price,currency,is_active").eq("id", body.product_id).eq("is_active", true).maybeSingle();
    if (productError || !product || product.supplier_id !== body.supplier_id) return respond({ error: "Active product and matching supplier not found." }, 404);
    const { data, error } = await supabase.from("trade_orders").insert({
      buyer_id: user.id, supplier_id: product.supplier_id, product_id: product.id,
      quantity, unit_price: Number(product.unit_price ?? 0), currency: product.currency,
      incoterm: isText(body.incoterm) ? body.incoterm : null,
      origin_port: isText(body.origin_port) ? body.origin_port : null,
      destination_port: isText(body.destination_port) ? body.destination_port : "Tin Can Island, Lagos",
      notes: isText(body.notes) ? body.notes : null,
    }).select().single();
    if (error) return respond({ error: "Order could not be created. Confirm your account is approved as a buyer." }, 403);
    return respond({ order: data }, 201);
  }

  if (segments[0] === "role-requests" && req.method === "GET") {
    const { data, error } = await supabase.from("role_requests")
      .select("id,requested_role,organization_name,country,registration_reference,message,status,created_at,reviewed_at")
      .order("created_at", { ascending: false }).limit(50);
    if (error) return respond({ error: "Could not load role requests." }, 500);
    return respond({ requests: data ?? [] });
  }

  if (segments[0] === "role-requests" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !["supplier","bank"].includes(body.requested_role) || !isText(body.organization_name) || !body.organization_name.trim()) {
      return respond({ error: "Choose supplier or bank and provide the organization name." }, 400);
    }
    const { data, error } = await supabase.from("role_requests").insert({
      user_id: user.id, requested_role: body.requested_role, organization_name: body.organization_name.trim(),
      country: isText(body.country) ? body.country : null,
      registration_reference: isText(body.registration_reference) ? body.registration_reference : null,
      message: isText(body.message) ? body.message : null,
    }).select("id,requested_role,organization_name,status,created_at").single();
    if (error) return respond({ error: "Role request could not be submitted." }, 403);
    return respond({ request: data }, 201);
  }

  if (segments[0] === "shipments" && segments[1] === "order" && segments[2] && req.method === "GET") {
    const { data, error } = await supabase.from("shipments")
      .select("id,order_id,carrier,tracking_number,container_number,origin_port,destination_port,current_location,status,progress_percent,estimated_arrival,created_at,updated_at")
      .eq("order_id", segments[2]).order("created_at", { ascending: false }).limit(1);
    if (error) return respond({ error: "Could not load shipment for this order." }, 500);
    return respond({ shipment: data?.[0] ?? null, events: [] });
  }

  if (segments[0] === "shipments" && req.method === "GET") {
    const { data, error } = await supabase.from("shipments")
      .select("id,order_id,carrier,tracking_number,container_number,origin_port,destination_port,current_location,status,progress_percent,estimated_arrival,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) return respond({ error: "Could not load shipments." }, 500);
    return respond({ shipments: data ?? [] });
  }

  if (segments[0] === "letters-of-credit" && req.method === "GET") {
    const { data, error } = await supabase.from("letters_of_credit")
      .select("id,order_id,buyer_id,supplier_id,bank_id,reference,amount,currency,status,expiry_date,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) return respond({ error: "Could not load letters of credit." }, 500);
    return respond({ letters_of_credit: data ?? [] });
  }

  if (segments[0] === "letters-of-credit" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    if (!body || !isText(body.order_id) || !Number.isFinite(amount) || amount <= 0) return respond({ error: "Order and a positive amount are required." }, 400);
    const { data: order, error: orderError } = await supabase.from("trade_orders")
      .select("id,buyer_id,supplier_id,currency").eq("id", body.order_id).maybeSingle();
    if (orderError || !order || order.buyer_id !== user.id) return respond({ error: "Only the order's buyer can request a letter of credit." }, 403);
    const { data, error } = await supabase.from("letters_of_credit").insert({
      order_id: order.id, buyer_id: user.id, supplier_id: order.supplier_id,
      amount, currency: ["USD","NGN","CNY","KRW"].includes(body.currency) ? body.currency : order.currency,
      expiry_date: isText(body.expiry_date) ? body.expiry_date : null,
    }).select().single();
    if (error) return respond({ error: "Letter of credit request could not be created." }, 403);
    return respond({ letter_of_credit: data }, 201);
  }

  if (segments[0] === "conversations" && req.method === "GET") {
    const { data, error } = await supabase.from("conversations")
      .select("id,order_id,created_by,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) return respond({ error: "Could not load conversations." }, 500);
    return respond({ conversations: data ?? [] });
  }

  if (segments[0] === "conversations" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !isText(body.participant_id) || body.participant_id === user.id) return respond({ error: "A different participant is required." }, 400);
    const { data: conversation, error: createError } = await supabase.from("conversations")
      .insert({ created_by: user.id, order_id: isText(body.order_id) ? body.order_id : null }).select().single();
    if (createError || !conversation) return respond({ error: "Conversation could not be created." }, 403);
    const { error: participantError } = await supabase.from("conversation_participants").insert([
      { conversation_id: conversation.id, user_id: user.id },
      { conversation_id: conversation.id, user_id: body.participant_id },
    ]);
    if (participantError) return respond({ error: "Conversation created but participant setup failed." }, 500);
    return respond({ conversation }, 201);
  }

  if (segments[0] === "messages" && req.method === "GET") {
    const conversationId = url.searchParams.get("conversation_id");
    if (conversationId) {
      const { data, error } = await supabase.from("messages")
        .select("id,conversation_id,sender_id,body,read_at,created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
      if (error) return respond({ error: "Could not load messages. Confirm you are a conversation participant." }, 403);
      return respond({ messages: data ?? [] });
    }
    const { data: memberships, error: membershipError } = await supabase.from("conversation_participants")
      .select("conversation_id").eq("user_id", user.id).limit(100);
    if (membershipError) return respond({ error: "Could not load conversation membership." }, 403);
    const ids = (memberships ?? []).map(m => m.conversation_id);
    if (!ids.length) return respond({ conversations: [] });
    const { data: conversations, error: conversationError } = await supabase.from("conversations")
      .select("id,order_id,created_by,created_at").in("id", ids).order("created_at", { ascending: false }).limit(100);
    if (conversationError) return respond({ error: "Could not load conversations." }, 403);
    const { data: allMessages } = await supabase.from("messages")
      .select("id,conversation_id,sender_id,body,read_at,created_at").in("conversation_id", ids)
      .order("created_at", { ascending: false }).limit(300);
    const latest = new Map();
    for (const message of allMessages ?? []) if (!latest.has(message.conversation_id)) latest.set(message.conversation_id, message);
    const orderIds = [...new Set((conversations ?? []).map(x => x.order_id).filter(Boolean))];
    let ordersById = new Map();
    if (orderIds.length) {
      const { data: orders } = await supabase.from("trade_orders").select("id,reference").in("id", orderIds);
      ordersById = new Map((orders ?? []).map(o => [o.id, o.reference]));
    }
    return respond({ conversations: (conversations ?? []).map(conversation => ({
      ...conversation,
      order_reference: ordersById.get(conversation.order_id) ?? null,
      last_message: latest.get(conversation.id)?.body ?? null,
      unread_count: 0,
    })) });
  }

  if (segments[0] === "messages" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !isText(body.conversation_id) || !isText(body.body) || !body.body.trim() || body.body.length > 10000) {
      return respond({ error: "Conversation and message text are required (maximum 10,000 characters)." }, 400);
    }
    const { data, error } = await supabase.from("messages")
      .insert({ conversation_id: body.conversation_id, sender_id: user.id, body: body.body.trim() })
      .select("id,conversation_id,sender_id,body,read_at,created_at").single();
    if (error) return respond({ error: "Message could not be sent. Confirm you are a conversation participant." }, 403);
    return respond({ message: data }, 201);
  }

  if (segments[0] === "documents" && segments[1] === "order" && segments[2] && req.method === "GET") {
    const { data, error } = await supabase.from("trade_documents")
      .select("id,owner_id,order_id,document_type,storage_path,file_name,mime_type,file_size_bytes,status,created_at")
      .eq("order_id", segments[2]).order("created_at", { ascending: false }).limit(100);
    if (error) return respond({ error: "Could not load documents for this order." }, 403);
    return respond({ documents: (data ?? []).map(d => ({ ...d, doc_type: d.document_type, uploaded_at: d.created_at })) });
  }

  if (segments[0] === "documents" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !isText(body.storage_path) || !body.storage_path.startsWith(`${user.id}/`) || !isText(body.file_name) || !isText(body.document_type)) {
      return respond({ error: "Document path, file name and document type are required; use your own private storage folder." }, 400);
    }
    const { data, error } = await supabase.from("trade_documents").insert({
      owner_id: user.id, order_id: isText(body.order_id) ? body.order_id : null,
      document_type: body.document_type, storage_path: body.storage_path,
      file_name: body.file_name, mime_type: isText(body.mime_type) ? body.mime_type : null,
      file_size_bytes: Number.isFinite(Number(body.file_size_bytes)) ? Number(body.file_size_bytes) : null,
    }).select("id,owner_id,order_id,document_type,storage_path,file_name,status,created_at").single();
    if (error) return respond({ error: "Document metadata could not be saved." }, 403);
    return respond({ document: data }, 201);
  }

  return respond({ error: "Route not found.", available: [
    "GET /health", "GET /marketplace/feed", "POST /marketplace/feed/account", "GET|POST /marketplace/feed/:id/comments", "POST /marketplace/feed/:id/reactions", "GET /me", "GET|POST /products", "GET|POST /orders",
    "GET|POST /role-requests", "GET /shipments", "GET|POST /letters-of-credit",
    "GET|POST /conversations", "GET|POST /messages?conversation_id=...", "POST /documents"
  ] }, 404);
});
