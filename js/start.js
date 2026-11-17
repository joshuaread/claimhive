/**
 * ClaimHive — /start (Google Ads landing page)
 *
 * 1. Attribution: copies utm_* and gclid from the landing URL onto every
 *    https://ops.claimhive.app/login link (on load, on history changes, and
 *    again at click time). Other params already on the login href are kept.
 * 2. Scroll depth: fires `scroll_depth` with { depth: 25|50|75|100 } once each
 *    through window.trackClaimHiveEvent (js/analytics.js).
 * 3. Motion (only when prefers-reduced-motion: no-preference):
 *    - writes --p (0..1) on .st-shift so the messy claim file assembles
 *    - reveals .reveal elements as they enter the viewport
 *
 * CTA clicks are tracked by js/analytics.js via [data-cta-location]; nothing here duplicates that.
 */
(function () {
  'use strict';

  var LOGIN_ORIGIN = 'https://ops.claimhive.app';
  var LOGIN_PATH = '/login';
  var docEl = document.documentElement;

  /* ------------------------------------------------------------------
     1. UTM + gclid preservation
     ------------------------------------------------------------------ */
  function isTrackingKey(key) {
    return key === 'gclid' || key.indexOf('utm_') === 0;
  }

  function loginLinks() {
    var out = [];
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      // Remember the authored href once, so a later query change can drop stale values.
      var base = a.getAttribute('data-login-base');
      if (base === null) {
        var url;
        try { url = new URL(a.getAttribute('href'), window.location.href); } catch (e) { continue; }
        if (url.origin !== LOGIN_ORIGIN || url.pathname !== LOGIN_PATH) continue;
        a.setAttribute('data-login-base', url.href);
      }
      out.push(a);
    }
    return out;
  }

  function applyTracking() {
    var landing;
    try { landing = new URLSearchParams(window.location.search); } catch (e) { return; }

    var carry = [];
    landing.forEach(function (value, key) {
      if (isTrackingKey(key) && value !== '') carry.push([key, value]);
    });

    var links = loginLinks();
    for (var i = 0; i < links.length; i++) {
      var url = new URL(links[i].getAttribute('data-login-base'));
      for (var j = 0; j < carry.length; j++) url.searchParams.set(carry[j][0], carry[j][1]);
      if (links[i].href !== url.href) links[i].href = url.href;
    }
  }

  applyTracking();
  window.addEventListener('popstate', applyTracking);
  window.addEventListener('pageshow', applyTracking);
  // Final guard: if something rewrote the query via history.replaceState, the click still carries it.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-login-base]') : null;
    if (a) applyTracking();
  }, true);

  /* ------------------------------------------------------------------
     2. Scroll depth (25 / 50 / 75 / 100, once each)
     ------------------------------------------------------------------ */
  var depthMarks = [25, 50, 75, 100];
  var depthSent = {};

  function checkDepth() {
    var scrollable = Math.max(docEl.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    var pct = scrollable <= 0 ? 100 : ((window.scrollY || window.pageYOffset) / scrollable) * 100;
    for (var i = 0; i < depthMarks.length; i++) {
      var mark = depthMarks[i];
      // 100 fires within the last 2px to absorb sub-pixel rounding on mobile browsers.
      var hit = mark === 100 ? pct >= 99.5 || scrollable - (window.scrollY || 0) <= 2 : pct >= mark;
      if (hit && !depthSent[mark]) {
        depthSent[mark] = true;
        if (typeof window.trackClaimHiveEvent === 'function') {
          window.trackClaimHiveEvent('scroll_depth', { depth: mark, page: 'start' });
        }
      }
    }
  }

  /* ------------------------------------------------------------------
     3. Motion
     ------------------------------------------------------------------ */
  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var motionOK = !(reduceQuery && reduceQuery.matches);

  var shift = document.querySelector('.st-shift');
  var stage = shift ? shift.querySelector('.st-shift__stage') : null;
  var board = shift ? shift.querySelector('.st-board') : null;
  var lastP = -1;

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  function updateShift() {
    if (!shift || !board) return;
    if (!motionOK) {
      if (lastP !== 1) { shift.style.removeProperty('--p'); lastP = 1; }
      return;
    }
    var vh = window.innerHeight;
    var p;
    if (stage && window.getComputedStyle(stage).position === 'sticky') {
      // Desktop: progress across the pinned run of the section, finishing a little early so it rests assembled.
      var r = shift.getBoundingClientRect();
      var run = r.height - stage.offsetHeight;
      p = run > 0 ? clamp01((-r.top) / (run * 0.8)) : 1;
    } else {
      // Mobile / short screens: no pinning; assemble as the board travels from the bottom to the upper third.
      var b = board.getBoundingClientRect();
      var start = vh * 0.95;
      var end = vh * 0.2;
      p = clamp01((start - b.top) / (start - end));
    }
    p = Math.round(p * 1000) / 1000;
    if (p !== lastP) { shift.style.setProperty('--p', String(p)); lastP = p; }
  }

  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!motionOK || !('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) {
          entries[k].target.classList.add('is-in');
          io.unobserve(entries[k].target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    for (var j = 0; j < items.length; j++) {
      // Anything already on screen (reload mid-page, anchor link) shows immediately: no flash.
      var rect = items[j].getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) items[j].classList.add('is-in');
      else io.observe(items[j]);
    }
    docEl.classList.add('reveal-ready');
  }

  if (reduceQuery) {
    var onReduceChange = function () {
      motionOK = !reduceQuery.matches;
      docEl.classList.toggle('motion', motionOK);
      if (!motionOK) {
        var items = document.querySelectorAll('.reveal');
        for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      }
      lastP = -1;
      updateShift();
    };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduceChange);
    else if (reduceQuery.addListener) reduceQuery.addListener(onReduceChange);
  }

  /* ------------------------------------------------------------------
     Scroll loop (one rAF per frame, passive listeners)
     ------------------------------------------------------------------ */
  var ticking = false;
  function onFrame() {
    ticking = false;
    updateShift();
    checkDepth();
  }
  function requestTick() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onFrame); }
  }

  setupReveal();
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  onFrame();
})();
