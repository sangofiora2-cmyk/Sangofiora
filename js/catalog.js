/**
 * Sango Plants — Catalogue Engine, Deep URL Sync & Search System
 */
(function () {
  'use strict';

  function syncUrlParams(paramsObj) {
    if (!window.history || !window.history.pushState) return;
    var url = new URL(window.location.href);
    Object.keys(paramsObj).forEach(function (key) {
      if (paramsObj[key] && paramsObj[key] !== 'all' && paramsObj[key] !== 'featured') {
        url.searchParams.set(key, paramsObj[key]);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState({}, '', url.toString());
  }

  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || 'all',
      sort: params.get('sort') || 'featured',
      q: params.get('q') || ''
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('all-products-grid');
    var sortSelect = document.getElementById('catalog-sort');
    var searchInput = document.getElementById('catalog-search');
    var chips = document.querySelectorAll('.catalog-chip');
    var countEl = document.getElementById('product-count');
    var noResults = document.getElementById('no-results');
    var resetBtn = document.getElementById('reset-filters');

    if (!grid) return;

    var initialParams = readUrlParams();
    var currentCategory = initialParams.category;

    if (sortSelect && initialParams.sort) sortSelect.value = initialParams.sort;
    if (searchInput && initialParams.q) searchInput.value = initialParams.q;

    var PAGE_SIZE = 16;
    var visibleLimit = PAGE_SIZE;

    var loadMoreWrap = document.getElementById('load-more-wrap');
    var loadMoreBtn = document.getElementById('load-more-btn');
    var loadMoreCount = document.getElementById('load-more-count');

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        visibleLimit += PAGE_SIZE;
        applyCatalogFilters(true);
      });
    }

    function updateChipStyles() {
      chips.forEach(function (c) {
        var isMatch = (c.dataset.filter.toLowerCase() === currentCategory.toLowerCase());
        if (isMatch) {
          c.className = 'catalog-chip shrink-0 px-4 py-2 rounded-full text-xs font-bold bg-amber-gold text-deep-forest transition-all shadow-sm';
        } else {
          c.className = 'catalog-chip shrink-0 px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 border border-gray-200 hover:border-deep-forest text-gray-700 transition-all';
        }
      });
    }

    // Highlight initial chip matching URL
    updateChipStyles();

    function applyCatalogFilters(isLoadMore) {
      if (!isLoadMore) {
        visibleLimit = PAGE_SIZE;
      }

      var cards = Array.prototype.slice.call(grid.children);
      var query = (searchInput ? searchInput.value.trim().toLowerCase() : '');
      var sortVal = sortSelect ? sortSelect.value : 'featured';

      var totalMatching = 0;
      var shownCount = 0;

      cards.forEach(function (card) {
        var cat = card.dataset.category || '';
        var name = (card.dataset.name || '').toLowerCase();

        var matchCat = (currentCategory === 'all' || cat.toLowerCase() === currentCategory.toLowerCase());
        var matchSearch = (!query || name.indexOf(query) !== -1 || cat.toLowerCase().indexOf(query) !== -1);

        if (matchCat && matchSearch) {
          totalMatching++;
          if (shownCount < visibleLimit) {
            if (card.style.display !== '') card.style.display = '';
            shownCount++;
          } else {
            if (card.style.display !== 'none') card.style.display = 'none';
          }
        } else {
          if (card.style.display !== 'none') card.style.display = 'none';
        }
      });

      if (countEl) countEl.textContent = totalMatching;
      if (noResults) noResults.classList.toggle('hidden', totalMatching > 0);

      var remaining = totalMatching - shownCount;
      if (loadMoreWrap && loadMoreCount) {
        if (remaining > 0) {
          loadMoreCount.textContent = remaining;
          loadMoreWrap.classList.remove('hidden');
        } else {
          loadMoreWrap.classList.add('hidden');
        }
      }

      // Sort visible cards ONLY if a non-featured sort order is requested
      if (sortVal !== 'featured') {
        cards.sort(function (a, b) {
          if (sortVal === 'price-asc') return (+a.dataset.price) - (+b.dataset.price);
          if (sortVal === 'price-desc') return (+b.dataset.price) - (+a.dataset.price);
          if (sortVal === 'rating') return (+b.dataset.rating) - (+a.dataset.rating);
          if (sortVal === 'discount') return (+b.dataset.discount) - (+a.dataset.discount);
          if (sortVal === 'name') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
          return 0;
        });

        // Use DocumentFragment for single-pass batch DOM update
        var fragment = document.createDocumentFragment();
        cards.forEach(function (c) { fragment.appendChild(c); });
        grid.appendChild(fragment);
      }

      syncUrlParams({
        category: currentCategory,
        sort: sortVal,
        q: query
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        currentCategory = chip.dataset.filter;
        updateChipStyles();
        applyCatalogFilters();
      });
    });

    if (sortSelect) sortSelect.addEventListener('change', applyCatalogFilters);
    if (searchInput) searchInput.addEventListener('input', applyCatalogFilters);

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        currentCategory = 'all';
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'featured';
        updateChipStyles();
        applyCatalogFilters();
      });
    }

    // Dynamic Supabase Sync (safely updates catalog if configured, non-blocking)
    function syncCatalogWithSupabase() {
      if (!window.SangoSupabase || !window.SUPABASE_CONFIGURED) return;
      try {
        window.SangoSupabase.from('products').select('*').eq('is_active', true).then(function (res) {
          if (res.error || !res.data) return;
          var dbProducts = res.data;
          var dbSlugsMap = {};
          dbProducts.forEach(function (p) { dbSlugsMap[p.slug] = p; });

          var cards = Array.prototype.slice.call(grid.children);

          // 1. Remove cards from DOM if deleted in Supabase
          cards.forEach(function (card) {
            var btn = card.querySelector('[data-add-to-cart]');
            var slug = btn ? btn.dataset.slug : null;
            if (slug && !dbSlugsMap[slug]) {
              card.remove();
            } else if (slug && dbSlugsMap[slug]) {
              var dbP = dbSlugsMap[slug];
              var soldOutBadge = card.querySelector('.sold-out-badge');
              if (dbP.is_sold_out) {
                if (!soldOutBadge) {
                  var badge = document.createElement('span');
                  badge.className = 'sold-out-badge absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm z-10';
                  badge.textContent = 'SOLD OUT';
                  var imgLink = card.querySelector('a');
                  if (imgLink) imgLink.appendChild(badge);
                }
                if (btn) {
                  btn.disabled = true;
                  btn.textContent = 'Sold Out';
                  btn.className = 'bg-gray-200 text-gray-400 cursor-not-allowed text-xs font-bold px-3.5 py-1.5 rounded-full shrink-0 shadow-sm';
                }
              } else {
                if (soldOutBadge) soldOutBadge.remove();
                if (btn) {
                  btn.disabled = false;
                  btn.textContent = 'Add +';
                  btn.className = 'bg-amber-gold hover:bg-amber-400 text-deep-forest text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm';
                }
              }
            }
          });

          // 2. Add newly created products
          var existingSlugs = Array.prototype.slice.call(grid.children).map(function (card) {
            var btn = card.querySelector('[data-add-to-cart]');
            return btn ? btn.dataset.slug : null;
          }).filter(Boolean);

          var fragment = document.createDocumentFragment();
          var addedCount = 0;

          dbProducts.forEach(function (p) {
            if (existingSlugs.indexOf(p.slug) === -1) {
              var article = document.createElement('article');
              article.className = 'product-card group bg-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative';
              article.dataset.category = p.category;
              article.dataset.price = p.price;
              article.dataset.rating = p.rating || 4.5;
              article.dataset.discount = p.discount || 0;
              article.dataset.name = p.name;

              article.innerHTML =
                '<a href="/products/' + p.slug + '/" class="relative block aspect-square overflow-hidden bg-surface-container">' +
                  '<img src="' + p.image + '" alt="' + escapeHTML(p.name) + '" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">' +
                  (p.is_sold_out ? '<span class="sold-out-badge absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm z-10">SOLD OUT</span>' :
                    (p.discount ? '<span class="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">SAVE ' + p.discount + '%</span>' : '')) +
                '</a>' +
                '<button type="button" aria-label="Add to wishlist" data-wishlist-btn data-slug="' + p.slug + '" data-name="' + escapeHTML(p.name) + '" data-category="' + p.category + '" data-size="' + p.size + '" data-price="' + p.price + '" data-mrp="' + p.mrp + '" data-image="' + p.image + '" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm z-10">' +
                  '<span class="material-symbols-outlined text-sm">favorite</span>' +
                '</button>' +
                '<div class="p-4 flex flex-col flex-1">' +
                  '<p class="text-[11px] font-semibold text-deep-forest/80 uppercase tracking-wider mb-1">' + escapeHTML(p.category) + ' · ' + escapeHTML(p.size) + '</p>' +
                  '<a href="/products/' + p.slug + '/" class="font-headline-sm font-bold text-gray-900 leading-snug hover:text-deep-forest transition-colors text-sm line-clamp-1">' + escapeHTML(p.name) + '</a>' +
                  '<div class="flex items-center gap-1 mt-1.5"><span class="text-amber-gold text-xs">★★★★★</span><span class="text-[11px] text-on-surface-variant font-medium">' + p.rating + ' (' + p.reviews + ')</span></div>' +
                  '<div class="mt-auto pt-3 flex items-end justify-between gap-2">' +
                    '<div><span class="text-base font-bold text-deep-forest">₹' + p.price + '</span>' + (p.mrp > p.price ? '<span class="ml-1 text-xs text-gray-400 line-through">₹' + p.mrp + '</span>' : '') + '</div>' +
                    (p.is_sold_out ?
                      '<button type="button" disabled class="bg-gray-200 text-gray-400 cursor-not-allowed text-xs font-bold px-3.5 py-1.5 rounded-full shrink-0 shadow-sm">Sold Out</button>' :
                      '<button type="button" data-add-to-cart data-slug="' + p.slug + '" data-name="' + escapeHTML(p.name) + '" data-variant="' + (p.variant || '') + '" data-category="' + p.category + '" data-size="' + p.size + '" data-price="' + p.price + '" data-mrp="' + p.mrp + '" data-image="' + p.image + '" class="bg-amber-gold hover:bg-amber-400 text-deep-forest text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors shrink-0 shadow-sm">Add +</button>') +
                  '</div>' +
                '</div>';

              fragment.appendChild(article);
              addedCount++;
            }
          });

          if (addedCount > 0) {
            grid.appendChild(fragment);
          }

          // 3. Update filter chip labels dynamically
          var categoryCounts = {};
          dbProducts.forEach(function (p) {
            categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
          });

          chips.forEach(function (chip) {
            var filter = chip.dataset.filter;
            if (filter === 'all') {
              chip.textContent = 'All Products (' + dbProducts.length + ')';
            } else if (categoryCounts[filter] !== undefined) {
              chip.textContent = filter + ' (' + categoryCounts[filter] + ')';
            }
          });

          applyCatalogFilters();
        }).catch(function(err) {
          console.warn('[Catalog] Supabase sync skipped:', err);
        });
      } catch (e) {
        console.warn('[Catalog] Supabase sync error:', e);
      }
    }

    function escapeHTML(str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str == null ? '' : String(str)));
      return div.innerHTML;
    }

    // Initial Filter Run & Non-blocking Supabase Sync
    applyCatalogFilters();
    setTimeout(syncCatalogWithSupabase, 1000);
  });

})();
