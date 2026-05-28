/* ================================================
   SablonKas - Supabase Configuration
   ================================================ */

(function () {
  const SUPABASE_URL = 'https://qofqbypslpkztwsswehl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_eb76tst6orf2mzrYMx9iIA_XBbRldDh';

  try {
    const { createClient } = window.supabase;
    window._supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Supabase] Initialized ✅');
  } catch (err) {
    console.error('[Supabase] Init gagal:', err);
    window._supabaseClient = null;
  }
})();
