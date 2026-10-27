// VTG browser client bootstrap.
// Load this as a module only on pages that need authenticated Supabase access.
// Uses the public publishable key; never place a service-role key in browser code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const VTG_SUPABASE_URL = "https://lxrurbdzphqvkjprlfuv.supabase.co";
export const VTG_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WX5_k_ie2eO8aIWeUD4YhQ_koVO2TWT";

export const vtgSupabase = createClient(
  VTG_SUPABASE_URL,
  VTG_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

if (typeof window !== "undefined") {
  window.VTG_SUPABASE = vtgSupabase;
}
