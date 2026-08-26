/**
 * Sango Fiora — UI utilities: toast, animations, header shadow, scroll-top
 * Cart/search/drawer live in js/cart.js
 */
(function () {
  'use strict';

  // ---------- Toast ----------
  window.showToast = window.showToast || function (message) {
    var existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('hide');
      setTimeout(function () { toast.remove(); }, 400);
    }, 2600);
  };

  // ---------- Newsletter (all forms marked .newsletter-form) ----------
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('.newsletter-form');
    if (!form) return;
    e.preventDefault();
    var email = form.querySelector('input[type="email"]');
    if (!email || !email.value || !email.checkValidity()) {
      window.showToast('Please enter a valid email address.');
      if (email) email.focus();
      return;
    }
    window.showToast('Welcome to the Sango Fiora family! Check your inbox 🌿');
    form.reset();
  });

  // ---------- Scroll reveal ----------
  function initScrollAnimations() {
    var targets = document.querySelectorAll('section:not(.hero-section), article:not(.product-card), .animate-on-scroll');
    targets.forEach(function (item) { item.classList.add('reveal-on-scroll'); });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (item) { item.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    targets.forEach(function (item) { observer.observe(item); });
  }

  // ---------- Header shadow on scroll ----------
  function initHeaderShadow() {
    var header = document.getElementById('site-header');
    if (!header) return;
    window.addEventListener('scroll', function () {
      header.classList.toggle('shadow-md', window.scrollY > 40);
    }, { passive: true });
  }

  // ---------- Scroll to top ----------
  function initScrollToTop() {
    var btn = document.createElement('button');
    btn.className = 'scroll-top-btn';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
    document.body.appendChild(btn);
    window.addEventListener('scroll', function () {
      btn.classList.toggle('is-active', window.scrollY > 300);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScrollAnimations();
    initScrollToTop();
    initHeaderShadow();
  });
})();
