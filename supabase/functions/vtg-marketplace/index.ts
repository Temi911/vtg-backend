import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const BUCKET = "vtg-trade-feed-media";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:cors});
const clean = (v: unknown, max=5000) => String(v ?? "").trim().slice(0,max);
const fail = (message:string,status=400) => reply({error:message,message},status);
const userClient = (req:Request) => {
  const auth=req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, ANON_KEY, {
    global:{headers: auth ? {Authorization:auth} : {}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
};
async function activeUser(db:SupabaseClient) {
  const {data:{user},error}=await db.auth.getUser();
  if(error || !user) throw new Error("AUTH_REQUIRED");
  const {data:profile,error:pe}=await db.from("profiles")
    .select("id,full_name,role,country,is_active,account_environment")
    .eq("id",user.id).maybeSingle();
  if(pe || !profile || profile.is_active!==true || (profile.role!=="admin" && profile.account_environment!=="trade")) throw new Error("ACTIVE_ACCOUNT_REQUIRED");
  return {user,profile};
}
function inferRegion(value:unknown):string|null {
  const v=String(value??"").trim().toLowerCase();
  if(["cn","china","chinese"].includes(v)) return "China";
  if(["kr","south korea","korea","republic of korea"].includes(v)) return "South Korea";
  if(["ng","nigeria","ke","kenya","gh","ghana","za","south africa","eg","egypt","ma","morocco","et","ethiopia","tz","tanzania","ug","uganda","rw","rwanda","sn","senegal","ci","cote d'ivoire","dz","algeria","ao","angola","cm","cameroon","zm","zambia","zw","zimbabwe"].includes(v)) return "Africa";
  return null;
}
function errorResponse(error:unknown) {
  const code=(error as Error)?.message ?? "";
  if(code==="AUTH_REQUIRED") return fail("A valid signed-in session is required.",401);
  if(code==="ACTIVE_ACCOUNT_REQUIRED") return fail("An active VTG account is required.",403);
  return fail("The trade feed request could not be completed.",500);
}
async function listFeed(db:SupabaseClient,limit:number) {
  const {data:posts,error}=await db.from("vtg_trade_posts")
    .select("id,author_id,body,post_type,external_url,country_code,region,created_at")
    .eq("is_published",true).order("created_at",{ascending:false}).limit(limit);
  if(error) throw error;
  const ids=(posts??[]).map(p=>p.id), authors=[...new Set((posts??[]).map(p=>p.author_id))];
  const [profiles,media,comments,reactions]=await Promise.all([
    authors.length?db.from("profiles").select("id,full_name,role,country").in("id",authors):Promise.resolve({data:[],error:null}),
    ids.length?db.from("vtg_trade_post_media").select("post_id,media_type,public_url,thumbnail_url,sort_order").in("post_id",ids).order("sort_order"):Promise.resolve({data:[],error:null}),
    ids.length?db.from("vtg_trade_post_comments").select("post_id").in("post_id",ids):Promise.resolve({data:[],error:null}),
    ids.length?db.from("vtg_trade_post_reactions").select("post_id").in("post_id",ids):Promise.resolve({data:[],error:null})
  ]);
  for(const r of [profiles,media,comments,reactions]) if(r.error) throw r.error;
  const profileMap:Map<string,any>=new Map((profiles.data??[]).map((p:any)=>[p.id,p]));
  return (posts??[]).map(p=>{
    const author=profileMap.get(p.author_id)??{};
    const pm=(media.data??[]).filter(m=>m.post_id===p.id);
    return {...p,full_name:author.full_name??"VTG trade member",role:author.role??"buyer",
      author_verified:false,country_code:p.country_code??author.country??null,
      media:pm.map(m=>({type:m.media_type,url:m.public_url,thumbnail:m.thumbnail_url})),
      comment_count:(comments.data??[]).filter(c=>c.post_id===p.id).length,
      reaction_count:(reactions.data??[]).filter(r=>r.post_id===p.id).length};
  });
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  const url=new URL(req.url), parts=url.pathname.split("/").filter(Boolean);
  // Vercel rewrites /api/marketplace/* to this function's /feed/* or /users/* paths.
  const path=parts.slice(parts.indexOf("vtg-marketplace")+1).join("/");
  const db=userClient(req);
  try {
    if(req.method==="GET" && path==="feed") {
      const limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit")||50)||50));
      return reply({posts:await listFeed(db,limit)});
    }
    if(req.method==="GET" && path==="users/following") {
      const {user}=await activeUser(db);
      const {data,error}=await db.from("vtg_user_follows").select("following_id").eq("follower_id",user.id);
      if(error) throw error;
      return reply({following:(data??[]).map(x=>({id:x.following_id}))});
    }
    if(req.method==="GET" && path==="news/interactions") {
      const articleUrl=clean(url.searchParams.get("url"),1800), sourceKey=clean(url.searchParams.get("source"),300);
      if(!articleUrl || !/^https?:\/\//i.test(articleUrl)) return fail("A valid article URL is required.");
      const articleKey="article:"+articleUrl, publisherKey="source:"+sourceKey;
      const [{data:likes,error:le},{data:comments,error:ce},{data:sourceFollows,error:fe}] = await Promise.all([
        db.from("vtg_news_interactions").select("id,user_id").eq("target_key",articleKey).eq("interaction_type","like"),
        db.from("vtg_news_interactions").select("id,user_id,body,created_at").eq("target_key",articleKey).eq("interaction_type","comment").order("created_at"),
        sourceKey?db.from("vtg_news_interactions").select("id,user_id").eq("target_key",publisherKey).eq("interaction_type","follow_source"):Promise.resolve({data:[],error:null})
      ]);
      if(le||ce||fe) throw le||ce||fe;
      const {data:{user}}=await db.auth.getUser();
      const ids=[...new Set((comments??[]).map(x=>x.user_id))];
      const {data:profiles,error:pe}=ids.length?await db.from("profiles").select("id,full_name,role").in("id",ids):{data:[],error:null};
      if(pe) throw pe;
      const profileMap=new Map((profiles??[]).map(p=>[p.id,p]));
      return reply({likes:likes?.length??0,comments:(comments??[]).map(c=>({...c,full_name:profileMap.get(c.user_id)?.full_name??"VTG member",role:profileMap.get(c.user_id)?.role??"buyer"})),comment_count:comments?.length??0,liked:!!user&&(likes??[]).some(x=>x.user_id===user.id),following_source:!!user&&(sourceFollows??[]).some(x=>x.user_id===user.id),followers:sourceFollows?.length??0});
    }
    if(req.method==="POST" && path==="news/interactions") {
      await activeUser(db);
      const body=await req.json().catch(()=>({}));
      const articleUrl=clean(body.url,1800), type=clean(body.type,24), sourceKey=clean(body.source,300), comment=clean(body.body,2000);
      if(!/^https?:\/\//i.test(articleUrl)) return fail("A valid article URL is required.");
      const targetKey=type==="follow_source"?"source:"+sourceKey:"article:"+articleUrl;
      const {data,error}=await db.rpc("vtg_news_interaction",{p_article_url:articleUrl,p_target_key:targetKey,p_interaction_type:type,p_body:type==="comment"?comment:null});
      if(error) throw error;
      if(!data?.ok) return reply(data,422);
      return reply(data,201);
    }
    const commentsMatch=path.match(/^feed\/([0-9a-f-]+)\/comments$/i);
    if(req.method==="GET" && commentsMatch) {
      const postId=commentsMatch[1];
      const {data:comments,error}=await db.from("vtg_trade_post_comments").select("id,post_id,author_id,body,created_at").eq("post_id",postId).order("created_at");
      if(error) throw error;
      const authors=[...new Set((comments??[]).map(c=>c.author_id))];
      const {data:profiles,error:pe}=authors.length?await db.from("profiles").select("id,full_name,role").in("id",authors):{data:[],error:null};
      if(pe) throw pe;
      const map=new Map((profiles??[]).map(p=>[p.id,p]));
      return reply({comments:(comments??[]).map(c=>({...c,full_name:map.get(c.author_id)?.full_name??"VTG member",role:map.get(c.author_id)?.role??"buyer"}))});
    }
    if(req.method==="POST" && path==="feed/account") {
      const {user,profile}=await activeUser(db), body=await req.json().catch(()=>({}));
      const postType=clean(body.postType||"update",30), text=clean(body.body,2000), externalUrl=clean(body.externalUrl,1800);
      const allowed=["update","product","advert","news","announcement","trade_tip","video"];
      if(!allowed.includes(postType)) return fail("Unsupported post type.");
      if(!text && !externalUrl) return fail("A post needs text or a link.");
      if(externalUrl && !/^https?:\/\//i.test(externalUrl)) return fail("Only HTTP or HTTPS links are allowed.");
      if(["product","advert"].includes(postType) && !["supplier","admin"].includes(profile.role)) return fail("Supplier adverts and product offers are reserved for supplier accounts.",403);
      if(postType==="announcement" && !["supplier","bank","admin"].includes(profile.role)) return fail("Announcements are reserved for organisation accounts.",403);
      const countryCode=clean(body.countryCode||profile.country,80)||null;
      const region=clean(body.region||inferRegion(countryCode)||"",30)||null;
      if(region && !["Africa","China","South Korea"].includes(region)) return fail("Choose Africa, China or South Korea as the trade region.");
      const {data:created,error}=await db.rpc("vtg_create_trade_post",{
        p_body:text||"Shared media",p_post_type:postType,p_region:region,
        p_external_url:externalUrl||null,p_country_code:countryCode
      });
      if(error) throw error;
      if(!created?.ok) return reply(created,422);
      return reply({post:created.post},201);
    }
    const commentPost=path.match(/^feed\/([0-9a-f-]+)\/comments$/i);
    if(req.method==="POST" && commentPost) {
      const {user}=await activeUser(db), body=await req.json().catch(()=>({})), text=clean(body.body,2000);
      if(!text) return fail("Comment text is required.");
      const {data:created,error}=await db.rpc("vtg_create_trade_post_comment",{p_post_id:commentPost[1],p_body:text});
      if(error) throw error;
      if(!created?.ok) return reply(created,422);
      return reply({comment:created.comment},201);
    }
    const reactionMatch=path.match(/^feed\/([0-9a-f-]+)\/reactions$/i);
    if(req.method==="POST" && reactionMatch) {
      const {user}=await activeUser(db), postId=reactionMatch[1], body=await req.json().catch(()=>({}));
      const reaction=clean(body.reaction||"like",24);
      const {data:existing,error:readError}=await db.from("vtg_trade_post_reactions").select("id").eq("post_id",postId).eq("user_id",user.id).eq("reaction",reaction).maybeSingle();
      if(readError) throw readError;
      if(existing) {
        const {error}=await db.from("vtg_trade_post_reactions").delete().eq("id",existing.id);
        if(error) throw error;
        const {count,error:countError}=await db.from("vtg_trade_post_reactions").select("id",{count:"exact",head:true}).eq("post_id",postId);
        if(countError) throw countError;
        return reply({liked:false,count:count??0});
      }
      const {error}=await db.from("vtg_trade_post_reactions").insert({post_id:postId,user_id:user.id,reaction});
      if(error) throw error;
      const {count,error:countError}=await db.from("vtg_trade_post_reactions").select("id",{count:"exact",head:true}).eq("post_id",postId);
      if(countError) throw countError;
      return reply({liked:true,count:count??0},201);
    }
    const followMatch=path.match(/^users\/([0-9a-f-]+)\/follow$/i);
    if(req.method==="POST" && followMatch) {
      const {user}=await activeUser(db), target=followMatch[1];
      if(target===user.id) return fail("You cannot follow your own account.");
      const {data:existing,error:readError}=await db.from("vtg_user_follows").select("following_id").eq("follower_id",user.id).eq("following_id",target).maybeSingle();
      if(readError) throw readError;
      if(existing) {
        const {error}=await db.from("vtg_user_follows").delete().eq("follower_id",user.id).eq("following_id",target);
        if(error) throw error;
        return reply({following:false});
      }
      const {error}=await db.from("vtg_user_follows").insert({follower_id:user.id,following_id:target});
      if(error) throw error;
      return reply({following:true},201);
    }
    const mediaMatch=path.match(/^media\/feed\/([0-9a-f-]+)$/i);
    if(req.method==="POST" && mediaMatch) {
      const {user}=await activeUser(db);
      const form=await req.formData(), file=form.get("file");
      if(!(file instanceof File)) return fail("A media file is required.");
      if(file.size<1 || file.size>20*1024*1024) return fail("Media must be between 1 byte and 20 MB.");
      const mime=file.type.toLowerCase();
      const kind=mime.startsWith("image/")? "image" : mime.startsWith("video/")? "video" : "";
      const allowed=["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
      if(!kind || !allowed.includes(mime)) return fail("Unsupported media format.");
      const {data:post,error:postError}=await db.from("vtg_trade_posts").select("id").eq("id",mediaMatch[1]).eq("author_id",user.id).maybeSingle();
      if(postError) throw postError;
      if(!post) return fail("Post not found or not owned by this account.",404);
      const ext=(file.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"").slice(0,8)||"bin";
      const storagePath=user.id+"/"+post.id+"/"+crypto.randomUUID()+"."+ext;
      const {error:uploadError}=await db.storage.from(BUCKET).upload(storagePath,file,{contentType:mime,upsert:false});
      if(uploadError) throw uploadError;
      const {data:{publicUrl}}=db.storage.from(BUCKET).getPublicUrl(storagePath);
      const {data:media,error}=await db.from("vtg_trade_post_media").insert({
        post_id:post.id,media_type:kind,storage_path:storagePath,public_url:publicUrl,sort_order:0
      }).select("*").single();
      if(error) {
        await db.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }
      return reply({media},201);
    }
    if(req.method==="POST" && path==="feed") return fail("Use the signed-in account feed to publish.",405);
    return fail("Trade feed endpoint not found.",404);
  } catch(error) {
    console.error("vtg-marketplace:",error);
    return errorResponse(error);
  }
});
