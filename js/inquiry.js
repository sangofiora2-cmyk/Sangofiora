/**
 * Sango Plants — Customer Support & B2B Inquiry Ticket System
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sango-tickets-v1';

  function readTickets() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function writeTickets(tickets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }

  function generateTicketId() {
    return 'TICK-' + Math.floor(10000 + Math.random() * 90000);
  }

  window.InquiryEngine = {
    submitInquiry: function (data) {
      var ticketId = generateTicketId();
      var record = {
        ticketId: ticketId,
        createdAt: new Date().toISOString(),
        dateString: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: data.type || 'Support Inquiry',
        name: data.name,
        phone: data.phone,
        email: data.email,
        topic: data.topic || 'General Inquiry',
        message: data.message,
        status: 'Open'
      };

      var tickets = readTickets();
      tickets.unshift(record);
      writeTickets(tickets);

      return record;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!contactForm.checkValidity()) {
          contactForm.reportValidity();
          return;
        }

        var formData = new FormData(contactForm);
        var record = window.InquiryEngine.submitInquiry({
          type: 'Support Inquiry',
          name: formData.get('name'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          topic: formData.get('topic'),
          message: formData.get('message')
        });

        if (window.showToast) {
          window.showToast('Ticket ' + record.ticketId + ' created! Our plant team will contact you within 24h 🌿');
        }

        contactForm.reset();
      });
    }
  });

})();
