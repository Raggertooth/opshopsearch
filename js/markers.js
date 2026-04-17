// markers.js — Load shops, render clustered colour-coded pins, expose data + setVisible
(function () {
  'use strict';

  var CHARITY_COLOURS = {
    Vinnies: '#0066CC',
    Salvos: '#E60000',
    Lifeline: '#00AA44'
  };
  // Default pin colour (grey) for map legend consistency
  var DEFAULT_COLOUR = '#666666';
  // Hero background colour for "Other" charities — warmer than pin grey
  // so the detail panel doesn't look drab for non-branded shops.
  var OTHER_HERO_COLOUR = '#8a4ec4';  // soft purple
  var KNOWN_CHARITIES = ['Vinnies', 'Salvos', 'Lifeline'];

  var map = window.appMap;
  if (!map) return;

  var allShops = [];
  var markersByShop = new Map();
  var clusterGroup = (typeof L.markerClusterGroup === 'function')
    ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 })
    : L.layerGroup();
  clusterGroup.addTo(map);

  var fallbackList = document.getElementById('shop-list');

  function colourFor(charity) {
    return CHARITY_COLOURS[charity] || DEFAULT_COLOUR;
  }

  // Used by the detail-panel hero so non-branded charities get a warmer
  // background than the muted grey pin colour.
  function heroColourFor(charity) {
    return CHARITY_COLOURS[charity] || OTHER_HERO_COLOUR;
  }

  function charityKey(charity) {
    return KNOWN_CHARITIES.indexOf(charity) === -1 ? 'Other' : charity;
  }

  function makeIcon(charity) {
    var colour = colourFor(charity);
    return L.divIcon({
      className: '',
      html: '<div class="custom-marker" style="background:' + colour +
            ';width:18px;height:18px;"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -9]
    });
  }

  function renderFallbackList(shops) {
    if (!fallbackList) return;
    fallbackList.innerHTML = '';
    shops.forEach(function (shop) {
      var li = document.createElement('li');
      li.textContent = shop.name + ' — ' + shop.suburb;
      fallbackList.appendChild(li);
    });
  }

  function buildMarker(shop) {
    var marker = L.marker([shop.lat, shop.lng], { icon: makeIcon(shop.charity) });
    marker.bindTooltip(shop.name, { direction: 'top', offset: [0, -8] });
    marker.on('click', function () {
      if (window.OpShopPanel) window.OpShopPanel.show(shop);
    });
    return marker;
  }

  function setVisible(shops) {
    clusterGroup.clearLayers();
    shops.forEach(function (shop) {
      var marker = markersByShop.get(shop);
      if (marker) clusterGroup.addLayer(marker);
    });
  }

  function hideLoading() {
    var loading = document.getElementById('map-loading');
    if (loading) loading.hidden = true;
  }

  function enableInputs() {
    var input = document.getElementById('search-input');
    var locate = document.getElementById('locate-btn');
    if (input) {
      input.disabled = false;
      input.placeholder = 'Search suburb or postcode…';
    }
    if (locate) locate.disabled = false;
  }

  fetch('data/gold-coast-opshops.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (shops) {
      allShops = shops;
      shops.forEach(function (shop) {
        markersByShop.set(shop, buildMarker(shop));
      });
      setVisible(shops);
      renderFallbackList(shops);
      window.OpShopData = {
        all: function () { return allShops.slice(); },
        setVisible: setVisible,
        colourFor: colourFor,
        heroColourFor: heroColourFor,
        charityKey: charityKey,
        knownCharities: KNOWN_CHARITIES.concat(['Other'])
      };
      hideLoading();
      enableInputs();
      window.dispatchEvent(new CustomEvent('opshops:loaded', { detail: shops }));
    })
    .catch(function (err) {
      console.error('Failed to load shop data:', err);
      hideLoading();
      var input = document.getElementById('search-input');
      if (input) input.placeholder = 'Shop data unavailable';
      var toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Unable to load shop data. Please refresh.';
        toast.hidden = false;
      }
    });
})();
