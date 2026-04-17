// detail-panel.js — Populate and toggle the slide-up shop detail panel
(function () {
  'use strict';

  var REPORT_EMAIL = 'hello@opshopsearch.com';

  var panel = document.getElementById('detail-panel');
  var overlay = document.getElementById('panel-overlay');
  var closeBtn = document.getElementById('panel-close');
  var nameEl = document.getElementById('panel-name');
  var charityEl = document.getElementById('panel-charity');
  var addressEl = document.getElementById('panel-address');
  var suburbEl = document.getElementById('panel-suburb');
  var phoneEl = document.getElementById('panel-phone');
  var hoursEl = document.getElementById('panel-hours');
  var websiteEl = document.getElementById('panel-website');

  if (!panel) return;

  var content = panel.querySelector('#panel-content');

  var recentRow = document.createElement('div');
  recentRow.className = 'panel-recent';
  recentRow.id = 'panel-recent';
  recentRow.hidden = true;
  content.appendChild(recentRow);

  var favBtn = document.createElement('button');
  favBtn.id = 'panel-fav';
  favBtn.type = 'button';
  favBtn.className = 'btn-fav';
  favBtn.setAttribute('aria-label', 'Save to favourites');
  favBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  panel.insertBefore(favBtn, panel.querySelector('#panel-close'));

  var directionsBtn = document.createElement('a');
  directionsBtn.id = 'panel-directions';
  directionsBtn.className = 'btn-directions';
  directionsBtn.textContent = 'Get directions';
  directionsBtn.target = '_blank';
  directionsBtn.rel = 'noopener';
  content.appendChild(directionsBtn);

  var actionRow = document.createElement('div');
  actionRow.className = 'panel-actions';
  content.appendChild(actionRow);

  var shareBtn = document.createElement('button');
  shareBtn.className = 'btn-secondary';
  shareBtn.type = 'button';
  shareBtn.textContent = 'Share';
  actionRow.appendChild(shareBtn);

  var reportBtn = document.createElement('a');
  reportBtn.className = 'btn-secondary';
  reportBtn.textContent = 'Report a fix';
  actionRow.appendChild(reportBtn);

  var qrBtn = document.createElement('button');
  qrBtn.className = 'btn-secondary';
  qrBtn.type = 'button';
  qrBtn.textContent = 'QR';
  qrBtn.title = 'Show QR code (for charities to print)';
  actionRow.appendChild(qrBtn);

  var compareBtn = document.createElement('button');
  compareBtn.className = 'btn-secondary';
  compareBtn.type = 'button';
  compareBtn.textContent = '⚖ Compare';
  compareBtn.title = 'Add this shop to compare';
  actionRow.appendChild(compareBtn);

  var verifiedEl = document.createElement('p');
  verifiedEl.className = 'panel-verified';
  content.appendChild(verifiedEl);

  var jsonLd = document.createElement('script');
  jsonLd.type = 'application/ld+json';
  jsonLd.id = 'panel-jsonld';
  document.head.appendChild(jsonLd);

  var currentShop = null;

  function statusBadge(shop) {
    if (!window.OpShopHours) return '';
    var open = window.OpShopHours.isOpenNow(shop.hours);
    return '<span class="status-pill status-' + (open ? 'open' : 'closed') + '">' +
           (open ? 'Open now' : 'Closed') + '</span>';
  }

  function buildJsonLd(shop) {
    return {
      '@context': 'https://schema.org',
      '@type': 'ThriftStore',
      name: shop.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: shop.address,
        addressLocality: shop.suburb,
        postalCode: shop.postcode,
        addressRegion: 'QLD',
        addressCountry: 'AU'
      },
      geo: { '@type': 'GeoCoordinates', latitude: shop.lat, longitude: shop.lng },
      telephone: shop.phone,
      url: shop.website,
      parentOrganization: shop.charity,
      openingHours: shop.hours
    };
  }

  function refreshFavBtn(shop) {
    if (!window.OpShopFavourites) { favBtn.hidden = true; return; }
    var saved = window.OpShopFavourites.has(shop);
    favBtn.classList.toggle('btn-fav-active', saved);
    favBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    favBtn.setAttribute('aria-label', saved ? 'Remove from favourites' : 'Save to favourites');
    favBtn.title = saved ? 'Saved' : 'Save';
  }

  function pushHistory(shop) {
    if (!window.OpShopURL) return;
    var slug = window.OpShopURL.slug(shop.name);
    var url = window.location.pathname + '?shop=' + slug;
    try { history.pushState({ shop: slug }, '', url); } catch (e) { /* ignore */ }
  }

  function popHistory() {
    var params = new URLSearchParams(window.location.search);
    if (!params.get('shop')) return;
    try { history.pushState({}, '', window.location.pathname); } catch (e) { /* ignore */ }
  }

  function renderRecent(currentId) {
    if (!window.OpShopRecent) { recentRow.hidden = true; return; }
    var others = window.OpShopRecent.list().filter(function (r) { return r.id !== currentId; });
    if (!others.length) { recentRow.hidden = true; recentRow.innerHTML = ''; return; }
    recentRow.innerHTML = '<span class="recent-label">Recently viewed</span>' +
      others.map(function (r) {
        var colour = (window.OpShopData && window.OpShopData.colourFor)
          ? window.OpShopData.colourFor(r.charity) : '#666';
        return '<button type="button" class="recent-chip" data-recent="' +
               encodeURIComponent(r.id) + '">' +
               '<span class="recent-dot" style="background:' + colour + '"></span>' +
               escapeHtml(r.name) + '</button>';
      }).join('');
    recentRow.hidden = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  recentRow.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-recent]');
    if (!btn || !window.OpShopRecent) return;
    var id = decodeURIComponent(btn.getAttribute('data-recent'));
    var shop = window.OpShopRecent.findShopById(id);
    if (shop) show(shop);
  });

  function initials(name) {
    return (name || '?')
      .replace(/[^A-Za-z0-9 -]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); })
      .join('');
  }

  function renderHero(shop) {
    var photo = document.getElementById('panel-photo');
    var initialsEl = document.getElementById('panel-initials');
    if (!photo || !initialsEl) return;
    var hero = document.getElementById('panel-hero');
    var colour = (window.OpShopData && window.OpShopData.colourFor)
      ? window.OpShopData.colourFor(shop.charity) : '#666';
    if (shop.photo) {
      photo.src = shop.photo;
      photo.alt = shop.name;
      photo.hidden = false;
      initialsEl.hidden = true;
    } else {
      photo.hidden = true;
      photo.removeAttribute('src');
      initialsEl.hidden = false;
      initialsEl.textContent = initials(shop.name) || '?';
      // Use explicit properties (more robust than shorthand for inline gradients)
      initialsEl.style.backgroundColor = colour;
      initialsEl.style.backgroundImage =
        'linear-gradient(135deg, ' + colour + ' 0%, ' +
        shadeColor(colour, -20) + ' 100%)';
    }
    if (hero) hero.style.borderColor = colour;
  }

  function shadeColor(hex, percent) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + percent));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + percent));
    var b = Math.max(0, Math.min(255, (n & 0xff) + percent));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  function show(shop, opts) {
    opts = opts || {};
    currentShop = shop;
    if (!opts.fromHistory && !opts.fromUrl) pushHistory(shop);
    if (window.OpShopRecent) window.OpShopRecent.push(shop);
    refreshFavBtn(shop);
    refreshCompareBtn(shop);
    renderHero(shop);
    renderRecent((shop.address + '|' + shop.suburb).toLowerCase());
    nameEl.innerHTML = shop.name + ' ' + statusBadge(shop);
    charityEl.textContent = shop.charity;
    var colour = (window.OpShopData && window.OpShopData.colourFor)
      ? window.OpShopData.colourFor(shop.charity) : '#666';
    charityEl.style.background = colour;
    addressEl.textContent = shop.address;
    var suburbText = shop.suburb + ' ' + shop.postcode;
    if (typeof shop._distanceKm === 'number') {
      suburbText += ' · ' + shop._distanceKm.toFixed(1) + ' km away';
    }
    suburbEl.textContent = suburbText;

    phoneEl.textContent = shop.phone || '—';
    phoneEl.href = shop.phone ? 'tel:' + shop.phone.replace(/\s+/g, '') : '#';

    hoursEl.textContent = shop.hours || '—';

    var categoriesEl = document.getElementById('panel-categories');
    if (categoriesEl) {
      var cats = shop.categories || [];
      categoriesEl.innerHTML = cats.length
        ? cats.map(function (c) {
            return '<span class="cat-tag">' + c + '</span>';
          }).join('')
        : '';
      categoriesEl.hidden = !cats.length;
    }

    if (shop.website) {
      websiteEl.textContent = shop.website.replace(/^https?:\/\//, '');
      websiteEl.href = shop.website;
    } else {
      websiteEl.textContent = '—';
      websiteEl.removeAttribute('href');
    }

    var query = encodeURIComponent(shop.address + ', ' + shop.suburb + ' ' + shop.postcode);
    var isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    directionsBtn.href = isApple
      ? 'https://maps.apple.com/?daddr=' + query + '&ll=' + shop.lat + ',' + shop.lng
      : 'https://www.google.com/maps/dir/?api=1&destination=' + shop.lat + ',' + shop.lng;

    var subject = encodeURIComponent('Fix: ' + shop.name + ' (' + shop.suburb + ')');
    var body = encodeURIComponent(
      'Shop: ' + shop.name + '\n' +
      'Address: ' + shop.address + ', ' + shop.suburb + ' ' + shop.postcode + '\n\n' +
      'What needs fixing?\n'
    );
    reportBtn.href = 'mailto:' + REPORT_EMAIL + '?subject=' + subject + '&body=' + body;

    shareBtn.hidden = !navigator.share;

    var verifiedParts = [];
    if (shop.lastVerified) verifiedParts.push('Verified ' + shop.lastVerified);
    if (window.OpShopVisited) {
      var prev = window.OpShopVisited.lastVisit(shop);
      if (prev) verifiedParts.push('You last visited ' + window.OpShopVisited.relative(prev));
      window.OpShopVisited.record(shop);
    }
    verifiedEl.textContent = verifiedParts.join(' · ');

    jsonLd.textContent = JSON.stringify(buildJsonLd(shop));

    panel.classList.remove('panel-hidden');
    overlay.classList.remove('panel-hidden');
    panel.setAttribute('aria-hidden', 'false');
  }

  function hide(opts) {
    opts = opts || {};
    panel.classList.add('panel-hidden');
    overlay.classList.add('panel-hidden');
    panel.setAttribute('aria-hidden', 'true');
    jsonLd.textContent = '';
    currentShop = null;
    if (!opts.fromHistory) popHistory();
  }

  shareBtn.addEventListener('click', function () {
    if (!currentShop || !navigator.share) return;
    navigator.share({
      title: currentShop.name,
      text: currentShop.name + ' — ' + currentShop.address + ', ' + currentShop.suburb,
      url: window.location.href
    }).catch(function () { /* user cancelled */ });
  });

  favBtn.addEventListener('click', function () {
    if (!currentShop || !window.OpShopFavourites) return;
    window.OpShopFavourites.toggle(currentShop);
    refreshFavBtn(currentShop);
  });

  qrBtn.addEventListener('click', function () {
    if (currentShop && window.OpShopQR) window.OpShopQR.open(currentShop);
  });

  function refreshCompareBtn(shop) {
    if (!window.OpShopCompare) { compareBtn.hidden = true; return; }
    if (window.OpShopCompare.has(shop)) {
      compareBtn.textContent = '⚖ In compare';
      compareBtn.classList.add('btn-secondary-active');
    } else if (window.OpShopCompare.full()) {
      compareBtn.textContent = '⚖ Compare full';
      compareBtn.disabled = true;
      return;
    } else {
      compareBtn.textContent = '⚖ Compare';
      compareBtn.classList.remove('btn-secondary-active');
    }
    compareBtn.disabled = false;
  }

  compareBtn.addEventListener('click', function () {
    if (!currentShop || !window.OpShopCompare) return;
    if (window.OpShopCompare.has(currentShop)) {
      window.OpShopCompare.remove(currentShop);
    } else {
      window.OpShopCompare.add(currentShop);
    }
    refreshCompareBtn(currentShop);
  });

  closeBtn.addEventListener('click', hide);
  overlay.addEventListener('click', hide);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  window.OpShopPanel = { show: show, hide: hide };
})();
