/**
 * ClaimHive — /start-huge (HUGE Inc. Brooklyn Motion & Interaction Engine)
 *
 * Drives:
 * 1. Lenis inertial smooth scrolling (disabled under prefers-reduced-motion)
 * 2. Reading progress hairline + header light/dark surface inversion
 * 3. Active chapter nav indicator
 * 4. Real ClaimHive video lazy-loading & reliable autoplay over pre-painted .webp posters
 * 5. Chapter 2: Interactive "6+ Tools vs. One File" architectural switcher
 * 6. Chapter 3: Interactive Approval Gate workbench (SAMPLE-0001)
 * 7. Chapter 4: Seamless Isometric Architectural Exhibit (scroll-scrubbed + clickable tabs + mouse depth)
 * 8. Lazy loader for the real #chs Parallel Claim Team board (js/claim-run.js)
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. Lenis Inertial Smooth Scroll
     ------------------------------------------------------------------ */
  var lenis = null;
  if (!prefersReduced && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.12,
      easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
      smoothWheel: true,
      smoothTouch: false
    });

    function raf(time) {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    }
    window.requestAnimationFrame(raf);

    // Smooth anchor links via Lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -68 });
      });
    });
  }

  /* ------------------------------------------------------------------
     2. Header Surface Inversion, Reading Progress & Active Nav Links
     ------------------------------------------------------------------ */
  var header = document.getElementById('hgHeader');
  var progressBar = document.getElementById('hgProgress');
  var darkSections = Array.prototype.slice.call(document.querySelectorAll('[data-surface="dark"]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.hg-nav a[href^="#"]'));
  var trackedSections = navLinks
    .map(function (a) { return { link: a, el: document.querySelector(a.getAttribute('href')) }; })
    .filter(function (item) { return Boolean(item.el); });

  function onScrollFrame() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var ratio = Math.min(1, Math.max(0, scrollY / docHeight));

    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    }

    // Invert header cleanly when crossing dark architectural chapters
    if (header && darkSections.length) {
      var probeY = 34;
      var overDark = false;
      for (var i = 0; i < darkSections.length; i++) {
        var r = darkSections[i].getBoundingClientRect();
        if (r.top <= probeY && r.bottom >= probeY) {
          overDark = true;
          break;
        }
      }
      header.classList.toggle('is-dark', overDark);
    }

    // Highlight active chapter in nav
    var activeItem = null;
    for (var j = 0; j < trackedSections.length; j++) {
      var rect = trackedSections[j].el.getBoundingClientRect();
      if (rect.top <= 160) activeItem = trackedSections[j];
    }
    for (var k = 0; k < trackedSections.length; k++) {
      trackedSections[k].link.classList.toggle('is-active', trackedSections[k] === activeItem);
    }
  }

  var scrollTick = false;
  function queueScroll() {
    if (scrollTick) return;
    scrollTick = true;
    window.requestAnimationFrame(function () {
      scrollTick = false;
      onScrollFrame();
      updateHeroPerspective();
      updatePileFromScroll();
      updateGateFromScroll();
      updateExhibitFromScroll();
    });
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });

  /* ------------------------------------------------------------------
     3. Real ClaimHive Video Loader (Instant .webp poster, zero black flash)
     ------------------------------------------------------------------ */
  var videos = Array.prototype.slice.call(document.querySelectorAll('video.hg-stage__vid'));
  function activateVideo(v) {
    if (!v || v.dataset.loaded) return;
    v.dataset.loaded = '1';
    var sources = v.querySelectorAll('source[data-src]');
    for (var i = 0; i < sources.length; i++) {
      sources[i].src = sources[i].getAttribute('data-src');
    }
    v.addEventListener('playing', function () {
      v.classList.add('is-playing');
    }, { once: true });
    v.load();
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  if (!prefersReduced && videos.length) {
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            activateVideo(v);
            if (v.dataset.loaded && v.paused) {
              var pr = v.play();
              if (pr && pr.catch) pr.catch(function () {});
            }
          } else if (v.dataset.loaded && !v.paused) {
            v.pause();
          }
        });
      }, { rootMargin: '250px 0px' });
      videos.forEach(function (v) { vio.observe(v); });
    } else {
      videos.forEach(activateVideo);
    }
  }

  /* ------------------------------------------------------------------
     3b. Chapter 1: Hero Uncut Perspective Settle (zero edge clipping)
     ------------------------------------------------------------------ */
  var heroStage = document.getElementById('hgHeroStage');
  function updateHeroPerspective() {
    if (!heroStage || prefersReduced || window.innerWidth <= 768) return;
    var r = heroStage.getBoundingClientRect();
    var vh = window.innerHeight || 900;
    // Settles from 4.5deg angled blueprint at load to flat 0deg as it enters center viewport
    var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.55)));
    var ease = 1 - Math.pow(1 - p, 3);
    var rotX = (1 - ease) * 4.5;
    var sc = 0.975 + ease * 0.025;
    heroStage.style.transform = 'rotateX(' + rotX.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
  }

  /* ------------------------------------------------------------------
     4. Chapter 2: Scroll-Driven 7-Tool Anxiety Pile -> One ClaimHive File
     ------------------------------------------------------------------ */
  var pileRunway = document.getElementById('one-file');
  var pileRoot = document.getElementById('hgPileRoot');
  var chaosLayer = document.getElementById('hgChaosLayer');
  var calmLayer = document.getElementById('hgCalmLayer');
  var chaosCards = chaosLayer ? Array.prototype.slice.call(chaosLayer.querySelectorAll('.hg-chaos-card')) : [];
  var pileFill = document.getElementById('hgPileFill');
  var pileHint = document.getElementById('hgPileHint');
  var btnJumpChaos = document.getElementById('hgPileJumpChaos');
  var btnJumpCalm = document.getElementById('hgPileJumpCalm');
  var pileManualLockUntil = 0;

  function applyPileProgress(p) {
    if (!pileRoot || !chaosLayer || !calmLayer) return;
    var clamped = Math.min(1, Math.max(0, p));

    if (pileFill) {
      pileFill.style.transform = 'scaleX(' + (0.06 + clamped * 0.94).toFixed(4) + ')';
    }

    var isCalm = clamped >= 0.52;
    pileRoot.setAttribute('data-phase', isCalm ? 'calm' : 'chaos');
    if (btnJumpChaos) btnJumpChaos.classList.toggle('is-active', !isCalm);
    if (btnJumpCalm) btnJumpCalm.classList.toggle('is-active', isCalm);
    if (pileHint) {
      pileHint.textContent = isCalm
        ? 'Collapsed into one ClaimHive file. Scroll back up to compare ↑'
        : 'Scroll down to collapse the pile into one file ↓';
    }

    // Activate real claim-overview video once calm layer starts emerging
    if (clamped > 0.35 && !prefersReduced) {
      var calmVid = calmLayer.querySelector('video.hg-stage__vid');
      if (calmVid) activateVideo(calmVid);
    }

    // Mobile / reduced motion: clean instant phase switch without inline transform overrides
    if (window.innerWidth <= 960 || prefersReduced) return;

    // 0.00 -> 0.32: subtle tense crowding; 0.32 -> 0.68: vacuum inward collapse to center
    var collapse = Math.min(1, Math.max(0, (clamped - 0.30) / 0.38));
    var easeOut = 1 - Math.pow(1 - collapse, 3);
    var crowd = Math.min(1, clamped / 0.30);

    for (var i = 0; i < chaosCards.length; i++) {
      var card = chaosCards[i];
      var cx = parseFloat(card.getAttribute('data-cx')) || 0;
      var cy = parseFloat(card.getAttribute('data-cy')) || 0;
      var rot = parseFloat(card.getAttribute('data-rot')) || 0;

      // Early scroll: cards nudge slightly inward/jostle (feeling pressure); then collapse to center
      var tx = cx * easeOut + (crowd * (i % 2 === 0 ? 6 : -6) * (1 - easeOut));
      var ty = cy * easeOut + (crowd * (i % 2 === 0 ? -4 : 5) * (1 - easeOut));
      var r = rot * (1 - easeOut);
      var sc = 1 - easeOut * 0.62;
      var op = Math.max(0, 1 - easeOut * 1.18);

      card.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      card.style.opacity = op.toFixed(3);
    }

    chaosLayer.style.pointerEvents = easeOut > 0.85 ? 'none' : 'auto';
    chaosLayer.style.opacity = Math.max(0, 1 - Math.max(0, (collapse - 0.65) / 0.35)).toFixed(3);

    // Calm single ClaimHive file rises cleanly into full view (0.42 -> 0.72)
    var reveal = Math.min(1, Math.max(0, (clamped - 0.42) / 0.30));
    var revealEase = 1 - Math.pow(1 - reveal, 3);
    calmLayer.style.opacity = revealEase.toFixed(3);
    calmLayer.style.transform = 'scale(' + (0.94 + revealEase * 0.06).toFixed(4) + ')';
  }

  function updatePileFromScroll() {
    if (!pileRunway || !pileRoot || window.innerWidth <= 960 || prefersReduced) return;
    if (Date.now() < pileManualLockUntil) return;
    var rect = pileRunway.getBoundingClientRect();
    var navH = 68;
    var scrollable = pileRunway.offsetHeight - (window.innerHeight - navH);
    if (scrollable <= 60) return;
    var p = (navH - rect.top) / scrollable;
    applyPileProgress(p);
  }

  function jumpPileTo(targetP) {
    pileManualLockUntil = Date.now() + 850;
    applyPileProgress(targetP);
    if (!pileRunway || window.innerWidth <= 960 || prefersReduced) return;
    var rect = pileRunway.getBoundingClientRect();
    var topAbs = rect.top + (window.scrollY || window.pageYOffset || 0);
    var scrollable = Math.max(1, pileRunway.offsetHeight - (window.innerHeight - 68));
    var y = topAbs - 68 + targetP * scrollable;
    if (lenis) lenis.scrollTo(y, { duration: 0.75 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  if (btnJumpChaos) btnJumpChaos.addEventListener('click', function () { jumpPileTo(0); });
  if (btnJumpCalm)  btnJumpCalm.addEventListener('click', function () { jumpPileTo(0.88); });
  applyPileProgress(0);
  updateHeroPerspective();

  /* ------------------------------------------------------------------
     5. Chapter 3: Scroll-Choreographed Gmail -> ClaimHive -> Approval Gate
     ------------------------------------------------------------------ */
  var gateRunway = document.getElementById('approval');
  var gateRoot = document.getElementById('hgGateRoot');
  var workbench = document.getElementById('hgWorkbench');
  var approveBtn = document.getElementById('hgApproveBtn');
  var resetBtn = document.getElementById('hgResetBtn');
  var draftStateLabel = document.getElementById('hgDraftState');
  var logText = document.getElementById('hgTimelineLog');
  var gateHint = document.getElementById('hgGateHint');
  var gateKicker = document.getElementById('hgGateKicker');
  var step4Sub = document.getElementById('hgStep4Sub');
  var gmPill = document.getElementById('hgGmPill');
  var bridgeFill = document.getElementById('hgBridgeFill');
  var bridgeLabel = document.getElementById('hgBridgeLabel');
  var gateBarFill = document.getElementById('hgGateBarFill');
  var gateRailSteps = gateRoot ? Array.prototype.slice.call(gateRoot.querySelectorAll('.hg-gate-rail__step')) : [];
  var gmChips = gateRoot ? Array.prototype.slice.call(gateRoot.querySelectorAll('.hg-gm-chip')) : [];
  var draftLines = gateRoot ? Array.prototype.slice.call(gateRoot.querySelectorAll('.hg-draft-line')) : [];
  var gateApproved = false;
  var gateManualLockUntil = 0;

  function applyGateState(p) {
    if (!gateRoot || !workbench) return;
    var clamped = Math.min(1, Math.max(0, p));

    // If the user explicitly clicked Approve, stay locked in Step 4 until Reset
    if (gateApproved) {
      gateRoot.setAttribute('data-step', '4');
      if (gateBarFill) gateBarFill.style.transform = 'scaleX(1)';
      if (bridgeFill) bridgeFill.style.transform = 'scaleX(1)';
      if (bridgeLabel) bridgeLabel.textContent = 'Sent ✓';
      if (gmPill) gmPill.textContent = 'Replied · Sent';
      if (draftStateLabel) draftStateLabel.textContent = 'Approved · Sent';
      if (gateKicker) gateKicker.textContent = 'Step 4 · Approved by you';
      if (step4Sub) step4Sub.textContent = 'Sent via Gmail & logged ✓';
      if (gateHint) gateHint.innerHTML = '<strong>Sent through Gmail</strong> and recorded on <span class="hg-mono">SAMPLE-0001</span>.';
      if (logText) logText.innerHTML = 'Reply approved by PA, sent through Gmail, and logged on claim <span class="hg-mono">SAMPLE-0001</span>.';
      gmChips.forEach(function (c) { c.classList.add('is-lit'); });
      draftLines.forEach(function (l) { l.classList.add('is-written'); });
      gateRailSteps.forEach(function (s, idx) {
        s.classList.toggle('is-active', idx === 3);
        s.classList.toggle('is-done', idx < 3);
        s.classList.toggle('is-approved', idx === 3);
      });
      return;
    }

    // Mobile / reduced motion: jump straight to Step 3 (ready for user click)
    if (window.innerWidth <= 960 || prefersReduced) {
      clamped = 0.85;
    }

    var step = 1;
    if (clamped >= 0.62) step = 3;
    else if (clamped >= 0.22) step = 2;

    gateRoot.setAttribute('data-step', String(step));

    // Top 4-step bar progresses across steps 1..3 (0.25 -> 0.75) and hits 1.00 only on human Approve click!
    if (gateBarFill) {
      var barRatio = 0.25 + clamped * 0.50;
      gateBarFill.style.transform = 'scaleX(' + barRatio.toFixed(4) + ')';
    }

    // Center Gmail -> ClaimHive bridge fill (0.15 -> 0.58)
    var bridgeP = Math.min(1, Math.max(0, (clamped - 0.14) / 0.44));
    if (bridgeFill) bridgeFill.style.transform = 'scaleX(' + bridgeP.toFixed(4) + ')';

    // Reveal extracted Gmail intelligence chips sequentially during Step 2 (0.20, 0.30, 0.40)
    gmChips.forEach(function (chip, idx) {
      chip.classList.toggle('is-lit', clamped >= 0.20 + idx * 0.10);
    });

    // Reveal drafted reply lines sequentially during Step 2 -> 3 (0.34, 0.46, 0.56)
    draftLines.forEach(function (line, idx) {
      line.classList.toggle('is-written', clamped >= 0.34 + idx * 0.11);
    });

    gateRailSteps.forEach(function (s, idx) {
      s.classList.remove('is-approved');
      s.classList.toggle('is-active', idx === step - 1);
      s.classList.toggle('is-done', idx < step - 1);
    });

    if (step === 1) {
      if (gmPill) gmPill.textContent = 'New in Gmail';
      if (bridgeLabel) bridgeLabel.textContent = 'Synced';
      if (draftStateLabel) draftStateLabel.textContent = 'Waiting for Gmail';
      if (gateKicker) gateKicker.textContent = 'Approval gate';
      if (step4Sub) step4Sub.textContent = 'Click “Approve reply” below';
      if (gateHint) gateHint.innerHTML = '<strong>Scroll down</strong> to watch ClaimHive read this Gmail thread and draft the reply.';
      if (logText) logText.textContent = 'Carrier email arrived in your connected Gmail.';
    } else if (step === 2) {
      if (gmPill) gmPill.textContent = 'Reading Gmail';
      if (bridgeLabel) bridgeLabel.textContent = 'Drafting';
      if (draftStateLabel) draftStateLabel.textContent = 'Drafting reply…';
      if (gateKicker) gateKicker.textContent = 'Drafting for your review';
      if (step4Sub) step4Sub.textContent = 'Click “Approve reply” below';
      if (gateHint) gateHint.innerHTML = '<strong>ClaimHive is reading Gmail</strong> and matching the photo set on <span class="hg-mono">SAMPLE-0001</span>…';
      if (logText) logText.innerHTML = 'Reading reinspection email from Gmail and drafting reply on <span class="hg-mono">SAMPLE-0001</span>.';
    } else {
      if (gmPill) gmPill.textContent = 'Matched · Read';
      if (bridgeLabel) bridgeLabel.textContent = 'Held';
      if (draftStateLabel) draftStateLabel.textContent = 'Held · Not sent';
      if (gateKicker) gateKicker.textContent = 'Your turn · Step 4';
      if (step4Sub) step4Sub.textContent = 'Click “Approve reply” below ↓';
      if (gateHint) gateHint.innerHTML = '<strong>Click “Approve reply”</strong> to send through Gmail and log on the claim.';
      if (logText) logText.textContent = 'Draft held at your approval gate — click “Approve reply” to send and log.';
    }
  }

  function updateGateFromScroll() {
    if (!gateRunway || !gateRoot || window.innerWidth <= 960 || prefersReduced) return;
    if (Date.now() < gateManualLockUntil) return;
    var rect = gateRunway.getBoundingClientRect();
    var navH = 68;
    var scrollable = gateRunway.offsetHeight - (window.innerHeight - navH);
    if (scrollable <= 60) return;
    var p = (navH - rect.top) / scrollable;
    applyGateState(p);
  }

  function approveGate() {
    if (!workbench || !approveBtn || gateApproved) return;
    gateApproved = true;
    workbench.classList.add('is-approved');
    approveBtn.disabled = true;
    approveBtn.innerHTML = '<span>Approved</span><span class="hg-btn__arrow" aria-hidden="true">✓</span>';
    applyGateState(1);
  }

  if (workbench && approveBtn) {
    approveBtn.addEventListener('click', approveGate);

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        gateApproved = false;
        workbench.classList.remove('is-approved');
        approveBtn.disabled = false;
        approveBtn.innerHTML = '<span>Approve reply</span><span class="hg-btn__arrow" aria-hidden="true">→</span>';
        applyGateState(0.82);
      });
    }

    gateRailSteps.forEach(function (stepBtn) {
      stepBtn.addEventListener('click', function () {
        var target = stepBtn.getAttribute('data-gate-jump');
        if (target === 'approve') {
          if (gateApproved) return;
          // Guide the user straight to Step 3 and focus the real Approve reply button so they perform the approval click
          gateManualLockUntil = Date.now() + 850;
          applyGateState(0.84);
          if (gateRunway && window.innerWidth > 960 && !prefersReduced) {
            var r4 = gateRunway.getBoundingClientRect();
            var top4 = r4.top + (window.scrollY || window.pageYOffset || 0);
            var scr4 = Math.max(1, gateRunway.offsetHeight - (window.innerHeight - 68));
            var y4 = top4 - 68 + 0.84 * scr4;
            if (lenis) lenis.scrollTo(y4, { duration: 0.55 });
            else window.scrollTo({ top: y4, behavior: 'smooth' });
          }
          approveBtn.focus({ preventScroll: true });
          approveBtn.classList.add('is-nudged');
          window.setTimeout(function () { approveBtn.classList.remove('is-nudged'); }, 420);
          return;
        }
        var targetP = parseFloat(target) || 0;
        if (gateApproved) {
          gateApproved = false;
          workbench.classList.remove('is-approved');
          approveBtn.disabled = false;
          approveBtn.innerHTML = '<span>Approve reply</span><span class="hg-btn__arrow" aria-hidden="true">→</span>';
        }
        gateManualLockUntil = Date.now() + 850;
        applyGateState(targetP);
        if (gateRunway && window.innerWidth > 960 && !prefersReduced) {
          var rect = gateRunway.getBoundingClientRect();
          var topAbs = rect.top + (window.scrollY || window.pageYOffset || 0);
          var scrollable = Math.max(1, gateRunway.offsetHeight - (window.innerHeight - 68));
          var y = topAbs - 68 + targetP * scrollable;
          if (lenis) lenis.scrollTo(y, { duration: 0.7 });
          else window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });

    applyGateState(0);
  }

  /* ------------------------------------------------------------------
     6. Chapter 4: Seamless Full-Bleed Isometric Architectural Exhibit
     ------------------------------------------------------------------ */
  var exhibit = document.getElementById('properties');
  var exhibitTabs = exhibit ? Array.prototype.slice.call(exhibit.querySelectorAll('.hg-exhibit__tab')) : [];
  var exhibitCopies = exhibit ? Array.prototype.slice.call(exhibit.querySelectorAll('.hg-exhibit__slide-copy')) : [];
  var exhibitFrames = exhibit ? Array.prototype.slice.call(exhibit.querySelectorAll('.hg-iso-frame')) : [];
  var exhibitCounter = document.getElementById('hgExhibitCounter');
  var prevBtn = document.getElementById('hgExhibitPrev');
  var nextBtn = document.getElementById('hgExhibitNext');
  var activeSlide = 0;
  var manualLockUntil = 0;

  function setExhibitSlide(index) {
    if (!exhibit || !exhibitTabs.length) return;
    var count = exhibitTabs.length;
    var idx = ((index % count) + count) % count;
    if (idx === activeSlide && exhibit.dataset.inited === '1') return;
    exhibit.dataset.inited = '1';
    activeSlide = idx;

    var bg = exhibitTabs[idx].getAttribute('data-bg') || '#BBD7C2';
    exhibit.style.setProperty('--ex-bg', bg);

    for (var i = 0; i < count; i++) {
      var on = i === idx;
      exhibitTabs[i].classList.toggle('is-active', on);
      exhibitTabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      if (exhibitCopies[i]) exhibitCopies[i].classList.toggle('is-active', on);
      if (exhibitFrames[i]) exhibitFrames[i].classList.toggle('is-active', on);
    }

    if (exhibitCounter) {
      exhibitCounter.textContent = (idx + 1) + ' of ' + count + ' · ' + (exhibitTabs[idx].getAttribute('data-label') || '');
    }
  }

  function scrollToExhibitSlide(idx) {
    manualLockUntil = Date.now() + 900;
    setExhibitSlide(idx);
    if (!exhibit || window.innerWidth <= 960 || prefersReduced) return;
    var rect = exhibit.getBoundingClientRect();
    var topAbs = rect.top + (window.scrollY || window.pageYOffset || 0);
    var scrollable = Math.max(1, exhibit.offsetHeight - window.innerHeight);
    var targetY = topAbs + (idx / Math.max(1, exhibitTabs.length - 1)) * scrollable * 0.92;
    if (lenis) lenis.scrollTo(targetY, { duration: 0.75 });
    else window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  function updateExhibitFromScroll() {
    if (!exhibit || !exhibitTabs.length || window.innerWidth <= 960 || prefersReduced) return;
    if (Date.now() < manualLockUntil) return;
    var rect = exhibit.getBoundingClientRect();
    var navH = 68;
    var scrollable = exhibit.offsetHeight - (window.innerHeight - navH);
    if (scrollable <= 60) return;
    var progress = (navH - rect.top) / scrollable;
    if (progress < 0 || progress > 1.05) return;
    var clamped = Math.min(0.999, Math.max(0, progress));
    var idx = Math.floor(clamped * exhibitTabs.length);
    setExhibitSlide(idx);
  }

  if (exhibit && exhibitTabs.length) {
    setExhibitSlide(0);
    exhibitTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { scrollToExhibitSlide(i); });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { scrollToExhibitSlide(activeSlide - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { scrollToExhibitSlide(activeSlide + 1); });

    // Subtle pointer depth on active isometric building
    if (!prefersReduced) {
      var canvasArea = exhibit.querySelector('.hg-exhibit__canvas');
      if (canvasArea) {
        canvasArea.addEventListener('mousemove', function (e) {
          var activeWrap = exhibit.querySelector('.hg-iso-frame.is-active .hg-iso-img-wrap');
          if (!activeWrap) return;
          var r = canvasArea.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width - 0.5;
          var ny = (e.clientY - r.top) / r.height - 0.5;
          activeWrap.style.transform = 'translate3d(' + (nx * -16).toFixed(1) + 'px, ' + (ny * -10).toFixed(1) + 'px, 0) scale(1.02)';
        });
        canvasArea.addEventListener('mouseleave', function () {
          var activeWrap = exhibit.querySelector('.hg-iso-frame.is-active .hg-iso-img-wrap');
          if (activeWrap) activeWrap.style.transform = 'translate3d(0, 0, 0) scale(1)';
        });
      }
    }
  }

  // Initial state paint
  onScrollFrame();
})();
