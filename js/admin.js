/**
 * Sango Fiora — Admin Dashboard Engine
 * Handles: Auth gate, products CRUD, orders management, coupons, analytics
 */
(function () {
  'use strict';

  var sb = null; // Supabase client ref
  var STATUS_LABELS = {
    1: 'Order Placed',
    2: 'Quality Inspection',
    3: 'Packed',
    4: 'Out for Delivery',
    5: 'Delivered'
  };

  // ─── Toast ───
  function toast(msg) {
    var el = document.getElementById('admin-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.add('hidden'); }, 3000);
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return div.innerHTML;
  }

  function formatCurrency(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  // ─── Auth Gate ───
  function checkAdminAuth() {
    var gate = document.getElementById('auth-gate');
    var main = document.getElementById('admin-main');
    var gateMsg = document.getElementById('auth-gate-msg');

    if (!window.SangoSupabase) {
      if (gateMsg) gateMsg.textContent = 'Supabase not configured. Open js/supabase-client.js and add your credentials.';
      return;
    }

    sb = window.SangoSupabase;

    sb.auth.getSession().then(function (res) {
      if (!res.data || !res.data.session) {
        if (gateMsg) gateMsg.textContent = 'You need to sign in with an admin account.';
        return;
      }

      var user = res.data.session.user;
      document.getElementById('admin-user-name').textContent = user.email;

      // Check if user is admin
      sb.from('profiles').select('role, full_name').eq('id', user.id).single().then(function (profileRes) {
        if (profileRes.error || !profileRes.data) {
          if (gateMsg) gateMsg.textContent = 'Profile not found. Please contact support.';
          return;
        }

        if (profileRes.data.role !== 'admin') {
          if (gateMsg) gateMsg.textContent = 'Access denied. Your account (' + user.email + ') is not an admin. Update your role in Supabase Dashboard → profiles table.';
          return;
        }

        // ✅ Admin verified
        if (gate) gate.classList.add('hidden');
        if (main) main.classList.remove('hidden');
        document.getElementById('admin-user-name').textContent = profileRes.data.full_name || user.email;

        loadDashboard();
        loadProducts();
        loadOrders();
        loadCoupons();
      });
    });
  }

  // ─── Sign Out ───
  document.getElementById('admin-signout').addEventListener('click', function () {
    if (sb) sb.auth.signOut().then(function () { location.href = '/'; });
  });

  // ─── Tab Navigation ───
  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.admin-tab').forEach(function (t) {
        t.classList.remove('tab-active');
        t.classList.add('bg-gray-100', 'text-gray-700');
      });
      tab.classList.add('tab-active');
      tab.classList.remove('bg-gray-100', 'text-gray-700');

      var target = tab.dataset.adminTab;
      document.querySelectorAll('.admin-tab-content').forEach(function (c) {
        c.classList.add('hidden');
      });
      var el = document.getElementById('tab-' + target);
      if (el) { el.classList.remove('hidden'); el.classList.add('fade-in'); }
    });
  });


  // ═══════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════
  function loadDashboard() {
    // Product stats
    sb.from('products').select('id, is_sold_out, is_active', { count: 'exact' }).eq('is_active', true).then(function (res) {
      var products = res.data || [];
      document.getElementById('stat-products').textContent = products.length;
      document.getElementById('stat-soldout').textContent = products.filter(function (p) { return p.is_sold_out; }).length;
    });

    // Order stats
    sb.from('orders').select('net_total', { count: 'exact' }).then(function (res) {
      var orders = res.data || [];
      document.getElementById('stat-orders').textContent = orders.length;
      var revenue = orders.reduce(function (s, o) { return s + (o.net_total || 0); }, 0);
      document.getElementById('stat-revenue').textContent = formatCurrency(revenue);
    });

    // Recent orders
    sb.from('orders').select('*').order('created_at', { ascending: false }).limit(5).then(function (res) {
      var orders = res.data || [];
      var wrap = document.getElementById('dashboard-recent-orders');
      if (!wrap) return;
      if (!orders.length) {
        wrap.innerHTML = '<p class="p-8 text-center text-gray-400 text-sm">No orders yet. Orders placed by customers will appear here.</p>';
        return;
      }
      wrap.innerHTML = '<table class="w-full text-xs"><thead class="bg-gray-50 border-b"><tr>' +
        '<th class="text-left px-4 py-2 font-bold text-gray-500">Order ID</th>' +
        '<th class="text-left px-4 py-2 font-bold text-gray-500">Customer</th>' +
        '<th class="text-right px-4 py-2 font-bold text-gray-500">Total</th>' +
        '<th class="text-center px-4 py-2 font-bold text-gray-500">Status</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">' +
        orders.map(function (o) {
          return '<tr class="hover:bg-gray-50">' +
            '<td class="px-4 py-3 font-bold mono">' + escapeHTML(o.order_id) + '</td>' +
            '<td class="px-4 py-3">' + escapeHTML(o.customer_name) + '</td>' +
            '<td class="px-4 py-3 text-right font-bold">' + formatCurrency(o.net_total) + '</td>' +
            '<td class="px-4 py-3 text-center"><span class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-bold">' + escapeHTML(o.status) + '</span></td>' +
            '</tr>';
        }).join('') + '</tbody></table>';
    });
  }


  // ═══════════════════════════════════════
  //  PRODUCTS CRUD
  // ═══════════════════════════════════════
  var allProducts = [];

  function loadProducts() {
    sb.from('products').select('*').order('created_at', { ascending: false }).then(function (res) {
      allProducts = res.data || [];
      renderProductsTable(allProducts);
    });
  }

  function renderProductsTable(products) {
    var tbody = document.getElementById('admin-products-tbody');
    if (!tbody) return;
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">No products found. Click "Add New Product" to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(function (p) {
      var statusBadge = p.is_sold_out
        ? '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Sold Out</span>'
        : p.is_active
          ? '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Active</span>'
          : '<span class="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold">Hidden</span>';

      return '<tr class="hover:bg-gray-50 transition-colors">' +
        '<td class="px-4 py-3"><div class="flex items-center gap-3">' +
          '<img src="' + escapeHTML(p.image) + '" alt="" class="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0">' +
          '<div><p class="font-bold text-gray-900 text-xs">' + escapeHTML(p.name) + '</p>' +
          '<p class="text-[10px] text-gray-400">' + escapeHTML(p.size) + (p.variant ? ' · ' + escapeHTML(p.variant) : '') + '</p></div></div></td>' +
        '<td class="px-4 py-3 text-xs">' + escapeHTML(p.category) + '</td>' +
        '<td class="px-4 py-3 text-right font-bold text-xs">' + formatCurrency(p.price) + '</td>' +
        '<td class="px-4 py-3 text-right text-xs text-gray-400 line-through">' + formatCurrency(p.mrp) + '</td>' +
        '<td class="px-4 py-3 text-center text-xs font-bold">' + (p.stock != null ? p.stock : '∞') + '</td>' +
        '<td class="px-4 py-3 text-center">' + statusBadge + '</td>' +
        '<td class="px-4 py-3 text-center">' +
          '<div class="flex items-center justify-center gap-1">' +
          '<button data-edit-product="' + p.id + '" class="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit"><span class="material-symbols-outlined text-base">edit</span></button>' +
          '<button data-toggle-soldout="' + p.id + '" class="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Toggle Sold Out"><span class="material-symbols-outlined text-base">' + (p.is_sold_out ? 'check_circle' : 'cancel') + '</span></button>' +
          '<button data-delete-product="' + p.id + '" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><span class="material-symbols-outlined text-base">delete</span></button>' +
          '</div></td>' +
        '</tr>';
    }).join('');
  }

  // Product search/filter
  document.getElementById('admin-product-search').addEventListener('input', filterProducts);
  document.getElementById('admin-product-filter').addEventListener('change', filterProducts);
  document.getElementById('admin-stock-filter').addEventListener('change', filterProducts);

  function filterProducts() {
    var query = (document.getElementById('admin-product-search').value || '').toLowerCase();
    var cat = document.getElementById('admin-product-filter').value;
    var stock = document.getElementById('admin-stock-filter').value;

    var filtered = allProducts.filter(function (p) {
      var matchName = !query || p.name.toLowerCase().indexOf(query) !== -1 || p.slug.toLowerCase().indexOf(query) !== -1;
      var matchCat = cat === 'all' || p.category === cat;
      var matchStock = stock === 'all' ||
        (stock === 'active' && !p.is_sold_out && p.is_active) ||
        (stock === 'soldout' && p.is_sold_out) ||
        (stock === 'hidden' && !p.is_active);
      return matchName && matchCat && matchStock;
    });
    renderProductsTable(filtered);
  }

  // Product Modal
  var productModal = document.getElementById('product-modal');
  document.getElementById('btn-add-product').addEventListener('click', function () {
    openProductModal(null);
  });
  document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
  document.getElementById('cancel-product-modal').addEventListener('click', closeProductModal);

  function openProductModal(product) {
    document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add New Product';
    document.getElementById('pf-id').value = product ? product.id : '';
    document.getElementById('pf-name').value = product ? product.name : '';
    document.getElementById('pf-slug').value = product ? product.slug : '';
    document.getElementById('pf-category').value = product ? product.category : '';
    document.getElementById('pf-size').value = product ? product.size : '';
    document.getElementById('pf-variant').value = product ? (product.variant || '') : '';
    document.getElementById('pf-price').value = product ? product.price : '';
    document.getElementById('pf-mrp').value = product ? product.mrp : '';
    document.getElementById('pf-stock').value = product ? (product.stock || 100) : 100;
    document.getElementById('pf-image').value = product ? product.image : '';
    document.getElementById('pf-description').value = product ? (product.description || '') : '';
    document.getElementById('pf-pot-included').checked = product ? product.pot_included : true;
    document.getElementById('pf-active').checked = product ? product.is_active : true;
    document.getElementById('pf-soldout').checked = product ? product.is_sold_out : false;
    productModal.classList.remove('hidden');
  }

  function closeProductModal() {
    productModal.classList.add('hidden');
  }

  // Auto-generate slug from name
  document.getElementById('pf-name').addEventListener('input', function () {
    var id = document.getElementById('pf-id').value;
    if (id) return; // Don't auto-update slug on edit
    var size = document.getElementById('pf-size').value || '';
    var name = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (size) name += '-' + size.toLowerCase().replace(/[^a-z0-9]+/g, '');
    document.getElementById('pf-slug').value = name;
  });

  // Save Product
  document.getElementById('product-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('pf-id').value;
    var price = parseInt(document.getElementById('pf-price').value, 10);
    var mrp = parseInt(document.getElementById('pf-mrp').value, 10);
    var discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

    var data = {
      name: document.getElementById('pf-name').value.trim(),
      slug: document.getElementById('pf-slug').value.trim(),
      category: document.getElementById('pf-category').value,
      size: document.getElementById('pf-size').value.trim(),
      variant: document.getElementById('pf-variant').value.trim(),
      price: price,
      mrp: mrp,
      discount: discount,
      stock: parseInt(document.getElementById('pf-stock').value, 10) || 0,
      image: document.getElementById('pf-image').value.trim(),
      description: document.getElementById('pf-description').value.trim(),
      pot_included: document.getElementById('pf-pot-included').checked,
      is_active: document.getElementById('pf-active').checked,
      is_sold_out: document.getElementById('pf-soldout').checked
    };

    var promise;
    if (id) {
      promise = sb.from('products').update(data).eq('id', id);
    } else {
      promise = sb.from('products').insert(data);
    }

    promise.then(function (res) {
      if (res.error) {
        toast('Error: ' + res.error.message);
        return;
      }
      toast(id ? 'Product updated! ✅' : 'Product added! 🌱');
      closeProductModal();
      loadProducts();
      loadDashboard();
    });
  });

  // Delegated click handlers for product table
  document.addEventListener('click', function (e) {
    // Edit product
    var editBtn = e.target.closest('[data-edit-product]');
    if (editBtn) {
      var product = allProducts.find(function (p) { return p.id === editBtn.dataset.editProduct; });
      if (product) openProductModal(product);
      return;
    }

    // Toggle sold out
    var soldoutBtn = e.target.closest('[data-toggle-soldout]');
    if (soldoutBtn) {
      var pid = soldoutBtn.dataset.toggleSoldout;
      var prod = allProducts.find(function (p) { return p.id === pid; });
      if (prod) {
        sb.from('products').update({ is_sold_out: !prod.is_sold_out }).eq('id', pid).then(function (res) {
          if (res.error) { toast('Error: ' + res.error.message); return; }
          toast(prod.is_sold_out ? 'Product back in stock! ✅' : 'Marked as Sold Out 🚫');
          loadProducts();
          loadDashboard();
        });
      }
      return;
    }

    // Delete product
    var delBtn = e.target.closest('[data-delete-product]');
    if (delBtn) {
      if (!confirm('Are you sure you want to permanently delete this product?')) return;
      sb.from('products').delete().eq('id', delBtn.dataset.deleteProduct).then(function (res) {
        if (res.error) { toast('Error: ' + res.error.message); return; }
        toast('Product deleted 🗑️');
        loadProducts();
        loadDashboard();
      });
      return;
    }

    // View order
    var viewOrder = e.target.closest('[data-view-order]');
    if (viewOrder) {
      openOrderModal(viewOrder.dataset.viewOrder);
      return;
    }
  });


  // ═══════════════════════════════════════
  //  ORDERS MANAGEMENT
  // ═══════════════════════════════════════
  var allOrders = [];

  function loadOrders() {
    sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).then(function (res) {
      allOrders = res.data || [];
      renderOrdersTable(allOrders);
    });
  }

  function renderOrdersTable(orders) {
    var tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">No orders yet. Customer orders will appear here automatically.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(function (o) {
      var statusColor = o.status_step >= 5 ? 'bg-green-100 text-green-800' :
                        o.status_step >= 3 ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800';
      var payColor = o.payment_status === 'Paid' ? 'text-green-600' : 'text-amber-600';
      var date = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

      return '<tr class="hover:bg-gray-50 transition-colors">' +
        '<td class="px-4 py-3 font-bold mono text-xs">' + escapeHTML(o.order_id) + '</td>' +
        '<td class="px-4 py-3 text-xs"><p class="font-bold">' + escapeHTML(o.customer_name) + '</p><p class="text-gray-400 text-[10px]">' + escapeHTML(o.customer_phone || '') + '</p></td>' +
        '<td class="px-4 py-3 text-xs text-gray-500">' + date + '</td>' +
        '<td class="px-4 py-3 text-right font-bold text-xs">' + formatCurrency(o.net_total) + '</td>' +
        '<td class="px-4 py-3 text-center text-xs font-bold ' + payColor + '">' + escapeHTML(o.payment_status || 'Pending') + '</td>' +
        '<td class="px-4 py-3 text-center"><span class="' + statusColor + ' px-2 py-0.5 rounded-full text-[10px] font-bold">' + escapeHTML(o.status) + '</span></td>' +
        '<td class="px-4 py-3 text-center"><button data-view-order="' + o.id + '" class="bg-forest/10 hover:bg-forest/20 text-forest px-3 py-1 rounded-lg text-[10px] font-bold transition-colors">View / Update</button></td>' +
        '</tr>';
    }).join('');
  }

  // Order filters
  document.getElementById('admin-order-status-filter').addEventListener('change', filterOrders);
  document.getElementById('admin-order-search').addEventListener('input', filterOrders);

  function filterOrders() {
    var status = document.getElementById('admin-order-status-filter').value;
    var query = (document.getElementById('admin-order-search').value || '').toLowerCase();
    var filtered = allOrders.filter(function (o) {
      var matchStatus = status === 'all' || o.status === status;
      var matchSearch = !query || o.order_id.toLowerCase().indexOf(query) !== -1 || (o.customer_name || '').toLowerCase().indexOf(query) !== -1;
      return matchStatus && matchSearch;
    });
    renderOrdersTable(filtered);
  }

  // Order Detail Modal
  var orderModal = document.getElementById('order-modal');
  var currentOrderId = null;

  document.getElementById('close-order-modal').addEventListener('click', function () {
    orderModal.classList.add('hidden');
  });

  function openOrderModal(orderId) {
    var order = allOrders.find(function (o) { return o.id === orderId; });
    if (!order) return;
    currentOrderId = orderId;

    document.getElementById('order-modal-title').textContent = 'Order ' + order.order_id;
    document.getElementById('order-status-select').value = order.status_step || 1;
    document.getElementById('order-tracking-notes').value = order.tracking_notes || '';

    var content = document.getElementById('order-modal-content');
    var items = order.order_items || [];
    content.innerHTML =
      '<div class="space-y-2 text-xs">' +
      '<div class="grid grid-cols-2 gap-2">' +
        '<div><p class="text-gray-400 font-bold">Customer</p><p class="font-bold">' + escapeHTML(order.customer_name) + '</p></div>' +
        '<div><p class="text-gray-400 font-bold">Phone</p><p>' + escapeHTML(order.customer_phone) + '</p></div>' +
        '<div class="col-span-2"><p class="text-gray-400 font-bold">Address</p><p>' + escapeHTML(order.shipping_address) + ', ' + escapeHTML(order.city || '') + ', ' + escapeHTML(order.state || '') + ' - ' + escapeHTML(order.pincode) + '</p></div>' +
        '<div><p class="text-gray-400 font-bold">Payment</p><p>' + escapeHTML(order.payment_method) + ' (' + escapeHTML(order.payment_status || 'Pending') + ')</p></div>' +
        '<div><p class="text-gray-400 font-bold">Total</p><p class="font-bold text-base text-forest">' + formatCurrency(order.net_total) + '</p></div>' +
      '</div>' +
      '<hr class="border-gray-100">' +
      '<p class="font-bold text-gray-700">Items (' + items.length + ')</p>' +
      items.map(function (i) {
        return '<div class="flex justify-between py-1">' +
          '<span>' + escapeHTML(i.product_name) + ' × ' + i.qty + '</span>' +
          '<span class="font-bold">' + formatCurrency(i.price * i.qty) + '</span></div>';
      }).join('') +
      '</div>';

    orderModal.classList.remove('hidden');
  }

  // Update Order Status
  document.getElementById('btn-update-order-status').addEventListener('click', function () {
    if (!currentOrderId) return;
    var step = parseInt(document.getElementById('order-status-select').value, 10);
    var notes = document.getElementById('order-tracking-notes').value.trim();

    sb.from('orders').update({
      status_step: step,
      status: STATUS_LABELS[step] || 'Order Placed',
      tracking_notes: notes
    }).eq('id', currentOrderId).then(function (res) {
      if (res.error) { toast('Error: ' + res.error.message); return; }
      toast('Order status updated to "' + STATUS_LABELS[step] + '" ✅');
      orderModal.classList.add('hidden');
      loadOrders();
      loadDashboard();
    });
  });


  // ═══════════════════════════════════════
  //  COUPONS
  // ═══════════════════════════════════════
  function loadCoupons() {
    sb.from('coupons').select('*').order('created_at', { ascending: false }).then(function (res) {
      var coupons = res.data || [];
      var wrap = document.getElementById('admin-coupons-list');
      if (!wrap) return;
      if (!coupons.length) {
        wrap.innerHTML = '<p class="text-gray-400 text-sm col-span-full text-center py-8">No coupons yet.</p>';
        return;
      }
      wrap.innerHTML = coupons.map(function (c) {
        return '<div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm admin-card">' +
          '<div class="flex items-center justify-between mb-3">' +
          '<span class="mono font-bold text-lg text-forest">' + escapeHTML(c.code) + '</span>' +
          '<span class="' + (c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + ' px-2 py-0.5 rounded-full text-[10px] font-bold">' + (c.is_active ? 'Active' : 'Disabled') + '</span>' +
          '</div>' +
          '<p class="text-xs text-gray-600 mb-2">' + escapeHTML(c.label) + '</p>' +
          '<div class="flex items-center justify-between text-xs text-gray-400">' +
          '<span>' + c.percent + '% off' + (c.min_subtotal > 0 ? ' (min ₹' + c.min_subtotal + ')' : '') + '</span>' +
          '<div class="flex gap-2">' +
          '<button data-toggle-coupon="' + c.id + '" data-active="' + c.is_active + '" class="text-amber-600 hover:text-amber-800 font-bold text-[11px]">' + (c.is_active ? 'Disable' : 'Enable') + '</button>' +
          '<button data-delete-coupon="' + c.id + '" class="text-red-500 hover:text-red-700 font-bold text-[11px]">Delete</button>' +
          '</div></div></div>';
      }).join('');
    });
  }

  // Coupon modal
  var couponModal = document.getElementById('coupon-modal');
  document.getElementById('btn-add-coupon').addEventListener('click', function () {
    couponModal.classList.remove('hidden');
  });
  document.getElementById('close-coupon-modal').addEventListener('click', function () {
    couponModal.classList.add('hidden');
  });

  document.getElementById('coupon-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      code: document.getElementById('cf-code').value.trim().toUpperCase(),
      percent: parseInt(document.getElementById('cf-percent').value, 10),
      min_subtotal: parseInt(document.getElementById('cf-min').value, 10) || 0,
      label: document.getElementById('cf-label').value.trim(),
      is_active: true
    };
    sb.from('coupons').insert(data).then(function (res) {
      if (res.error) { toast('Error: ' + res.error.message); return; }
      toast('Coupon created! 🏷️');
      couponModal.classList.add('hidden');
      document.getElementById('coupon-form').reset();
      loadCoupons();
    });
  });

  // Coupon toggle/delete
  document.addEventListener('click', function (e) {
    var toggleCoupon = e.target.closest('[data-toggle-coupon]');
    if (toggleCoupon) {
      var isActive = toggleCoupon.dataset.active === 'true';
      sb.from('coupons').update({ is_active: !isActive }).eq('id', toggleCoupon.dataset.toggleCoupon).then(function () {
        toast(isActive ? 'Coupon disabled' : 'Coupon enabled');
        loadCoupons();
      });
      return;
    }
    var delCoupon = e.target.closest('[data-delete-coupon]');
    if (delCoupon) {
      if (!confirm('Delete this coupon?')) return;
      sb.from('coupons').delete().eq('id', delCoupon.dataset.deleteCoupon).then(function () {
        toast('Coupon deleted');
        loadCoupons();
      });
    }
  });


  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════
  document.addEventListener('DOMContentLoaded', checkAdminAuth);

})();
