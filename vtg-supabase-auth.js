(function () {
  'use strict';
  const URL = 'https://lxrurbdzphqvkjprlfuv.supabase.co';
  const KEY = 'sb_publishable_WX5_k_ie2eO8aIWeUD4YhQ_koVO2TWT';
  let resolveReady, rejectReady;
  window.VTG_AUTH_READY = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.async = true;
  script.onload = () => {
    try {
      const client = window.supabase.createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
      });
      window.VTG_SUPABASE = client;

      const normalize = (row, user) => {
        const databaseRole = row?.role || 'buyer';
        const requestedRole = user?.user_metadata?.requested_role || null;
        const pendingBusinessVerification = databaseRole === 'buyer' && ['supplier','bank'].includes(requestedRole);
        return {
          id: row?.id || user?.id,
          email: row?.email || user?.email || '',
          fullName: row?.full_name || user?.user_metadata?.full_name || '',
          phone: row?.phone || '',
          role: pendingBusinessVerification ? requestedRole : databaseRole,
          databaseRole,
          accountEnvironment: row?.account_environment || 'trade',
          preferredLanguage: row?.preferred_language || 'en',
          country: row?.country || '',
          city: row?.city || '',
          requestedRole,
          pendingBusinessVerification,
          isActive: row?.is_active !== false,
          workforceMemberships: []
        };
      };

      async function profile(session) {
        const { data, error } = await client.from('profiles')
          .select('id,email,full_name,phone,role,account_environment,preferred_language,country,city,is_active')
          .eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        const result = normalize(data, session.user);
        if (result.accountEnvironment === 'staff') {
          const memberships = await client.from('vtg_workforce_members')
            .select('workspace_role,status')
            .eq('user_id', session.user.id)
            .eq('status', 'active');
          if (memberships.error) throw memberships.error;
          result.workforceMemberships = memberships.data || [];
          return result;
        }
        const table = ({ supplier: 'supplier_profiles', bank: 'bank_profiles', agent: 'agent_profiles' })[result.role];
        if (table) {
          const business = await client.from(table).select('verification_status')
            .eq('user_id', session.user.id).maybeSingle();
          if (business.error) throw business.error;
          result.businessVerificationStatus = business.data?.verification_status || 'pending';
        }
        if (result.pendingBusinessVerification) result.businessVerificationStatus = 'pending';
        return result;
      }

      function save(session, user) {
        localStorage.setItem('vtg_access_token', session.access_token);
        localStorage.setItem('vtg-auth', JSON.stringify({
          user, accessToken: session.access_token, refreshToken: session.refresh_token || null
        }));
        localStorage.setItem('vtg-language', user.preferredLanguage || 'en');
        localStorage.setItem('vtg-country', user.country || '');
      }

      async function addAgreementStatus(user) {
        if (user.accountEnvironment !== 'trade' || !['buyer','supplier','bank'].includes(user.role)) {
          user.agreementRequired = false;
          user.agreementStatus = { required: false };
          return user;
        }
        const { data, error } = await client.rpc('vtg_get_agreement_status');
        if (error) throw error;
        user.agreementStatus = data || { required: false };
        user.agreementRequired = !!user.agreementStatus.required;
        return user;
      }

      async function signInRaw(email, password) {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password
        });
        if (error) throw error;
        const user = await profile(data.session);
        if (!user.isActive) {
          await client.auth.signOut({ scope: 'local' });
          throw new Error('This account is currently inactive. Please contact VTG support.');
        }
        return { session: data.session, user };
      }

      window.VTGAuth = {
        client,
        projectUrl: URL,
        publishableKey: KEY,
        signUp(email, password, metadata) {
          return client.auth.signUp({
            email: email.trim().toLowerCase(), password,
            options: { data: metadata, emailRedirectTo: location.origin + '/auth-callback.html' }
          });
        },
        resendSignupCode(email) {
          return client.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
        },
        async verifySignupCode(email, token) {
          const { data, error } = await client.auth.verifyOtp({
            email: email.trim().toLowerCase(), token: String(token).replace(/\D/g, ''), type: 'signup'
          });
          if (error) throw error;
          if (!data.session) throw new Error('The code was accepted, but no sign-in session was returned. Please sign in.');
          const user = await profile(data.session);
          if (!user.isActive) throw new Error('This account is currently inactive. Please contact VTG support.');
          if (user.accountEnvironment === 'staff') {
            await client.auth.signOut({ scope: 'local' });
            throw new Error('This is a private staff account. Use Workforce Access instead.');
          }
          await addAgreementStatus(user);
          save(data.session, user);
          // Send the verified account's welcome/application receipt without blocking sign-in.
          try {
            const delivery = await client.functions.invoke('vtg-email', { body: { event: 'onboarding' } });
            if (delivery.error) console.warn('VTG onboarding email was not sent:', delivery.error.message || delivery.error);
          } catch (emailError) {
            console.warn('VTG onboarding email is temporarily unavailable:', emailError?.message || emailError);
          }
          return { session: data.session, user };
        },
        async signIn(email, password) {
          const result = await signInRaw(email, password);
          if (result.user.accountEnvironment === 'staff') {
            await client.auth.signOut({ scope: 'local' });
            throw new Error('This is a private staff account. Use Workforce Access instead.');
          }
          await addAgreementStatus(result.user);
          save(result.session, result.user);
          return result;
        },
        async signInWorkforce(email, password, expectedRole) {
          const result = await signInRaw(email, password);
          const user = result.user;
          if (user.accountEnvironment !== 'staff') {
            await client.auth.signOut({ scope: 'local' });
            throw new Error('This is not a VTG staff account. Public trade accounts cannot use workforce sign-in.');
          }
          const allowed = (user.workforceMemberships || []).some(
            item => item.status === 'active' && item.workspace_role === expectedRole
          );
          if (!allowed) {
            await client.auth.signOut({ scope: 'local' });
            throw new Error('This account is not assigned to the ' + expectedRole + ' workspace.');
          }
          const workspaceUser = { ...user, workspaceRole: expectedRole };
          save(result.session, workspaceUser);
          return { session: result.session, user: workspaceUser };
        },
        async signInAdmin(email, password) {
          const result = await signInRaw(email, password);
          if (result.user.role !== 'admin' || result.user.accountEnvironment !== 'staff') {
            await client.auth.signOut({ scope: 'local' });
            throw new Error('Administrator access is restricted to authorised VTG administrators.');
          }
          save(result.session, result.user);
          return result;
        },
        async getCurrent() {
          const { data, error } = await client.auth.getSession();
          if (error) throw error;
          if (!data.session) return null;
          const user = await profile(data.session);
          await addAgreementStatus(user);
          save(data.session, user);
          return { session: data.session, user };
        },
        async signOut() {
          const { error } = await client.auth.signOut();
          if (error) throw error;
          ['vtg_access_token', 'vtg-auth', 'vtg-language', 'vtg-country'].forEach(k => localStorage.removeItem(k));
        },
        save
      };
      resolveReady(window.VTGAuth);
    } catch (error) { rejectReady(error); }
  };
  script.onerror = () => rejectReady(new Error('Could not load the secure sign-in service. Please refresh and try again.'));
  document.head.appendChild(script);
})();