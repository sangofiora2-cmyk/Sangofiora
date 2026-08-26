/**
 * Sango Plants — Event Bus & Multi-Tab Synchronization System
 */
(function () {
  'use strict';

  var listeners = {};

  window.AppEvent = {
    on: function (event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },
    off: function (event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(function (cb) { return cb !== callback; });
    },
    emit: function (event, data) {
      if (listeners[event]) {
        listeners[event].forEach(function (cb) {
          try { cb(data); } catch (err) { console.error('AppEvent error on [' + event + ']:', err); }
        });
      }
    }
  };

  // Multi-tab storage sync listener
  window.addEventListener('storage', function (e) {
    if (e.key === 'sango-cart-v3') {
      window.AppEvent.emit('cart:updated');
    } else if (e.key === 'sango-wishlist-v1') {
      window.AppEvent.emit('wishlist:updated');
    } else if (e.key === 'sango-orders-v1') {
      window.AppEvent.emit('orders:updated');
    }
  });

})();
