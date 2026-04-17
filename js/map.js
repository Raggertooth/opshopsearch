// map.js — Initialize Leaflet map centered on Gold Coast
(function () {
  'use strict';

  var map;
  try {
    var goldCoastBounds = L.latLngBounds([-28.25, 152.90], [-27.70, 153.60]);

    map = L.map('map', {
      center: [-27.9833, 153.4000],
      zoom: 12,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: goldCoastBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true
    }).addTo(map);

    // Recompute size once the layout has settled (fixes blurry tiles on first paint)
    setTimeout(function () { map.invalidateSize(); }, 0);
    window.addEventListener('load', function () { map.invalidateSize(); });

    // Click on the map (not on a marker) closes the open detail panel
    map.on('click', function () {
      if (window.OpShopPanel) window.OpShopPanel.hide();
    });

    // Expose globally for other modules
    window.appMap = map;
  } catch (e) {
    console.error('Map failed to load:', e);
    document.getElementById('map').style.display = 'none';
    document.getElementById('map-error').hidden = false;
  }
})();
