/**
 * Sango Fiora — Supabase Client Initialization
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://supabase.com and create a free project
 * 2. Copy your Project URL and Anon Key from Settings → API
 * 3. Replace the placeholders below with your actual values
 */
(function () {
  'use strict';

  // ─── YOUR SUPABASE CREDENTIALS ───
  var SUPABASE_URL = 'https://qyhimioejmuaaxrjxqpz.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_HBqVRHRbXEXKPp6FdytVAQ_jgiUr5D7';
  // ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────

  // Validate config
  if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn(
      '%c[Sango Fiora] Supabase not configured!%c\n' +
      'Open js/supabase-client.js and add your Project URL + Anon Key.\n' +
      'Get them from: https://supabase.com → Your Project → Settings → API',
      'color: #e74c3c; font-weight: bold; font-size: 14px;',
      'color: inherit;'
    );
    // Expose a null client so the rest of the code can guard against it
    window.SangoSupabase = null;
    window.SUPABASE_CONFIGURED = false;
    return;
  }

  // Initialize Supabase client (loaded via CDN in HTML)
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[Sango Fiora] Supabase JS library not loaded. Make sure the CDN script tag is present.');
    window.SangoSupabase = null;
    window.SUPABASE_CONFIGURED = false;
    return;
  }

  var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.SangoSupabase = client;
  window.SUPABASE_CONFIGURED = true;

  console.log('%c[Sango Fiora] Supabase connected ✓', 'color: #27ae60; font-weight: bold;');
})();
