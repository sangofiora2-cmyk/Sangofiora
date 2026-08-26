/**
 * Sango Plants — Wishlist Engine & Favorites System
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sango-wishlist-v1';

  function readWishlist() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function writeWishlist(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (window.AppEvent) window.AppEvent.emit('wishlist:updated', list);

    // Sync user's private wishlist to Supabase user_wishlists table
    if (window.SangoSupabase && window.SangoAuth && window.SangoAuth.isLoggedIn()) {
      var user = window.SangoAuth.getUser();
      window.SangoSupabase.from('user_wishlists').upsert({
        user_id: user.id,
        items: list,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(function (res) {
        if (res.error) console.warn('[Sango] Supabase wishlist sync error:', res.error.message);
      });
    }
  }

  // Handle Auth Changes — Load User's Private Wishlist on Sign-In, Clear on Sign-Out
  if (window.AppEvent) {
    window.AppEvent.on('auth:changed', function (authData) {
      if (authData.user && window.SangoSupabase) {
        window.SangoSupabase.from('user_wishlists').select('*').eq('user_id', authData.user.id).single().then(function (res) {
          if (res.data && res.data.items) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.items || []));
            if (window.AppEvent) window.AppEvent.emit('wishlist:updated', res.data.items || []);
            console.log('[Sango] Loaded private wishlist for user:', authData.user.email);
          }
        });
      } else if (!authData.user) {
        localStorage.removeItem(STORAGE_KEY);
        if (window.AppEvent) window.AppEvent.emit('wishlist:updated', []);
      }
    });
  }

  window.WishlistEngine = {
    getWishlist: readWishlist,
    has: function (slug) {
      return readWishlist().some(function (i) { return i.slug === slug; });
    },
    toggle: function (item) {
      var list = readWishlist();
      var idx = list.findIndex(function (i) { return i.slug === item.slug; });
      var added = false;
      if (idx > -1) {
        list.splice(idx, 1);
        if (window.showToast) window.showToast('Removed from wishlist');
      } else {
        list.push({
          slug: item.slug,
          name: item.name,
          category: item.category || '',
          size: item.size || '',
          price: item.price,
          mrp: item.mrp || item.price,
          image: item.image
        });
        added = true;
        if (window.showToast) window.showToast('Saved to your wishlist ❤️');
      }
      writeWishlist(list);
      return added;
    },
    remove: function (slug) {
      var list = readWishlist().filter(function (i) { return i.slug !== slug; });
      writeWishlist(list);
    }
  };

  function syncWishlistUI() {
    var list = readWishlist();
    
    // Update Badges
    document.querySelectorAll('#wishlist-badge').forEach(function (badge) {
      badge.textContent = list.length;
      badge.classList.toggle('hidden', list.length === 0);
      badge.classList.toggle('flex', list.length > 0);
    });

    // Update Heart Buttons
    document.querySelectorAll('[data-wishlist-btn]').forEach(function (btn) {
      var slug = btn.dataset.slug;
      var isSaved = window.WishlistEngine.has(slug);
      btn.classList.toggle('text-red-500', isSaved);
      btn.classList.toggle('text-gray-400', !isSaved);
      var svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isSaved ? 'currentColor' : 'none');
      }
    });

    // Render Wishlist Drawer
    renderWishlistDrawer();
  }

  function renderWishlistDrawer() {
    var wrap = document.getElementById('wishlist-drawer-items');
    var countEl = document.getElementById('wishlist-drawer-count');
    if (!wrap) return;

    var list = readWishlist();
    if (countEl) countEl.textContent = list.length;

    if (!list.length) {
      wrap.innerHTML =
        '<div class="text-center py-16">' +
        '<div class="text-6xl mb-4">❤️</div>' +
        '<p class="font-bold text-gray-900 text-lg mb-1">Your Wishlist is Empty</p>' +
        '<p class="text-xs text-gray-400 mb-6">Tap the heart icon on any plant to save it for later.</p>' +
        '<a href="/products/" class="inline-block bg-amber-500 text-plant-dark px-6 py-2.5 rounded-full font-bold text-xs">Explore Plants</a>' +
        '</div>';
      return;
    }

    wrap.innerHTML = list.map(function (i) {
      return '<div class="flex gap-3 items-center py-3 border-b border-gray-100 last:border-0">' +
        '<img src="' + i.image + '" alt="" class="w-14 h-14 rounded-xl object-cover bg-green-50 shrink-0">' +
        '<div class="flex-1 min-w-0">' +
        '<p class="font-bold text-xs text-gray-900 truncate"><a href="/products/' + i.slug + '/" class="hover:text-plant-main">' + i.name + '</a></p>' +
        '<p class="text-[11px] text-gray-400">' + i.category + ' · ' + i.size + '</p>' +
        '<p class="text-xs font-bold text-plant-main">₹' + i.price + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-2 shrink-0">' +
        '<button type="button" data-move-to-cart="' + i.slug + '" class="bg-plant-accent text-plant-dark px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-opacity-90">Move to Cart</button>' +
        '<button type="button" data-remove-wishlist="' + i.slug + '" class="text-gray-300 hover:text-red-500 text-lg font-bold px-1">&times;</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  // Delegated Event Handlers
  document.addEventListener('click', function (e) {
    var wishBtn = e.target.closest('[data-wishlist-btn]');
    if (wishBtn) {
      e.preventDefault();
      e.stopPropagation();
      window.WishlistEngine.toggle({
        slug: wishBtn.dataset.slug,
        name: wishBtn.dataset.name,
        category: wishBtn.dataset.category,
        size: wishBtn.dataset.size,
        price: parseInt(wishBtn.dataset.price, 10),
        mrp: parseInt(wishBtn.dataset.mrp || wishBtn.dataset.price, 10),
        image: wishBtn.dataset.image
      });
      return;
    }

    var moveBtn = e.target.closest('[data-move-to-cart]');
    if (moveBtn) {
      var slug = moveBtn.dataset.moveToCart;
      var item = readWishlist().find(function (i) { return i.slug === slug; });
      if (item && window.CartEngine) {
        window.CartEngine.addToCart(item, 1);
        window.WishlistEngine.remove(slug);
        if (window.showToast) window.showToast(item.name + ' moved to cart 🌱');
      }
      return;
    }

    var remWish = e.target.closest('[data-remove-wishlist]');
    if (remWish) {
      window.WishlistEngine.remove(remWish.dataset.removeWishlist);
      return;
    }

    // Wishlist Drawer toggles
    if (e.target.closest('#wishlist-open-btn')) {
      var drawer = document.getElementById('wishlist-drawer');
      var overlay = document.getElementById('wishlist-drawer-overlay');
      if (drawer && overlay) {
        syncWishlistUI();
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        requestAnimationFrame(function () { overlay.classList.remove('opacity-0'); });
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    if (e.target.closest('#wishlist-close-btn') || e.target.id === 'wishlist-drawer-overlay') {
      var d = document.getElementById('wishlist-drawer');
      var o = document.getElementById('wishlist-drawer-overlay');
      if (d && o) {
        d.classList.add('translate-x-full');
        o.classList.add('opacity-0');
        setTimeout(function () { o.classList.add('hidden'); }, 300);
        document.body.style.overflow = '';
      }
      return;
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    syncWishlistUI();
    if (window.AppEvent) window.AppEvent.on('wishlist:updated', syncWishlistUI);
  });

})();
