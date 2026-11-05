(function(){
  const URL="https://lxrurbdzphqvkjprlfuv.supabase.co";
  const KEY="sb_publishable_WX5_k_ie2eO8aIWeUD4YhQ_koVO2TWT";
  let resolveReady,rejectReady;
  window.VTG_AUTH_READY=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  s.async=true;
  s.onload=()=>{try{
    const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});
    window.VTG_SUPABASE=client;
    const normalize=(row,user)=>({
      id:row?.id||user?.id,email:row?.email||user?.email||"",
      fullName:row?.full_name||user?.user_metadata?.full_name||"",
      phone:row?.phone||"",role:row?.role||"buyer",
      preferredLanguage:row?.preferred_language||"en",
      country:row?.country||"",city:row?.city||"",requestedRole:user?.user_metadata?.requested_role||null,isActive:row?.is_active!==false
    });
    async function profile(session){
      const {data,error}=await client.from("profiles").select("id,email,full_name,phone,role,preferred_language,country,city,is_active").eq("id",session.user.id).maybeSingle();
      if(error)throw error;
      return normalize(data,session.user);
    }
    function save(session,user){
      localStorage.setItem("vtg_access_token",session.access_token);
      localStorage.setItem("vtg-auth",JSON.stringify({user,accessToken:session.access_token,refreshToken:session.refresh_token||null}));
      localStorage.setItem("vtg-language",user.preferredLanguage||"en");
      localStorage.setItem("vtg-country",user.country||"");
    }
    window.VTGAuth={
      client,
      projectUrl:URL,
      publishableKey:KEY,
      async signUp(email,password,metadata){
        return client.auth.signUp({email,password,options:{data:metadata,emailRedirectTo:location.origin+"/auth-callback.html"}});
      },
      async signIn(email,password){
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
        const user=await profile(data.session);
        if(!user.isActive)throw new Error("This account is currently inactive. Please contact VTG support.");
        save(data.session,user);
        return {session:data.session,user};
      },
      async getCurrent(){
        const {data,error}=await client.auth.getSession();if(error)throw error;
        if(!data.session)return null;
        const user=await profile(data.session);save(data.session,user);
        return {session:data.session,user};
      },
      async signOut(){
        const {error}=await client.auth.signOut();if(error)throw error;
        ["vtg_access_token","vtg-auth","vtg-language","vtg-country"].forEach(k=>localStorage.removeItem(k));
      },
      save
    };
    resolveReady(window.VTGAuth);
  }catch(e){rejectReady(e);}};
  s.onerror=()=>rejectReady(new Error("Could not load the secure sign-in service. Please refresh and try again."));
  document.head.appendChild(s);
})();