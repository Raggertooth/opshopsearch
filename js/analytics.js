// analytics.js — Conditional Plausible + Sentry loaders.
// Both are inert until configured via <meta> tags in the HTML head:
//   <meta name="plausible-domain" content="map.opshopsearch.com">
//   <meta name="sentry-dsn" content="https://xxx@sentry.io/yyy">
//
// In embed mode (?embed=1) we never load analytics — visitors of host sites
// haven't opted into our tracking domain.
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  if (params.get('embed') === '1' || params.get('embed') === 'true') return;

  function meta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : null;
  }

  // ---------- Plausible (privacy-friendly, no cookies, GDPR-clean) ----------
  var plausibleDomain = meta('plausible-domain');
  if (plausibleDomain) {
    var ps = document.createElement('script');
    ps.defer = true;
    ps.setAttribute('data-domain', plausibleDomain);
    ps.src = 'https://plausible.io/js/script.outbound-links.js';
    document.head.appendChild(ps);
    // Custom event helper for filter usage etc.
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    // Track key user actions
    window.addEventListener('opshops:located', function () {
      window.plausible('LocateMe');
    });
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-chip]');
      if (el) window.plausible('Filter', { props: { chip: el.getAttribute('data-chip') } });
      var btn = e.target.closest('#run-btn');
      if (btn) window.plausible('OpShopRun');
    });
  }

  // ---------- Sentry (error tracking) ----------
  var sentryDsn = meta('sentry-dsn');
  if (sentryDsn) {
    var ss = document.createElement('script');
    ss.src = 'https://browser.sentry-cdn.com/7.114.0/bundle.tracing.min.js';
    ss.crossOrigin = 'anonymous';
    ss.onload = function () {
      if (typeof Sentry !== 'undefined') {
        Sentry.init({
          dsn: sentryDsn,
          tracesSampleRate: 0.1,
          environment: location.hostname === 'map.opshopsearch.com' ? 'production' : 'preview',
          release: 'opshop-finder@' + (meta('app-version') || 'unknown')
        });
      }
    };
    document.head.appendChild(ss);
  }
})();
