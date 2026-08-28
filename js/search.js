/**
 * Sango Fiora — Instant Search Engine
 * Features: Desktop & Mobile autocomplete dropdowns, real-time filtering, search page rendering
 */
(function () {
  'use strict';

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return div.innerHTML;
  }

  function getProducts() {
    var all = window.SANGO_PRODUCTS || [];
    var deletedSlugs = JSON.parse(localStorage.getItem('sango_deleted_slugs') || '["calathea-orbifolia-120cm"]');
    return all.filter(function (p) {
      return deletedSlugs.indexOf(p.slug) === -1;
    });
  }

  function performSearch(query) {
    var q = (query || '').trim().toLowerCase();
    if (!q) return [];

    var products = getProducts();
    return products.filter(function (p) {
      var nameMatch = (p.name || '').toLowerCase().indexOf(q) !== -1;
      var catMatch = (p.category || '').toLowerCase().indexOf(q) !== -1;
      var sizeMatch = (p.size || '').toLowerCase().indexOf(q) !== -1;
      var varMatch = (p.variant || '').toLowerCase().indexOf(q) !== -1;
      var descMatch = (p.description || '').toLowerCase().indexOf(q) !== -1;
      return nameMatch || catMatch || sizeMatch || varMatch || descMatch;
    });
  }

  // Render Autocomplete Dropdown
  function renderAutocompleteDropdown(results, wrapEl, query) {
    if (!wrapEl) return;

    if (!query || !query.trim()) {
      wrapEl.innerHTML = '';
      wrapEl.classList.add('hidden');
      return;
    }

    if (!results || !results.length) {
      wrapEl.innerHTML =
        '<div class="p-5 text-center text-gray-500 text-xs font-medium">' +
          '<span class="text-2xl block mb-1">🪴</span>' +
          'No plants found matching "<span class="font-bold text-gray-800">' + escapeHTML(query) + '</span>"' +
        '</div>';
      wrapEl.classList.remove('hidden');
      return;
    }

    var topResults = results.slice(0, 6);
    var html = '<div class="p-2 divide-y divide-gray-100">';

    topResults.forEach(function (p) {
      html +=
        '<a href="/products/' + p.slug + '/" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors group">' +
          '<img src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.name) + '" class="w-11 h-11 rounded-lg object-cover bg-gray-100 shrink-0 border border-outline-variant/30">' +
          '<div class="flex-1 min-w-0">' +
            '<p class="font-bold text-xs text-gray-900 group-hover:text-deep-forest transition-colors truncate">' + escapeHTML(p.name) + '</p>' +
            '<p class="text-[10px] text-gray-500 uppercase tracking-wider">' + escapeHTML(p.category) + (p.size ? ' · ' + escapeHTML(p.size) : '') + '</p>' +
          '</div>' +
          '<div class="text-right shrink-0">' +
            '<span class="text-xs font-bold text-deep-forest">₹' + p.price + '</span>' +
            (p.mrp > p.price ? '<p class="text-[10px] text-gray-400 line-through">₹' + p.mrp + '</p>' : '') +
          '</div>' +
        '</a>';
    });

    if (results.length > 6) {
      html +=
        '<div class="pt-2 pb-1 text-center border-t border-gray-100 mt-1">' +
          '<a href="/products/?q=' + encodeURIComponent(query) + '" class="inline-block text-xs font-bold text-deep-forest hover:text-amber-gold transition-colors py-1">' +
            'View all ' + results.length + ' results →' +
          '</a>' +
        '</div>';
    }

    html += '</div>';
    wrapEl.innerHTML = html;
    wrapEl.classList.remove('hidden');
  }

  // Setup Input Handlers
  function setupSearchInput(inputId, resultsId) {
    var input = document.getElementById(inputId);
    var resultsWrap = document.getElementById(resultsId);

    if (!input) return;

    if (!resultsWrap) {
      resultsWrap = document.createElement('div');
      resultsWrap.id = resultsId;
      resultsWrap.className = 'hidden absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/30 z-50 max-h-96 overflow-y-auto';
      if (input.parentNode) input.parentNode.appendChild(resultsWrap);
    }

    input.addEventListener('input', function () {
      var query = input.value;
      var matches = performSearch(query);
      renderAutocompleteDropdown(matches, resultsWrap, query);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var q = input.value.trim();
        if (q) {
          window.location.href = '/products/?q=' + encodeURIComponent(q);
        }
      }
    });

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !resultsWrap.contains(e.target)) {
        resultsWrap.classList.add('hidden');
      }
    });

    input.addEventListener('focus', function () {
      if (input.value.trim()) {
        var matches = performSearch(input.value);
        renderAutocompleteDropdown(matches, resultsWrap, input.value);
      }
    });
  }

  // Render Search Results Page (/search/)
  function initSearchPage() {
    var grid = document.getElementById('search-page-grid');
    var countEl = document.getElementById('search-page-count');
    var queryEl = document.getElementById('search-page-q');

    if (!grid) return;

    var params = new URLSearchParams(window.location.search);
    var q = params.get('q') || '';

    if (queryEl) queryEl.textContent = q;

    var matches = performSearch(q);

    if (countEl) countEl.textContent = matches.length + ' plant' + (matches.length === 1 ? '' : 's');

    if (!matches.length) {
      grid.className = 'block text-center py-16 bg-white rounded-3xl border border-outline-variant/30 shadow-sm';
      grid.innerHTML =
        '<div class="text-6xl mb-4">🪴</div>' +
        '<h2 class="font-headline-lg font-bold text-2xl text-deep-forest mb-2">No results found for "' + escapeHTML(q) + '"</h2>' +
        '<p class="text-on-surface-variant text-sm mb-6 max-w-md mx-auto">Try searching for broader terms like "Palms", "Ficus", "Rose", or browse our full catalogue.</p>' +
        '<a href="/products/" class="inline-block bg-amber-gold hover:bg-amber-400 text-deep-forest px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md">Browse All Plants →</a>';
      return;
    }

    grid.innerHTML = matches.map(function (p) {
      return '<article class="product-card group bg-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative" data-slug="' + p.slug + '">' +
        '<a href="/products/' + p.slug + '/" class="relative block aspect-square overflow-hidden bg-surface-container">' +
          '<img src="' + escapeHTML(p.image) + '" alt="' + escapeHTML(p.name) + '" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">' +
          (p.discount ? '<span class="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">SAVE ' + p.discount + '%</span>' : '') +
        '</a>' +
        '<button type="button" aria-label="Add to wishlist" data-wishlist-btn data-slug="' + p.slug + '" data-name="' + escapeHTML(p.name) + '" data-category="' + escapeHTML(p.category) + '" data-size="' + escapeHTML(p.size) + '" data-price="' + p.price + '" data-mrp="' + p.mrp + '" data-image="' + escapeHTML(p.image) + '" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm z-10">' +
          '<span class="material-symbols-outlined text-sm">favorite</span>' +
        '</button>' +
        '<div class="p-4 flex flex-col flex-1">' +
          '<p class="text-[11px] font-semibold text-deep-forest/80 uppercase tracking-wider mb-1">' + escapeHTML(p.category) + ' · ' + escapeHTML(p.size) + '</p>' +
          '<a href="/products/' + p.slug + '/" class="font-headline-sm font-bold text-gray-900 leading-snug hover:text-deep-forest transition-colors text-sm line-clamp-1">' + escapeHTML(p.name) + '</a>' +
          '<div class="flex items-center gap-1 mt-1.5"><span class="text-amber-gold text-xs">★★★★★</span><span class="text-[11px] text-on-surface-variant font-medium">' + p.rating + ' (' + p.reviews + ')</span></div>' +
          '<div class="mt-auto pt-3 flex items-end justify-between gap-2">' +
            '<div><span class="text-base font-bold text-deep-forest">₹' + p.price + '</span>' + (p.mrp > p.price ? '<span class="ml-1 text-xs text-gray-400 line-through">₹' + p.mrp + '</span>' : '') + '</div>' +
            '<button type="button" data-add-to-cart data-slug="' + p.slug + '" data-name="' + escapeHTML(p.name) + '" data-variant="' + escapeHTML(p.variant || '') + '" data-category="' + escapeHTML(p.category) + '" data-size="' + escapeHTML(p.size) + '" data-price="' + p.price + '" data-mrp="' + p.mrp + '" data-image="' + escapeHTML(p.image) + '" class="bg-amber-gold hover:bg-amber-400 text-deep-forest text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm">Add +</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupSearchInput('search-input', 'search-results');
    setupSearchInput('search-input-mobile', 'search-results-mobile');
    initSearchPage();
  });
})();
