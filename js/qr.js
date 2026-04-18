// qr.js — Generate QR code for a shop's deep-link URL via api.qrserver.com
(function () {
  'use strict';

  var SITE_BASE = 'https://map.opshopsearch.com';
  var QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function shopUrl(shop) {
    if (!window.OpShopURL) return SITE_BASE + '/';
    return SITE_BASE + '/?shop=' + window.OpShopURL.slug(shop.name);
  }

  function qrSrc(text, size) {
    return QR_API + '?size=' + size + 'x' + size +
           '&format=png&margin=10&data=' + encodeURIComponent(text);
  }

  ready(function () {
    var modal = document.createElement('div');
    modal.id = 'qr-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="qr-backdrop"></div>' +
      '<div class="qr-card" role="dialog" aria-labelledby="qr-title" aria-modal="true">' +
        '<button class="qr-close" type="button" aria-label="Close">&times;</button>' +
        '<h3 id="qr-title">QR code</h3>' +
        '<p class="qr-shop"></p>' +
        '<img class="qr-img" alt="QR code" />' +
        '<p class="qr-url"></p>' +
        '<div class="qr-actions">' +
          '<a class="qr-download btn-directions" download>Download PNG</a>' +
        '</div>' +
        '<p class="qr-hint">Print and stick on the shopfront — scans straight to the shop\'s page.</p>' +
      '</div>';
    document.body.appendChild(modal);

    var img = modal.querySelector('.qr-img');
    var nameEl = modal.querySelector('.qr-shop');
    var urlEl = modal.querySelector('.qr-url');
    var downloadEl = modal.querySelector('.qr-download');

    function open(shop) {
      var url = shopUrl(shop);
      nameEl.textContent = shop.name;
      urlEl.textContent = url;
      img.src = qrSrc(url, 320);
      downloadEl.href = qrSrc(url, 1024);
      downloadEl.setAttribute('download', 'opshop-qr-' +
        (window.OpShopURL ? window.OpShopURL.slug(shop.name) : 'shop') + '.png');
      modal.hidden = false;
    }

    function close() { modal.hidden = true; }

    modal.querySelector('.qr-close').addEventListener('click', close);
    modal.querySelector('.qr-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    window.OpShopQR = { open: open, close: close };
  });
})();
