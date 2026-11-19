/**
 * ClaimHive — /start (Google Ads landing page), v3
 *
 * 1. Attribution: copies utm_* and gclid from the landing URL onto every
 *    https://ops.claimhive.app/login link (on load, on history changes, and
 *    again at click time). Other params already on the login href are kept.
 * 2. Scroll depth: fires `scroll_depth` with { depth: 25|50|75|100, page: 'start' }
 *    once each through window.trackClaimHiveEvent (js/analytics.js).
 * 3. Header: `is-top` while the page sits at the top (transparent over the hero).
 * 4. Scenes (motion allowed only): one rAF-throttled passive scroll handler reads one
 *    rect per near-viewport [data-scene], then writes progress --p (0..1, non-inherited,
 *    see css/start.css) on that scene's [data-p] elements, only where CSS uses it.
 *    First run waits for first paint + idle. `is-live` gates will-change; `html.scenes` pinning.
 * 5. Footage: the videos in the product windows carry no source until their window is within
 *    about one viewport. ONE IntersectionObserver loads and plays them, and pauses them when they
 *    leave. Nothing is requested before the page's load event; with reduced motion, no IntersectionObserver
 *    or Save-Data the poster image stays and no video file is ever requested. In the pinned acts only the
 *    act on screen plays.
 * CTA clicks are tracked by js/analytics.js via [data-cta-location].
 */
