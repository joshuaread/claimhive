/* ClaimHive — Free U.S. Hail Map
 * Client-side rendering of a dated snapshot of NOAA Storm
 * Prediction Center (SPC) preliminary hail reports. The snapshot is produced
 * server-side by scripts/build-hail-snapshot.py and served from the same origin
 * as data/hail-reports.json (the browser cannot reliably fetch the SPC CSVs
 * directly — they are inconsistently served without CORS headers). No data is
 * sent anywhere.
 */
(function () {
  'use strict';

  var DATA_URL = 'data/hail-reports.json';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Format a 'YYYY-MM-DD' snapshot date as e.g. "Mar 5, 2026".
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    return MONTHS[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function colorFor(inch) {
    if (inch == null) return '#64748b';
    if (inch < 1) return '#3b82f6';   // < 1"
    if (inch < 2) return '#f59e0b';   // 1 – 1.99"
    return '#ef4444';                 // 2"+
  }

  function radiusFor(inch) {
    if (inch == null) return 4;
    return Math.min(14, 4 + inch * 3);
  }

  function init() {
    var mapEl = document.getElementById('hail-map');
    if (!mapEl || typeof L === 'undefined') return;

    var statusEl = document.getElementById('hail-status');
    var countEl = document.getElementById('hail-count');
    var selectEl = document.getElementById('hail-day-select');

    var map = L.map('hail-map', { scrollWheelZoom: false }).setView([39.5, -98.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var group = L.layerGroup().addTo(map);

    if (statusEl) statusEl.textContent = 'Loading recent hail reports…';

    fetch(DATA_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        var snapshotDays = (data && data.days) || [];
        var generated = data && data.generated_utc;

        var days = snapshotDays.map(function (day, idx) {
          return {
            id: idx,
            label: fmtDate(day.date),
            reports: (day.reports || []).filter(function (rp) {
              return isFinite(rp.lat) && isFinite(rp.lon);
            })
          };
        });

        // Populate the day selector.
        if (selectEl) {
          selectEl.innerHTML = '';
          var optAll = document.createElement('option');
          optAll.value = 'all';
          optAll.textContent = 'All 7 days';
          selectEl.appendChild(optAll);
          days.forEach(function (day) {
            var o = document.createElement('option');
            o.value = String(day.id);
            o.textContent = day.label + ' (' + day.reports.length + ')';
            selectEl.appendChild(o);
          });
          selectEl.addEventListener('change', function () { render(selectEl.value); });
        }

        function render(sel) {
          group.clearLayers();
          var count = 0;
          days.forEach(function (day) {
            if (sel !== 'all' && String(sel) !== String(day.id)) return;
            day.reports.forEach(function (rp) {
              var inch = (typeof rp.size_in === 'number') ? rp.size_in : null;
              var color = colorFor(inch);
              var marker = L.circleMarker([rp.lat, rp.lon], {
                radius: radiusFor(inch),
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 1
              });
              var sizeText = inch == null ? 'Size: n/a' : 'Size: ' + inch.toFixed(2) + ' in';
              var html = '<strong>' + escapeHtml(day.label) + '</strong><br>' +
                'Time (UTC): ' + escapeHtml(rp.t) + '<br>' +
                sizeText + '<br>' +
                escapeHtml(rp.loc) + '<br>' +
                escapeHtml(rp.county) + ' County, ' + escapeHtml(rp.st);
              marker.bindPopup(html);
              group.addLayer(marker);
              count++;
            });
          });
          if (countEl) {
            countEl.textContent = 'Showing ' + count + ' hail report' + (count === 1 ? '' : 's') +
              (sel === 'all' ? ' from the past 7 days.' : '.');
          }
        }

        var total = days.reduce(function (a, day) { return a + day.reports.length; }, 0);
        if (!data || total === 0) {
          if (statusEl) {
            statusEl.textContent = 'No hail reports are available for the past 7 days, ' +
              'or the data could not be loaded right now. Please check back later.';
          }
          if (countEl) countEl.textContent = '';
          return;
        }

        if (statusEl) {
          statusEl.textContent = generated
            ? 'Snapshot taken ' + generated.replace('T', ' ').replace(/:\d\dZ$/, '') + ' UTC'
            : '';
        }
        render('all');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
