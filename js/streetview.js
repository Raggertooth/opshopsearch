// streetview.js — Fetch a Google Street View photo of each shop's location
// for the detail-panel hero. Inert until configured.
//
// To activate:
//   1. Get a Google Street View Static API key (see README.md → Street View)
//   2. Restrict the key to your domain (referrer): *.opshopsearch.com/*
//   3. Add to index.html <head>:
//        <meta name="streetview-key" content="YOUR_KEY">
//
// In embed mode (?embed=1) we skip Street View to keep iframes lean
// and to avoid burning host-site visitors against your free quota.
(function () {
  'use strict';

  var API_BASE = 'https://maps.googleapis.com/maps/api/streetview';
  var META_BASE = 'https://maps.googleapis.com/maps/api/streetview/metadata';

  function meta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : null;
  }

  var KEY = meta('streetview-key');
  if (!KEY) return;

  // Skip in embed mode
  var params = new URLSearchParams(window.location.search);
  if (params.get('embed') === '1' || params.get('embed') === 'true') return;

  // Build API URLs
  function imgUrl(shop, size) {
    var s = size || '600x300';
    return API_BASE +
      '?size=' + s +
      '&location=' + shop.lat + ',' + shop.lng +
      '&fov=85' +
      '&pitch=0' +
      '&radius=50' +
      '&source=outdoor' +
      '&key=' + encodeURIComponent(KEY);
  }
  function metaUrl(shop) {
    return META_BASE +
      '?location=' + shop.lat + ',' + shop.lng +
      '&radius=50' +
      '&source=outdoor' +
      '&key=' + encodeURIComponent(KEY);
  }

  // Cache results so we don't double-spend the quota when re-opening shops
  var hasImage = {};   // shopId -> 'OK' | 'ZERO_RESULTS' | undefined
  function shopId(shop) { return (shop.address + '|' + shop.suburb).toLowerCase(); }

  // Patch into the panel show flow
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var origShow = window.OpShopPanel && window.OpShopPanel.show;
    if (!origShow) return;

    window.OpShopPanel.show = function (shop, opts) {
      // Always run the original show first (initials fallback renders immediately)
      origShow(shop, opts);
      tryLoadStreetView(shop);
    };
  });

  function tryLoadStreetView(shop) {
    if (!shop) return;
    var id = shopId(shop);
    if (hasImage[id] === 'ZERO_RESULTS') return;

    var photo = document.getElementById('panel-photo');
    var initialsEl = document.getElementById('panel-initials');
    if (!photo || !initialsEl) return;

    // If shop already has its own photo URL in data, leave it alone
    if (shop.photo) return;

    function show() {
      photo.src = imgUrl(shop);
      photo.alt = shop.name;
      photo.hidden = false;
      initialsEl.hidden = true;
    }

    if (hasImage[id] === 'OK') { show(); return; }

    // Hit the metadata endpoint first (free, doesn't burn image quota)
    fetch(metaUrl(shop))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.status === 'OK') {
          hasImage[id] = 'OK';
          show();
        } else {
          hasImage[id] = 'ZERO_RESULTS';
        }
      })
      .catch(function () { /* ignore; initials remain */ });
  }
})();