(function () {
  'use strict';

  var LOGIN_ORIGIN = 'https://ops.claimhive.app';
  var LOGIN_PATH = '/login';
  var docEl = document.documentElement;

  /* ------------------------------------------------------------------
     1. UTM + gclid preservation (unchanged from v1)
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
     Measurements (after first paint, then on resize / body size change; never in the scroll path)
     ------------------------------------------------------------------ */
  var header = document.querySelector('.st-header');
  var ready = false;        // false until init(): no layout reads, no scene writes, no depth events
  var vh = 0;
  var hdrH = 0;
  var scrollable = 0;

  function measure() {
    vh = window.innerHeight;
    hdrH = header ? header.offsetHeight : 0;
    scrollable = Math.max(docEl.scrollHeight, document.body.scrollHeight) - vh;
  }

  /* ------------------------------------------------------------------
     2. Scroll depth (25 / 50 / 75 / 100, once each)
     ------------------------------------------------------------------ */
  var depthMarks = [25, 50, 75, 100];
  var depthSent = {};

  function checkDepth(y) {
    var pct = scrollable <= 0 ? 100 : (y / scrollable) * 100;
    for (var i = 0; i < depthMarks.length; i++) {
      var mark = depthMarks[i];
      // 100 fires within the last 2px to absorb sub-pixel rounding on mobile browsers.
      var hit = mark === 100 ? pct >= 99.5 || scrollable - y <= 2 : pct >= mark;
      if (hit && !depthSent[mark]) {
        depthSent[mark] = true;
        if (typeof window.trackClaimHiveEvent === 'function') {
          window.trackClaimHiveEvent('scroll_depth', { depth: mark, page: 'start' });
        }
      }
    }
  }

  /* ------------------------------------------------------------------
     3. Header state (a class toggle only; no layout read)
     ------------------------------------------------------------------ */
  var atTop = null;
  function updateHeader(y) {
    var top = y <= 8;
    if (header && top !== atTop) {
      atTop = top;
      header.classList.toggle('is-top', top);
    }
  }

  /* ------------------------------------------------------------------
     4. Scenes
     ------------------------------------------------------------------ */
  function mq(q) { return window.matchMedia ? window.matchMedia(q) : null; }
  function matches(m) { return !!(m && m.matches); }
  var reduceQuery = mq('(prefers-reduced-motion: reduce)');
  var pinQuery = mq('(min-width: 1024px) and (min-height: 680px)'); // = pinning rules in css/start.css
  var wideQuery = mq('(min-width: 1024px)'); // = hero tilt rules
  var motionOK = !matches(reduceQuery);
  var hasIO = 'IntersectionObserver' in window;

  var scenes = [];
  var roots = document.querySelectorAll('[data-scene]');
  for (var s = 0; s < roots.length; s++) {
    scenes.push({
      el: roots[s],
      kind: roots[s].getAttribute('data-scene'),
      targets: roots[s].querySelectorAll('[data-p]'), // the only elements whose CSS reads --p
      live: !hasIO,
      p: '', // last written value ('' = not set)
      flags: '' // acts: last ring/press state
    });
  }

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  // Does CSS read --p for this scene at this size? The shift and the acts scrub only while pinned
  // (phones and short screens show the final state); the hero tilts from 1024px.
  function uses(kind, pinned) {
    if (kind === 'hero') return matches(wideQuery);
    return pinned;
  }

  function progress(kind, pinned, r) {
    var run = r.height - (vh - hdrH);   // distance a pinned stage stays stuck
    if (kind === 'hero') return clamp01((hdrH - r.top) / (vh * 0.5));
    // Shift: finish at 85% of the run so the window rests with its ghosts. Acts: the whole run.
    if (kind === 'shift') return run > 0 ? clamp01((hdrH - r.top) / (run * 0.85)) : 1;
    return run > 0 ? clamp01((hdrH - r.top) / run) : 0;
  }

  // Acts: ring and press on the Approve control (act 1), as classes on the scene root (timed in CSS)
  var FLAGS = ['is-ring1', 'is-press1'];
  function actFlags(v) {
    if (v === '') return '00';
    var t = Number(v) * 3;
    return (t >= 0.5 ? '1' : '0') + (t >= 0.56 && t < 0.74 ? '1' : '0');
  }

  // Which act's footage should play (pinned: only the act on screen, with a margin for the cross-fade)
  function wantAct(k, v) {
    if (v === '') return true;   // stacked: every act is visible
    var t = Number(v) * 3;
    return t > k - 0.1 && t < k + 1.1;
  }

  function write(sc, v) {
    if (sc.p !== v) {
      sc.p = v;
      for (var k = 0; k < sc.targets.length; k++) {
        if (v === '') sc.targets[k].style.removeProperty('--p');
        else sc.targets[k].style.setProperty('--p', v);
      }
    }
    if (sc.kind === 'acts') {
      var f = actFlags(v);
      if (f !== sc.flags) {
        sc.flags = f;
        for (var j = 0; j < FLAGS.length; j++) sc.el.classList.toggle(FLAGS[j], f.charAt(j) === '1');
      }
      for (var m = 0; m < vids.length; m++) {
        if (vids[m].act < 0) continue;
        var w = wantAct(vids[m].act, v);
        if (w !== vids[m].want) { vids[m].want = w; syncVideo(vids[m]); }
      }
    }
  }

  /* ------------------------------------------------------------------
     5. Footage (see the header comment)
     ------------------------------------------------------------------ */
  var vids = [];                 // { el, media, act, near, want, loaded }
  var videosStarted = false;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  function noop() {}

  // Play when near, wanted and motion is allowed; load the sources the first time; pause otherwise.
  function syncVideo(v) {
    var go = v.near && v.want && motionOK && !saveData;
    if (go) {
      if (!v.loaded) {
        v.loaded = true;
        var srcs = v.el.querySelectorAll('source[data-src]');
        for (var i = 0; i < srcs.length; i++) srcs[i].src = srcs[i].getAttribute('data-src');
        v.el.load();
      }
      if (v.el.paused) {
        var pr = v.el.play();
        if (pr && typeof pr.catch === 'function') pr.catch(noop);   // autoplay refused: the poster stays
      }
    } else if (v.loaded && !v.el.paused) {
      v.el.pause();
    }
  }

  function startVideos() {
    if (videosStarted || !hasIO) return;
    videosStarted = true;
    var els = document.querySelectorAll('.pw__vid');
    for (var i = 0; i < els.length; i++) {
      var act = els[i].getAttribute('data-act');
      var v = { el: els[i], media: els[i].parentNode, act: act === null ? -1 : Number(act), near: false, want: true, loaded: false };
      els[i].addEventListener('playing', (function (m) { return function () { m.classList.add('is-playing'); }; })(v.media));
      vids.push(v);
    }
    // One observer for every video. Root margin = one viewport above and below.
    var vio = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        for (var j = 0; j < vids.length; j++) {
          if (vids[j].el !== entries[k].target) continue;
          vids[j].near = entries[k].isIntersecting;
          syncVideo(vids[j]);
        }
      }
    }, { rootMargin: '100% 0px 100% 0px' });
    for (var n = 0; n < vids.length; n++) vio.observe(vids[n].el);
  }

  // Reduced motion switched on after load: back to the posters. Switched off: resume.
  function syncAllVideos() {
    for (var i = 0; i < vids.length; i++) {
      if (!motionOK) vids[i].media.classList.remove('is-playing');
      syncVideo(vids[i]);
    }
  }

  // Footage starts only after the load event (the hero poster is the LCP image), then when idle.
  function startVideosAfterLoad() {
    var go = function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(startVideos, { timeout: 1500 });
      else window.setTimeout(startVideos, 200);
    };
    if (!motionOK || saveData || !hasIO) return;
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
  }

  var next = [];
  function updateScenes() {
    var pinned = matches(pinQuery);
    var i;
    // Read every rect first ...
    for (i = 0; i < scenes.length; i++) {
      var sc = scenes[i];
      next[i] = null;                                   // null = leave as is
      if (!uses(sc.kind, pinned)) next[i] = '';
      else if (sc.live) {
        var p = progress(sc.kind, pinned, sc.el.getBoundingClientRect());
        next[i] = String(Math.round(p * 1000) / 1000);
      }
    }
    // ... then write, and only values that changed.
    for (i = 0; i < scenes.length; i++) if (next[i] !== null) write(scenes[i], next[i]);
  }

  // One entrance (the offer): shown once as it enters.
  function setupReveal() {
    var items = document.querySelectorAll('.st-reveal:not(.is-in)');
    if (!hasIO) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }
    var rio = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) {
          entries[k].target.classList.add('is-in');
          rio.unobserve(entries[k].target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    for (var j = 0; j < items.length; j++) rio.observe(items[j]);
  }

  function setMotion(on) {
    motionOK = on;
    docEl.classList.toggle('motion', on);
    docEl.classList.toggle('scenes', on);
    for (var i = 0; i < scenes.length; i++) {
      if (!on) { write(scenes[i], ''); scenes[i].el.classList.remove('is-live'); }
      else if (scenes[i].live) scenes[i].el.classList.add('is-live');
    }
    if (on) { setupReveal(); startVideosAfterLoad(); }
    syncAllVideos();
    onResize();   // pinned sections change the page height
  }

  /* ------------------------------------------------------------------
     Frame loop (one rAF per frame, passive listeners)
     ------------------------------------------------------------------ */
  var ticking = false;
  function onFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    updateHeader(y);
    if (!ready) return;
    if (motionOK) updateScenes();
    checkDepth(y);
  }
  function requestTick() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onFrame); }
  }

  function onResize() {
    if (!ready) return;
    measure();
    requestTick();
  }

  // Once, after first paint, when idle (the hero is already right from CSS at p = 0).
  function init() {
    ready = true;
    measure();
    if (motionOK) setupReveal();
    startVideosAfterLoad();
    if (hasIO) {
      var io = new IntersectionObserver(function (entries) {
        for (var k = 0; k < entries.length; k++) {
          for (var i = 0; i < scenes.length; i++) {
            if (scenes[i].el !== entries[k].target) continue;
            scenes[i].live = entries[k].isIntersecting;
            scenes[i].el.classList.toggle('is-live', scenes[i].live && motionOK);
          }
        }
        requestTick();
      }, { rootMargin: '25% 0px 25% 0px' });
      for (var j = 0; j < scenes.length; j++) io.observe(scenes[j].el);
    }
    // content-visibility sections change the page height as they render: keep depth math current.
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(document.body);
    requestTick();
  }

  // Cheap, and before first paint where possible: no layout reads here.
  if (motionOK) docEl.classList.add('scenes');
  updateHeader(window.scrollY || window.pageYOffset || 0);

  function listen(m, fn) {
    if (!m) return;
    if (m.addEventListener) m.addEventListener('change', fn);
    else if (m.addListener) m.addListener(fn);
  }
  listen(reduceQuery, function () { setMotion(!reduceQuery.matches); });
  listen(pinQuery, onResize);
  listen(wideQuery, onResize);

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', onResize);
  window.addEventListener('pageshow', onResize);   // back/forward cache restores skip the load event

  window.requestAnimationFrame(function () {
    if ('requestIdleCallback' in window) window.requestIdleCallback(init, { timeout: 800 });
    else window.setTimeout(init, 50);
  });
})();
