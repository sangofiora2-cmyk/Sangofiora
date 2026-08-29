/**
 * Sango Fiora — Authentication Engine (Supabase Auth)
 * Supports: Google OAuth, Facebook OAuth, Email/Password
 */
(function () {
  'use strict';

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return div.innerHTML;
  }

  // Current user state
  var currentUser = null;
  var currentProfile = null;

  window.SangoAuth = {
    // ─── Get Current User ───
    getUser: function () { return currentUser; },
    getProfile: function () { return currentProfile; },
    isLoggedIn: function () { return !!currentUser; },
    isAdmin: function () { return currentProfile && currentProfile.role === 'admin'; },

    // ─── Google Sign-In ───
    signInWithGoogle: function () {
      if (!window.SangoSupabase) return showAuthError();
      return window.SangoSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + '/login/' }
      });
    },

    // ─── Email/Password Sign-Up ───
    signUpWithEmail: function (email, password, fullName) {
      if (!window.SangoSupabase) return showAuthError();
      return window.SangoSupabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: fullName }
        }
      });
    },

    // ─── Email/Password Sign-In ───
    signInWithEmail: function (email, password) {
      if (!window.SangoSupabase) return showAuthError();
      return window.SangoSupabase.auth.signInWithPassword({
        email: email,
        password: password
      });
    },

    // ─── Sign Out ───
    signOut: function () {
      if (!window.SangoSupabase) return;
      return window.SangoSupabase.auth.signOut().then(function () {
        currentUser = null;
        currentProfile = null;
        updateAuthUI();
        if (window.showToast) window.showToast('Signed out successfully');
        // If on admin page, redirect to home
        if (location.pathname.indexOf('/admin') === 0) {
          location.href = '/';
        }
      });
    },

    // ─── Fetch User Profile ───
    fetchProfile: function () {
      if (!window.SangoSupabase || !currentUser) return Promise.resolve(null);
      return window.SangoSupabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
        .then(function (res) {
          if (res.data) {
            currentProfile = res.data;
          }
          return currentProfile;
        });
    },

    // ─── Update Profile ───
    updateProfile: function (data) {
      if (!window.SangoSupabase || !currentUser) return Promise.resolve(null);
      return window.SangoSupabase
        .from('profiles')
        .update(data)
        .eq('id', currentUser.id)
        .select()
        .single()
        .then(function (res) {
          if (res.data) currentProfile = res.data;
          return currentProfile;
        });
    },

    // ─── Initialize Auth (call on page load) ───
    init: function () {
      if (!window.SangoSupabase) {
        updateAuthUI();
        return Promise.resolve(null);
      }

      // Listen for auth state changes
      window.SangoSupabase.auth.onAuthStateChange(function (event, session) {
        if (session && session.user) {
          currentUser = session.user;
          window.SangoAuth.fetchProfile().then(function () {
            updateAuthUI();
            if (window.AppEvent) window.AppEvent.emit('auth:changed', { user: currentUser, profile: currentProfile });
          });
        } else {
          currentUser = null;
          currentProfile = null;
          updateAuthUI();
          if (window.AppEvent) window.AppEvent.emit('auth:changed', { user: null, profile: null });
        }
      });

      // Get initial session
      return window.SangoSupabase.auth.getSession().then(function (res) {
        if (res.data && res.data.session) {
          currentUser = res.data.session.user;
          return window.SangoAuth.fetchProfile().then(function () {
            updateAuthUI();
            return currentUser;
          });
        }
        updateAuthUI();
        return null;
      });
    }
  };

  // ─── Update Header UI Based on Auth State ───
  function updateAuthUI() {
    var loginBtn = document.getElementById('auth-login-btn');
    var userMenu = document.getElementById('auth-user-menu');
    var userName = document.getElementById('auth-user-name');
    var userAvatar = document.getElementById('auth-user-avatar');
    var adminLink = document.getElementById('auth-admin-link');

    if (currentUser) {
      // ─── LOGGED IN ───
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) userMenu.classList.remove('hidden');

      var meta = currentUser.user_metadata || {};
      var displayName = (currentProfile && currentProfile.full_name) || meta.full_name || meta.name || currentUser.email || 'User';
      var avatarUrl = (currentProfile && currentProfile.avatar_url) || meta.avatar_url || meta.picture || '';

      if (userName) userName.textContent = displayName;

      if (userAvatar) {
        if (avatarUrl) {
          userAvatar.src = avatarUrl;
          userAvatar.classList.remove('hidden');
        } else {
          userAvatar.classList.add('hidden');
        }
      }

      if (adminLink) {
        var isSuperAdmin = (currentUser && currentUser.email && currentUser.email.toLowerCase() === 'sangofiora2@gmail.com');
        var isAdminUser = (currentProfile && currentProfile.role === 'admin') || (meta.role === 'admin') || isSuperAdmin;
        adminLink.classList.toggle('hidden', !isAdminUser);
      }
    } else {
      // ─── NOT LOGGED IN ───
      if (loginBtn) loginBtn.style.display = '';
      if (userMenu) userMenu.classList.add('hidden');
      if (adminLink) adminLink.classList.add('hidden');
    }
  }

  function showAuthError() {
    if (window.showToast) {
      window.showToast('Supabase not configured. Check js/supabase-client.js');
    }
    return Promise.resolve({ error: { message: 'Supabase not configured' } });
  }

  // ─── Auto-init on DOMContentLoaded ───
  document.addEventListener('DOMContentLoaded', function () {
    window.SangoAuth.init();
  });

  // ─── Delegated Click Handlers for Auth Buttons ───
  document.addEventListener('click', function (e) {
    if (e.target.closest('#auth-login-btn') || e.target.closest('[data-auth-login]')) {
      e.preventDefault();
      location.href = '/login.html';
      return;
    }
    if (e.target.closest('#auth-signout-btn') || e.target.closest('[data-auth-signout]')) {
      e.preventDefault();
      window.SangoAuth.signOut();
      return;
    }
    if (e.target.closest('[data-auth-google]')) {
      e.preventDefault();
      window.SangoAuth.signInWithGoogle();
      return;
    }
  });

})();
