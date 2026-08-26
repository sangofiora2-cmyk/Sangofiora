/**
 * Sango Fiora — Advanced Cart Engine & Dynamic Coupon Engine
 */
(function () {
  'use strict';

  // XSS protection: escape user-facing strings before inserting into innerHTML
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return div.innerHTML;
  }

  var STORAGE_KEY = 'sango-cart-v3';
  var FREE_SHIP_ABOVE = 999;
  var DELIVERY_FEE = 99;

  // Hardcoded coupons (fallback when Supabase not configured)
  var VALID_COUPONS = {
    'WELCOME10': { percent: 10, label: '10% New Member Discount' },
    'PLANTLOVE15': { percent: 15, label: '15% Plant Lover Discount' },
    'BULK20': { percent: 20, label: '20% Bulk Order Discount', minSubtotal: 5000 },
    'SANGO10': { percent: 10, label: '10% Welcome Discount' }
  };

  // Load coupons from Supabase if available (overrides hardcoded)
  function loadCouponsFromSupabase() {
    if (!window.SangoSupabase) return;
    window.SangoSupabase.from('coupons').select('*').eq('is_active', true).then(function (res) {
      if (res.data && res.data.length > 0) {
        VALID_COUPONS = {};
        res.data.forEach(function (c) {
          VALID_COUPONS[c.code] = {
            percent: c.percent,
            label: c.label,
            minSubtotal: c.min_subtotal || 0
          };
        });
        console.log('[Sango] Coupons loaded from Supabase ✓', Object.keys(VALID_COUPONS).length);
      }
    });
  }
  // Load on page ready (after Supabase client is initialized)
  setTimeout(loadCouponsFromSupabase, 500);

  function readCartData() {
    try {
      var d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return d || { items: [], coupon: null };
    } catch (e) {
      return { items: [], coupon: null };
    }
  }

  function writeCartData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (window.AppEvent) window.AppEvent.emit('cart:updated', data);

    // Sync user's private cart to Supabase user_carts table
    if (window.SangoSupabase && window.SangoAuth && window.SangoAuth.isLoggedIn()) {
      var user = window.SangoAuth.getUser();
      window.SangoSupabase.from('user_carts').upsert({
        user_id: user.id,
        items: data.items,
        coupon_code: data.coupon || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(function (res) {
        if (res.error) console.warn('[Sango] Supabase cart sync error:', res.error.message);
      });
    }
  }

  // Handle Auth Changes — Load User's Private Cart on Sign-In, Clear on Sign-Out
  if (window.AppEvent) {
    window.AppEvent.on('auth:changed', function (authData) {
      if (authData.user && window.SangoSupabase) {
        // Fetch User's Private Cart from Supabase
        window.SangoSupabase.from('user_carts').select('*').eq('user_id', authData.user.id).single().then(function (res) {
          if (res.data && res.data.items) {
            var userCart = { items: res.data.items || [], coupon: res.data.coupon_code || null };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userCart));
            if (window.AppEvent) window.AppEvent.emit('cart:updated', userCart);
            console.log('[Sango] Loaded private cart for user:', authData.user.email);
          }
        });
      } else if (!authData.user) {
        // Logged out — clear local cart so data never bleeds
        localStorage.removeItem(STORAGE_KEY);
        var emptyCart = { items: [], coupon: null };
        if (window.AppEvent) window.AppEvent.emit('cart:updated', emptyCart);
      }
    });
  }

  function formatCurrency(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  window.CartEngine = {
    getItems: function () { return readCartData().items; },
    getCoupon: function () { return readCartData().coupon; },

    getTotals: function () {
      var data = readCartData();
      var items = data.items;
      var subtotal = items.reduce(function (n, i) { return n + (i.qty * i.price); }, 0);
      var mrpTotal = items.reduce(function (n, i) { return n + (i.qty * (i.mrp || i.price)); }, 0);
      var mrpSavings = Math.max(0, mrpTotal - subtotal);
      var count = items.reduce(function (n, i) { return n + i.qty; }, 0);

      var couponDiscount = 0;
      if (data.coupon && VALID_COUPONS[data.coupon]) {
        var rule = VALID_COUPONS[data.coupon];
        if (!rule.minSubtotal || subtotal >= rule.minSubtotal) {
          couponDiscount = Math.round(subtotal * (rule.percent / 100));
        }
      }

      var delivery = (subtotal >= FREE_SHIP_ABOVE || items.length === 0) ? 0 : DELIVERY_FEE;
      var taxableSubtotal = Math.max(0, subtotal - couponDiscount);
      var gstAmount = Math.round(taxableSubtotal * 0.18); // 18% GST included preview
      var netTotal = taxableSubtotal + delivery;

      return {
        count: count,
        subtotal: subtotal,
        mrpTotal: mrpTotal,
        mrpSavings: mrpSavings,
        couponCode: data.coupon,
        couponDiscount: couponDiscount,
        couponLabel: data.coupon && VALID_COUPONS[data.coupon] ? VALID_COUPONS[data.coupon].label : '',
        deliveryFee: delivery,
        gstAmount: gstAmount,
        netTotal: netTotal
      };
    },

    addToCart: function (item, qty) {
      var data = readCartData();
      var items = data.items;
      var q = Math.max(1, parseInt(qty || 1, 10));
      var found = items.find(function (i) { return i.slug === item.slug; });
      if (found) {
        found.qty += q;
      } else {
        items.push({
          slug: item.slug,
          name: item.name,
          variant: item.variant || '',
          category: item.category || '',
          size: item.size || '',
          price: parseInt(item.price, 10),
          mrp: parseInt(item.mrp || item.price, 10),
          image: item.image,
          qty: q
        });
      }
      writeCartData(data);
      if (window.showToast) window.showToast(item.name + ' added to cart 🌿');
      openDrawer();
    },

    setQty: function (slug, qty) {
      var data = readCartData();
      var q = parseInt(qty, 10);
      if (q <= 0) {
        data.items = data.items.filter(function (i) { return i.slug !== slug; });
      } else {
        var it = data.items.find(function (i) { return i.slug === slug; });
        if (it) it.qty = q;
      }
      writeCartData(data);
    },

    applyCoupon: function (code) {
      var c = (code || '').trim().toUpperCase();
      if (!c) {
        var data = readCartData();
        data.coupon = null;
        writeCartData(data);
        return { success: true, message: 'Coupon removed' };
      }
      if (!VALID_COUPONS[c]) {
        return { success: false, message: 'Invalid coupon code. Try WELCOME10 or PLANTLOVE15' };
      }
      var totals = this.getTotals();
      var rule = VALID_COUPONS[c];
      if (rule.minSubtotal && totals.subtotal < rule.minSubtotal) {
        return { success: false, message: 'Coupon requires minimum subtotal of ' + formatCurrency(rule.minSubtotal) };
      }
      var d = readCartData();
      d.coupon = c;
      writeCartData(d);
      return { success: true, message: 'Coupon "' + c + '" applied successfully! 🎉' };
    },

    clearCart: function () {
      writeCartData({ items: [], coupon: null });
    }
  };

  // ---------- Slide-Over Drawer UI ----------
  function openDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer || !overlay) return;
    renderDrawer();
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
    requestAnimationFrame(function () { overlay.classList.remove('opacity-0'); });
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(function () { overlay.classList.add('hidden'); }, 300);
    document.body.style.overflow = '';
  }

  function renderDrawer() {
    var items = window.CartEngine.getItems();
    var totals = window.CartEngine.getTotals();

    var wrap = document.getElementById('drawer-items');
    var countEl = document.getElementById('drawer-count');
    var subEl = document.getElementById('drawer-subtotal');
    var delEl = document.getElementById('drawer-delivery');
    var totEl = document.getElementById('drawer-total');
    var badgeEl = document.getElementById('cart-badge');

    if (countEl) countEl.textContent = totals.count;
    if (badgeEl) {
      badgeEl.textContent = totals.count;
      badgeEl.classList.toggle('hidden', totals.count === 0);
      badgeEl.classList.toggle('flex', totals.count > 0);
    }

    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML =
        '<div class="text-center py-16">' +
        '<div class="text-6xl mb-4">🪴</div>' +
        '<p class="font-bold text-gray-900 text-lg mb-1">Your cart is empty</p>' +
        '<p class="text-xs text-gray-400 mb-6">Add some handcrafted artificial plants to get started!</p>' +
        '<a href="/products/" class="inline-block bg-amber-500 text-plant-dark px-6 py-2.5 rounded-full font-bold text-xs">Browse Artificial Plants</a></div>';
      if (subEl) subEl.textContent = formatCurrency(0);
      if (totEl) totEl.textContent = formatCurrency(0);
      if (delEl) delEl.textContent = '—';
      return;
    }

    wrap.innerHTML = items.map(function (i) {
      var safeName = escapeHTML(i.name);
      var safeSlug = escapeHTML(i.slug);
      var safeImage = escapeHTML(i.image);
      var safeSize = escapeHTML(i.size);
      return '<div class="flex gap-3 items-center py-3 border-b border-gray-100 last:border-0" data-slug="' + safeSlug + '">' +
        '<img src="' + safeImage + '" alt="" loading="lazy" class="w-14 h-14 rounded-xl object-cover bg-green-50 shrink-0">' +
        '<div class="flex-1 min-w-0">' +
        '<p class="font-bold text-xs text-gray-900 truncate">' + safeName + '</p>' +
        (i.size ? '<p class="text-[11px] text-gray-400">' + safeSize + ' · Pot Included</p>' : '') +
        '<p class="text-xs font-bold text-plant-main">' + formatCurrency(i.price) + '</p></div>' +
        '<div class="flex items-center gap-1 shrink-0">' +
        '<button type="button" data-dec="' + safeSlug + '" class="w-7 h-7 rounded-lg border border-gray-200 hover:bg-green-50 font-bold text-xs">−</button>' +
        '<span class="w-6 text-center text-xs font-bold">' + i.qty + '</span>' +
        '<button type="button" data-inc="' + safeSlug + '" class="w-7 h-7 rounded-lg border border-gray-200 hover:bg-green-50 font-bold text-xs">+</button>' +
        '<button type="button" data-remove="' + safeSlug + '" class="ml-1 text-gray-300 hover:text-red-500 text-base font-bold">&times;</button>' +
        '</div></div>';
    }).join('');

    if (subEl) subEl.textContent = formatCurrency(totals.subtotal);
    if (delEl) delEl.textContent = totals.deliveryFee === 0 ? 'FREE' : formatCurrency(totals.deliveryFee);
    if (totEl) totEl.textContent = formatCurrency(totals.netTotal);
  }

  // Delegated UI Handlers
  document.addEventListener('click', function (e) {
    // Add to cart buttons
    var addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      window.CartEngine.addToCart({
        slug: addBtn.dataset.slug,
        name: addBtn.dataset.name,
        variant: addBtn.dataset.variant || '',
        category: addBtn.dataset.category || '',
        size: addBtn.dataset.size || '',
        price: parseInt(addBtn.dataset.price, 10),
        mrp: parseInt(addBtn.dataset.mrp || addBtn.dataset.price, 10),
        image: addBtn.dataset.image
      }, parseInt(addBtn.dataset.qty || '1', 10));
      return;
    }

    // Direct Buy Now Button
    var buyBtn = e.target.closest('[data-buy-now]');
    if (buyBtn) {
      e.preventDefault();
      window.CartEngine.addToCart({
        slug: buyBtn.dataset.slug,
        name: buyBtn.dataset.name,
        variant: buyBtn.dataset.variant || '',
        category: buyBtn.dataset.category || '',
        size: buyBtn.dataset.size || '',
        price: parseInt(buyBtn.dataset.price, 10),
        mrp: parseInt(buyBtn.dataset.mrp || buyBtn.dataset.price, 10),
        image: buyBtn.dataset.image
      }, parseInt(buyBtn.dataset.qty || '1', 10));
      location.href = '/cart/?step=shipping';
      return;
    }

    // Quantity Inc / Dec / Remove
    var inc = e.target.closest('[data-inc]');
    if (inc) {
      var it1 = window.CartEngine.getItems().find(function (i) { return i.slug === inc.dataset.inc; });
      if (it1) window.CartEngine.setQty(inc.dataset.inc, it1.qty + 1);
      return;
    }
    var dec = e.target.closest('[data-dec]');
    if (dec) {
      var it2 = window.CartEngine.getItems().find(function (i) { return i.slug === dec.dataset.dec; });
      if (it2) window.CartEngine.setQty(dec.dataset.dec, it2.qty - 1);
      return;
    }
    var rem = e.target.closest('[data-remove]');
    if (rem) {
      window.CartEngine.setQty(rem.dataset.remove, 0);
      if (window.showToast) window.showToast('Item removed from cart');
      return;
    }

    // Drawer Toggles
    if (e.target.closest('#cart-open-btn')) { openDrawer(); return; }
    if (e.target.closest('#cart-close-btn') || e.target.id === 'cart-drawer-overlay') { closeDrawer(); return; }
    
    if (e.target.closest('#drawer-checkout-btn')) {
      closeDrawer();
      location.href = '/cart/';
      return;
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    renderDrawer();
    if (window.AppEvent) window.AppEvent.on('cart:updated', renderDrawer);
  });

})();
