/**
 * Sango Plants — Customer Order History & Real-Time Tracker Engine
 */
(function () {
  'use strict';

  function readOrders() {
    return window.CheckoutEngine ? window.CheckoutEngine.getOrders() : [];
  }

  // Fetch live orders from Supabase (overrides localStorage data)
  function fetchSupabaseOrders(callback) {
    if (!window.SangoSupabase || !window.SangoAuth || !window.SangoAuth.isLoggedIn()) {
      callback(readOrders());
      return;
    }
    var user = window.SangoAuth.getUser();
    window.SangoSupabase.from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          callback(readOrders());
          return;
        }
        // Transform Supabase orders to match existing UI format
        var orders = res.data.map(function (o) {
          return {
            orderId: o.order_id,
            dateString: new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: o.status || 'Order Placed',
            statusStep: o.status_step || 1,
            trackingNotes: o.tracking_notes || '',
            items: (o.order_items || []).map(function (i) {
              return { name: i.product_name, slug: i.product_slug, image: i.product_image, price: i.price, qty: i.qty };
            }),
            totals: { netTotal: o.net_total, subtotal: o.subtotal, deliveryFee: o.delivery_fee, couponDiscount: o.coupon_discount }
          };
        });
        callback(orders);
      });
  }

  function formatCurrency(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function renderOrdersDrawer() {
    var wrap = document.getElementById('orders-drawer-items');
    var countEl = document.getElementById('orders-drawer-count');
    if (!wrap) return;

    // Use Supabase orders for logged-in users, localStorage fallback otherwise
    fetchSupabaseOrders(function (orders) {
      if (countEl) countEl.textContent = orders.length;

      if (!orders.length) {
        wrap.innerHTML =
          '<div class="text-center py-16">' +
          '<div class="text-6xl mb-4">📦</div>' +
          '<p class="font-bold text-gray-900 text-lg mb-1">No Orders Placed Yet</p>' +
          '<p class="text-xs text-gray-400 mb-6">Your order history and live delivery tracking will appear here.</p>' +
          '<a href="/products/" class="inline-block bg-amber-500 text-plant-dark px-6 py-2.5 rounded-full font-bold text-xs">Shop Plants</a>' +
          '</div>';
        return;
      }

      wrap.innerHTML = orders.map(function (o) {
        var step = o.statusStep || 1;
      return '<div class="bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-3">' +
        '<div class="flex items-center justify-between border-b border-gray-200 pb-2.5">' +
        '<div>' +
        '<p class="font-bold font-mono text-xs text-gray-900">' + o.orderId + '</p>' +
        '<p class="text-[11px] text-gray-400">' + o.dateString + ' · ' + o.items.length + ' item(s)</p>' +
        '</div>' +
        '<span class="bg-green-100 text-green-800 text-[11px] font-bold px-2.5 py-1 rounded-full">' + o.status + '</span>' +
        '</div>' +

        '<!-- Timeline Progress Bar -->' +
        '<div class="py-2">' +
        '<p class="text-[11px] font-bold text-gray-500 mb-1">Delivery Progress</p>' +
        '<div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">' +
        '<div class="bg-amber-500 h-full transition-all duration-500" style="width: ' + (step * 20) + '%"></div>' +
        '</div>' +
        '<div class="flex justify-between text-[10px] text-gray-400 mt-1">' +
        '<span class="' + (step >= 1 ? 'font-bold text-plant-main' : '') + '">Placed</span>' +
        '<span class="' + (step >= 2 ? 'font-bold text-plant-main' : '') + '">Inspected</span>' +
        '<span class="' + (step >= 3 ? 'font-bold text-plant-main' : '') + '">Packed</span>' +
        '<span class="' + (step >= 4 ? 'font-bold text-plant-main' : '') + '">In Transit</span>' +
        '<span class="' + (step >= 5 ? 'font-bold text-plant-main' : '') + '">Delivered</span>' +
        '</div>' +
        '</div>' +

        '<div class="space-y-1 text-xs border-t border-gray-200 pt-2">' +
        o.items.map(function (i) {
          return '<div class="flex justify-between text-gray-700">' +
            '<span class="truncate">' + i.name + ' × ' + i.qty + '</span>' +
            '<span class="font-bold">' + formatCurrency(i.price * i.qty) + '</span></div>';
        }).join('') +
        '</div>' +

        '<div class="flex justify-between items-center text-xs pt-2 border-t border-gray-200 font-bold">' +
        '<span>Total: <strong class="text-plant-main text-sm">' + formatCurrency(o.totals.netTotal) + '</strong></span>' +
        '<button type="button" data-reorder="' + o.orderId + '" class="bg-amber-500 hover:bg-amber-400 text-plant-dark px-3 py-1.5 rounded-xl font-bold text-[11px]">Reorder All</button>' +
        '</div>' +
        '</div>';
    }).join('');
    }); // end fetchSupabaseOrders callback
  }

  // Delegated Handlers
  document.addEventListener('click', function (e) {
    var reorderBtn = e.target.closest('[data-reorder]');
    if (reorderBtn) {
      var orderId = reorderBtn.dataset.reorder;
      var order = readOrders().find(function (o) { return o.orderId === orderId; });
      if (order && window.CartEngine) {
        order.items.forEach(function (i) { window.CartEngine.addToCart(i, i.qty); });
        if (window.showToast) window.showToast('All items added back to cart 🌱');
      }
      return;
    }

    // Orders Drawer Toggles
    if (e.target.closest('#orders-open-btn')) {
      var drawer = document.getElementById('orders-drawer');
      var overlay = document.getElementById('orders-drawer-overlay');
      if (drawer && overlay) {
        renderOrdersDrawer();
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        requestAnimationFrame(function () { overlay.classList.remove('opacity-0'); });
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    if (e.target.closest('#orders-close-btn') || e.target.id === 'orders-drawer-overlay') {
      var d = document.getElementById('orders-drawer');
      var o = document.getElementById('orders-drawer-overlay');
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
    renderOrdersDrawer();
    if (window.AppEvent) {
      window.AppEvent.on('orders:updated', renderOrdersDrawer);
      window.AppEvent.on('order:created', renderOrdersDrawer);
    }
  });

})();
