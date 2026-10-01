/**
 * Claim Hive — Universal Site Script ("site.js")
 * Manages responsive navigation, mobile drawer with viewport bounds & body scroll lock,
 * active page highlights, and toast notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Drawer & Viewport Bounds
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileDrawer = document.querySelector('.mobile-menu-drawer');
  const siteHeader = document.querySelector('.site-header');

  function updateDrawerPosition() {
    if (siteHeader && mobileDrawer) {
      const rect = siteHeader.getBoundingClientRect();
      const topOffset = Math.max(0, Math.round(rect.bottom));
      mobileDrawer.style.top = topOffset + 'px';
      mobileDrawer.style.height = (window.innerHeight - topOffset) + 'px';
    }
  }

  function openDrawer() {
    updateDrawerPosition();
    mobileDrawer.classList.add('open');
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'true');
      mobileToggle.innerHTML = '✕';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.innerHTML = '☰';
    }
    document.body.style.overflow = '';
  }

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.contains('open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Close when tapping any link inside mobile drawer
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Recalculate on screen resize or phone orientation change
    window.addEventListener('resize', () => {
      if (mobileDrawer.classList.contains('open')) {
        updateDrawerPosition();
      }
    });
  }

  // 2. Robust Active Page Highlighting (supports clean URLs, GitHub Pages subpaths, and .html)
  const rawPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index';
  const cleanCurrent = rawPath.replace(/\.html$/, '');

  document.querySelectorAll('.nav-link').forEach(link => {
    const rawHref = (link.getAttribute('href') || '').split('?')[0].split('#')[0];
    const cleanHref = (rawHref.split('/').pop() || '').replace(/\.html$/, '');

    const isMatch = (cleanHref === cleanCurrent) ||
                    ((cleanCurrent === 'claimhive' || cleanCurrent === 'index') && (cleanHref === 'index' || cleanHref === ''));

    if (isMatch && cleanHref !== '') {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. Global Toast Utility
  window.showToast = function(message) {
    let toast = document.getElementById('copy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'copy-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  };

  // 4. Live Launch Countdown Timers (Alpha: Oct 1, 2026; Beta: Nov 1, 2026)
  function initCountdowns() {
    // Current simulated reference: October 1, 2026
    const alphaTarget = new Date('2026-10-01T23:59:59-05:00').getTime();
    const betaTarget = new Date('2026-11-01T00:00:00-05:00').getTime();

    function updateClocks() {
      const now = new Date().getTime();

      // Alpha Countdown (Opens Today / Hours Remaining in First Batch)
      const alphaDiff = Math.max(0, alphaTarget - now);
      const aHours = Math.floor((alphaDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const aMinutes = Math.floor((alphaDiff % (1000 * 60 * 60)) / (1000 * 60));
      const aSeconds = Math.floor((alphaDiff % (1000 * 60)) / 1000);

      const alphaEl = document.getElementById('alpha-countdown');
      if (alphaEl) {
        if (alphaDiff > 0) {
          alphaEl.innerHTML = `<span class="countdown-unit"><strong>${String(aHours).padStart(2, '0')}</strong>h</span> : <span class="countdown-unit"><strong>${String(aMinutes).padStart(2, '0')}</strong>m</span> : <span class="countdown-unit"><strong>${String(aSeconds).padStart(2, '0')}</strong>s</span>`;
        } else {
          alphaEl.innerHTML = `<span class="badge badge-gold" style="font-weight:700;">✦ ALPHA OPEN TODAY • INVITE ONLY</span>`;
        }
      }

      // Beta Countdown (November 1, 2026)
      const betaDiff = Math.max(0, betaTarget - now);
      const bDays = Math.floor(betaDiff / (1000 * 60 * 60 * 24));
      const bHours = Math.floor((betaDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const bMinutes = Math.floor((betaDiff % (1000 * 60 * 60)) / (1000 * 60));
      const bSeconds = Math.floor((betaDiff % (1000 * 60)) / 1000);

      const betaEl = document.getElementById('beta-countdown');
      if (betaEl) {
        betaEl.innerHTML = `<span class="countdown-unit"><strong>${String(bDays).padStart(2, '0')}</strong>d</span> : <span class="countdown-unit"><strong>${String(bHours).padStart(2, '0')}</strong>h</span> : <span class="countdown-unit"><strong>${String(bMinutes).padStart(2, '0')}</strong>m</span> : <span class="countdown-unit"><strong>${String(bSeconds).padStart(2, '0')}</strong>s</span>`;
      }

      const betaInlineEl = document.getElementById('beta-inline-countdown');
      if (betaInlineEl) {
        betaInlineEl.textContent = `${bDays}d ${bHours}h ${bMinutes}m ${bSeconds}s`;
      }
    }

    updateClocks();
    setInterval(updateClocks, 1000);
  }
  initCountdowns();

  // 5. Velvet-Rope Waitlist & Position Reveal Mechanics
  const waitlistForms = document.querySelectorAll('.waitlist-form');
  waitlistForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : 'adjuster@claimfirm.com';
      const firmInput = form.querySelector('input[name="firm_name"]');
      const firmName = firmInput && firmInput.value.trim() ? firmInput.value.trim() : 'Your Firm';
      const container = form.closest('.waitlist-box') || form.parentElement;

      // Hash email for consistent position number
      let hash = 0;
      for (let i = 0; i < email.length; i++) {
        hash = (hash << 5) - hash + email.charCodeAt(i);
        hash |= 0;
      }
      const position = 19 + Math.abs(hash % 14);
      const refCode = 'CH-' + Math.abs(hash % 9000 + 1000);
      const refUrl = `https://claimhive.app/invite?ref=${refCode}`;

      container.innerHTML = `
        <div class="waitlist-revealed animate-fade-in" style="padding: 1.5rem 1rem; text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--hive-gold-100); border: 1px solid var(--hive-gold-honey); padding: 0.35rem 0.85rem; border-radius: var(--hive-radius-pill); font-size: 0.75rem; font-weight: 700; color: var(--hive-gold-deep); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.85rem;">
            <span>✦ Priority Invite Queue</span>
          </div>
          <div style="font-family: var(--hive-font-heading); font-size: clamp(2.5rem, 5vw, 3.25rem); font-weight: 800; color: var(--hive-navy-900); line-height: 1;">
            #${position}
          </div>
          <div style="font-size: 0.9375rem; font-weight: 600; color: var(--hive-ink); margin: 0.5rem 0 0.25rem;">
            ${firmName} is #${position} in line.
          </div>
          <p style="font-size: 0.8125rem; color: var(--hive-text-secondary); line-height: 1.5; max-width: 420px; margin: 0 auto 1.25rem;">
            Beta invites are released in cohorts starting November 1. We verify public adjuster licensing before releasing team credentials.
          </p>
          <div style="background: var(--hive-canvas); border: 1px solid var(--hive-border-subtle); border-radius: var(--hive-radius-md); padding: 0.875rem; max-width: 440px; margin: 0 auto 1rem; text-align: left;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--hive-gold-deep); text-transform: uppercase; margin-bottom: 0.25rem;">
              Move Up 25 Spots
            </div>
            <div style="font-size: 0.8125rem; color: var(--hive-text-secondary); margin-bottom: 0.5rem;">
              Share your priority link with another firm owner. When they join, your position advances automatically.
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" readonly value="${refUrl}" style="flex: 1; font-family: var(--hive-font-mono); font-size: 0.75rem; padding: 0.4rem 0.6rem; border: 1px solid var(--hive-border-default); border-radius: 6px; background: #FFF; color: var(--hive-ink);" id="ref-link-field">
              <button type="button" class="btn btn-sm btn-gold" onclick="navigator.clipboard.writeText('${refUrl}'); window.showToast('Priority referral link copied');" style="white-space: nowrap; padding: 0.4rem 0.85rem; font-size: 0.8125rem;">
                Copy
              </button>
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--hive-text-muted);">
            Confirmation dispatched to <strong>${email}</strong>.
          </div>
        </div>
      `;
    });
  });

  // 6. Interactive Seat Estimator for Pricing Page
  const seatSlider = document.getElementById('seat-slider');
  const seatInput = document.getElementById('seat-input');
  const seatPriceDisplay = document.getElementById('seat-price-display');
  const seatTotalDisplay = document.getElementById('seat-total-display');
  const seatCtaBtn = document.getElementById('seat-cta-btn');
  const enterpriseNotice = document.getElementById('enterprise-notice');

  function updateSeatEstimator(val) {
    const seats = parseInt(val, 10);
    if (isNaN(seats)) return;

    if (seatSlider && seatSlider.value != seats) seatSlider.value = Math.min(seats, 15);
    if (seatInput && seatInput.value != seats) seatInput.value = seats;

    if (seats <= 10) {
      const monthly = seats * 80;
      if (seatPriceDisplay) seatPriceDisplay.textContent = `$${monthly}`;
      if (seatTotalDisplay) seatTotalDisplay.textContent = `${seats} seat${seats > 1 ? 's' : ''} at $80 / seat / mo`;
      if (enterpriseNotice) enterpriseNotice.style.display = 'none';
      if (seatCtaBtn) {
        seatCtaBtn.innerHTML = `<span>Request beta access</span> <span class="hive-star-icon">✦</span>`;
        seatCtaBtn.setAttribute('href', '#waitlist');
      }
    } else {
      if (seatPriceDisplay) seatPriceDisplay.textContent = "Custom";
      if (seatTotalDisplay) seatTotalDisplay.textContent = "More than 10 seats — Enterprise tier";
      if (enterpriseNotice) enterpriseNotice.style.display = 'block';
      if (seatCtaBtn) {
        seatCtaBtn.innerHTML = `<span>Let's talk</span> <span class="hive-star-icon">✦</span>`;
        seatCtaBtn.setAttribute('href', 'request.html?plan=enterprise');
      }
    }
  }

  if (seatSlider) {
    seatSlider.addEventListener('input', (e) => updateSeatEstimator(e.target.value));
  }
  if (seatInput) {
    seatInput.addEventListener('input', (e) => updateSeatEstimator(e.target.value));
  }
  if (seatSlider || seatInput) {
    updateSeatEstimator(seatSlider ? seatSlider.value : 3);
  }

  // 7. Global Modal for "Request beta access"
  const alphaModal = document.getElementById('alpha-modal');
  const alphaModalTriggers = document.querySelectorAll('[data-open-modal="beta"], [data-open-modal="alpha"]');
  const alphaModalClose = document.getElementById('alpha-modal-close');

  function openAlphaModal() {
    if (alphaModal) {
      alphaModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeAlphaModal() {
    if (alphaModal) {
      alphaModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  alphaModalTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // If there's an in-page waitlist anchor and user is on index, smooth scroll, else open modal
      const targetHash = btn.getAttribute('href');
      if (targetHash === '#waitlist') {
        const waitlistEl = document.getElementById('waitlist');
        if (waitlistEl) {
          e.preventDefault();
          waitlistEl.scrollIntoView({ behavior: 'smooth' });
          const emailField = waitlistEl.querySelector('input[type="email"]');
          if (emailField) emailField.focus();
          return;
        }
      }
      if (alphaModal) {
        e.preventDefault();
        openAlphaModal();
      }
    });
  });

  if (alphaModalClose) alphaModalClose.addEventListener('click', closeAlphaModal);
  if (alphaModal) {
    alphaModal.addEventListener('click', (e) => {
      if (e.target === alphaModal) closeAlphaModal();
    });
  }

  // 8. Apple-Grade 3D Parallax & Multi-Plane Motion Engine for Hero Hub Stage
  const hubStage = document.getElementById('hero-hub-interactive');
  const hubCard = hubStage ? hubStage.querySelector('.hub-parallax-card') : null;
  const planeBg = hubStage ? hubStage.querySelector('.plane-bg') : null;
  const planeConduits = hubStage ? hubStage.querySelector('.plane-conduits') : null;
  const planeTier1 = hubStage ? hubStage.querySelector('.plane-tier1') : null;
  const planeTier2 = hubStage ? hubStage.querySelector('.plane-tier2') : null;
  const planeCore = hubStage ? hubStage.querySelector('.plane-core') : null;
  const planeChip = hubStage ? hubStage.querySelector('.plane-chip') : null;

  if (hubStage && hubCard) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isHovering = false;
    let animFrame = null;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      function onMouseMove(e) {
        const rect = hubStage.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Normalized offset (-1 to +1)
        const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
        const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

        targetX = normX;
        targetY = normY;
      }

      function renderParallax() {
        // Weighted spring lerp (Apple silky smooth damping)
        currentX += (targetX - currentX) * 0.075;
        currentY += (targetY - currentY) * 0.075;

        const rotX = -currentY * 8.5; // Max tilt 8.5 deg
        const rotY = currentX * 10;   // Max tilt 10 deg

        hubCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;

        // Multi-planar 3D depth shifting across distinct planes
        if (planeBg) planeBg.style.transform = `translate3d(${-currentX * 18}px, ${-currentY * 15}px, -35px)`;
        if (planeConduits) planeConduits.style.transform = `translate3d(${currentX * 3}px, ${currentY * 2.5}px, 0px)`;
        if (planeTier1) planeTier1.style.transform = `translate3d(${currentX * 11}px, ${currentY * 9}px, 26px)`;
        if (planeTier2) planeTier2.style.transform = `translate3d(${currentX * 17}px, ${currentY * 14}px, 44px)`;
        if (planeCore) planeCore.style.transform = `translate3d(${currentX * 24}px, ${currentY * 19}px, 62px)`;
        if (planeChip) planeChip.style.transform = `translate3d(${currentX * 32}px, ${currentY * 26}px, 82px)`;

        animFrame = requestAnimationFrame(renderParallax);
      }

      // Track on document/hero container for expansive parallax feel
      const heroSection = hubStage.closest('section') || hubStage;
      heroSection.addEventListener('mousemove', onMouseMove);
      heroSection.addEventListener('mouseenter', () => {
        isHovering = true;
      });
      heroSection.addEventListener('mouseleave', () => {
        isHovering = false;
        targetX = 0;
        targetY = 0;
      });

      renderParallax();
    }
  }

  // 9. Plan C: Interactive Hour-Shift Console Engine
  const caseloadSlider = document.getElementById('caseload-slider-input');
  const caseloadSliderVal = document.getElementById('caseload-slider-val');
  const caseloadPresets = document.querySelectorAll('.caseload-preset-btn');
  const shiftCard = document.getElementById('caseload-shift-card');
  const btnShiftAction = document.getElementById('btn-shift-action');
  const btnShiftLabel = document.getElementById('btn-shift-label');
  const btnShiftSparkle = document.getElementById('btn-shift-sparkle');

  const shiftViewLabel = document.getElementById('shift-view-label');
  const shiftCaseloadNum = document.getElementById('shift-caseload-num');
  const shiftCaseloadUnit = document.getElementById('shift-caseload-unit');
  const shiftCardSub = document.getElementById('shift-card-sub');
  const shiftStatusPill = document.getElementById('shift-status-pill');

  const shiftBarAdmin = document.getElementById('shift-bar-admin');
  const shiftBarAdjust = document.getElementById('shift-bar-adjust');
  const meterValAdmin = document.getElementById('meter-val-admin');
  const meterLblAdmin = document.getElementById('meter-lbl-admin');
  const meterValAdjust = document.getElementById('meter-val-adjust');
  const meterLblAdjust = document.getElementById('meter-lbl-adjust');
  const telemetryStatusLine = document.getElementById('telemetry-status-line');
  const telemetryDot = document.getElementById('telemetry-dot');
  const telemetryMsg = document.getElementById('telemetry-msg');

  const shiftRow1 = document.getElementById('shift-row-1');
  const shiftRow2 = document.getElementById('shift-row-2');
  const shiftRow3 = document.getElementById('shift-row-3');
  const shiftRow4 = document.getElementById('shift-row-4');

  const shiftTitle1 = document.getElementById('shift-title-1');
  const shiftBadge1 = document.getElementById('shift-badge-1');
  const shiftDesc1 = document.getElementById('shift-desc-1');
  const shiftTitle2 = document.getElementById('shift-title-2');
  const shiftBadge2 = document.getElementById('shift-badge-2');
  const shiftDesc2 = document.getElementById('shift-desc-2');
  const shiftTitle3 = document.getElementById('shift-title-3');
  const shiftBadge3 = document.getElementById('shift-badge-3');
  const shiftDesc3 = document.getElementById('shift-desc-3');
  const shiftTitle4 = document.getElementById('shift-title-4');
  const shiftBadge4 = document.getElementById('shift-badge-4');
  const shiftDesc4 = document.getElementById('shift-desc-4');

  const adjustTopTag = document.getElementById('adjust-top-tag');
  const adjustTagDot = document.getElementById('adjust-tag-dot');
  const adjustTagText = document.getElementById('adjust-tag-text');
  const shiftValAdjust = document.getElementById('shift-val-adjust');
  const shiftValAdjustSub = document.getElementById('shift-val-adjust-sub');

  const shiftAhaCallout = document.getElementById('shift-aha-callout');
  const ahaLeadBadge = document.getElementById('aha-lead-badge');
  const ahaBadgeIcon = document.getElementById('aha-badge-icon');
  const ahaBadgeText = document.getElementById('aha-badge-text');
  const ahaStatement = document.getElementById('aha-statement');
  const ahaSubtext = document.getElementById('aha-subtext');
  const ahaMetricStrip = document.getElementById('aha-metric-strip');
  const ahaMetricVal1 = document.getElementById('aha-metric-val-1');
  const ahaMetricVal2 = document.getElementById('aha-metric-val-2');
  const ahaMetricVal3 = document.getElementById('aha-metric-val-3');

  const shiftClimaxCtaBox = document.getElementById('shift-climax-cta-box');
  const btnClimaxBeta = document.getElementById('btn-climax-beta');
  const btnToggleBack = document.getElementById('btn-toggle-back');

  const shiftSummaryPill = document.getElementById('shift-summary-pill');
  const shiftSummaryStat = document.getElementById('shift-summary-stat');
  const shiftSummarySub = document.getElementById('shift-summary-sub');

  let shiftMode = 'today'; // 'today' or 'chip'
  let currentCases = 20;

  function renderShiftConsole() {
    const cases = parseInt(currentCases, 10) || 20;

    if (caseloadSlider && caseloadSlider.value != cases) caseloadSlider.value = cases;
    if (caseloadSliderVal) caseloadSliderVal.textContent = `${cases} Active Files`;

    caseloadPresets.forEach(btn => {
      const btnCases = parseInt(btn.getAttribute('data-cases'), 10);
      btn.classList.toggle('active', btnCases === cases);
    });

    // Realistic public adjusting 50-hour week model
    const adminHours = Math.min(43, Math.max(18, Math.round(cases * 1.8)));
    const adjustHours = 50 - adminHours;
    const adminPct = Math.round((adminHours / 50) * 100);
    const adjustPct = 100 - adminPct;

    // With ClaimHive: 83% reduction in repetitive clerical
    const adminHive = Math.max(4, Math.round(adminHours * 0.17));
    const adjustHive = 50 - adminHive;
    const adminHivePct = Math.round((adminHive / 50) * 100);
    const adjustHivePct = 100 - adminHivePct;

    const reclaimedHours = adminHours - adminHive;
    const projectedCases = Math.round(cases * 1.9);
    const growthPct = Math.round(((projectedCases - cases) / cases) * 100);

    // Fee capacity expansion: conservative $6,000 avg PA contingency fee per closed file
    const extraFiles = projectedCases - cases;
    const extraFeeRevenue = extraFiles * 6000;

    if (!shiftCard) return;

    if (shiftMode === 'chip') {
      shiftCard.setAttribute('data-mode', 'chip');

      if (shiftViewLabel) shiftViewLabel.textContent = 'WITH CLAIMHIVE (SAME 50-HR WEEK)';
      if (shiftCaseloadNum) {
        shiftCaseloadNum.textContent = projectedCases;
        shiftCaseloadNum.style.color = 'var(--hive-gold-honey)';
      }
      if (shiftCaseloadUnit) shiftCaseloadUnit.textContent = 'active files / PA';
      if (shiftCardSub) {
        shiftCardSub.innerHTML = `<span style="color: var(--hive-gold-honey); font-weight: 600;">+${growthPct}% caseload capacity</span> &bull; 0 new staff`;
      }
      if (shiftStatusPill) {
        shiftStatusPill.className = 'card-tag-pill shift-pill-gold';
        shiftStatusPill.textContent = '✦ 88% Fee-Earning Engine';
      }

      // Telemetry Ratio Meter (Musk First-Principles)
      if (shiftBarAdmin) shiftBarAdmin.style.width = `${adminHivePct}%`;
      if (shiftBarAdjust) shiftBarAdjust.style.width = `${adjustHivePct}%`;
      if (meterValAdmin) meterValAdmin.textContent = `${adminHive}h`;
      if (meterLblAdmin) meterLblAdmin.textContent = 'AI Review';
      if (meterValAdjust) meterValAdjust.textContent = `${adjustHive}h`;
      if (meterLblAdjust) meterLblAdjust.textContent = 'Fee Adjusting ($$$)';

      if (telemetryStatusLine) telemetryStatusLine.className = 'telemetry-status-line chip';
      if (telemetryDot) telemetryDot.textContent = '✦';
      if (telemetryMsg) {
        telemetryMsg.innerHTML = `<strong>88% of your week is shifted directly to fee-earning adjusting.</strong> +$${extraFeeRevenue.toLocaleString()}/yr added fee capacity.`;
      }

      // 4 Chore Rows: marked as delegated
      [shiftRow1, shiftRow2, shiftRow3, shiftRow4].forEach(row => {
        if (row) row.classList.add('is-delegated');
      });

      const c1Hrs = Math.round(adminHours * 0.28);
      const c2Hrs = Math.round(adminHours * 0.22);
      const c3Hrs = Math.round(adminHours * 0.20);
      const c4Hrs = Math.round(adminHours * 0.20);

      if (shiftTitle1) shiftTitle1.innerHTML = '<span class="delegated-check">✓</span> Carrier hold autopilot';
      if (shiftBadge1) {
        shiftBadge1.className = 'shift-badge quiet-reclaimed';
        shiftBadge1.textContent = `Automated • ${c1Hrs}h`;
      }
      if (shiftDesc1) shiftDesc1.textContent = 'Chip auto-tracks statutory deadlines (FL § 627 / TX § 542) & queues ready-to-send bad-faith demands in drafts.';

      if (shiftTitle2) shiftTitle2.innerHTML = '<span class="delegated-check">✓</span> Zero manual intake (OCR)';
      if (shiftBadge2) {
        shiftBadge2.className = 'shift-badge quiet-reclaimed';
        shiftBadge2.textContent = `Automated • ${c2Hrs}h`;
      }
      if (shiftDesc2) shiftDesc2.textContent = 'OCR parses policy PDFs, contractor bids & checks into claim fields in 30 seconds.';

      if (shiftTitle3) shiftTitle3.innerHTML = '<span class="delegated-check">✓</span> Zero photo sorting';
      if (shiftBadge3) {
        shiftBadge3.className = 'shift-badge quiet-reclaimed';
        shiftBadge3.textContent = `Automated • ${c3Hrs}h`;
      }
      if (shiftDesc3) shiftDesc3.textContent = 'Photos auto-filed by slope, elevation & test square from phone before truck engine starts.';

      if (shiftTitle4) shiftTitle4.innerHTML = '<span class="delegated-check">✓</span> Zero "update?" interruptions';
      if (shiftBadge4) {
        shiftBadge4.className = 'shift-badge quiet-reclaimed';
        shiftBadge4.textContent = `Automated • ${c4Hrs}h`;
      }
      if (shiftDesc4) shiftDesc4.textContent = 'Live visual client portal answers homeowner questions 24/7—no more 8 PM panicked calls.';

      // Adjusting Row (Money-Making Engine Unleashed)
      if (adjustTopTag) adjustTopTag.className = 'adjusting-row-top-tag chip';
      if (adjustTagDot) {
        adjustTagDot.textContent = '✦';
        adjustTagDot.className = 'adjusting-tag-dot gold';
      }
      if (adjustTagText) adjustTagText.textContent = 'YOUR REVENUE-GENERATING ENGINE (UNLEASHED)';

      if (shiftValAdjust) {
        shiftValAdjust.textContent = `${adjustHive} hrs / wk`;
        shiftValAdjust.className = 'shift-badge adjust delegated';
      }
      if (shiftValAdjustSub) {
        shiftValAdjustSub.textContent = `${adjustHivePct}% of week • 3x boost`;
        shiftValAdjustSub.className = 'shift-badge-sub gold';
      }

      if (shiftAhaCallout) shiftAhaCallout.className = 'shift-aha-callout chip';
      if (ahaLeadBadge) ahaLeadBadge.className = 'aha-lead-badge gold';
      if (ahaBadgeIcon) ahaBadgeIcon.textContent = '✦';
      if (ahaBadgeText) ahaBadgeText.textContent = 'THE REVENUE SHIFT';

      if (ahaStatement) {
        ahaStatement.className = 'aha-statement gold';
        ahaStatement.innerHTML = `✦ +${reclaimedHours} hours shifted directly to high-margin claims adjusting.`;
      }
      if (ahaSubtext) {
        ahaSubtext.className = 'aha-subtext gold';
        ahaSubtext.textContent = `Spend ${adjustHive} hours every week on-site inspecting damage, uncovering missed scope items, and negotiating maximum carrier settlements.`;
      }
      if (ahaMetricStrip) {
        ahaMetricStrip.style.display = 'grid';
        if (ahaMetricVal1) ahaMetricVal1.textContent = `+$${extraFeeRevenue.toLocaleString()}/yr`;
        if (ahaMetricVal2) ahaMetricVal2.textContent = '3x';
        if (ahaMetricVal3) ahaMetricVal3.textContent = '$0';
      }

      // Hide Today Trigger Button, Show Climax CTA Box
      if (btnShiftAction) btnShiftAction.style.display = 'none';
      if (shiftClimaxCtaBox) shiftClimaxCtaBox.style.display = 'block';

      // Summary Pill
      if (shiftSummaryPill) shiftSummaryPill.className = 'dark-summary-callout-pill';
      if (shiftSummaryStat) {
        shiftSummaryStat.innerHTML = `✦ <span id="shift-reclaimed-hours">${reclaimedHours}</span> Hours Shifted to Revenue • +$${extraFeeRevenue.toLocaleString()}/yr Unlocked`;
      }
      if (shiftSummarySub) shiftSummarySub.textContent = '0 Added Staff Payroll • Illustrative 50h schedule';

    } else {
      // 'today' mode
      shiftCard.setAttribute('data-mode', 'today');

      if (shiftViewLabel) shiftViewLabel.textContent = "TODAY'S 50-HR WEEK";
      if (shiftCaseloadNum) {
        shiftCaseloadNum.textContent = cases;
        shiftCaseloadNum.style.color = '#FFFFFF';
      }
      if (shiftCaseloadUnit) shiftCaseloadUnit.textContent = 'active files / PA';
      if (shiftCardSub) {
        shiftCardSub.textContent = '50 hours committed every week';
      }
      if (shiftStatusPill) {
        shiftStatusPill.className = 'card-tag-pill shift-pill-warning';
        shiftStatusPill.textContent = '🔴 72% Unpaid Overhead';
      }

      // Telemetry Ratio Meter (Musk First-Principles)
      if (shiftBarAdmin) shiftBarAdmin.style.width = `${adminPct}%`;
      if (shiftBarAdjust) shiftBarAdjust.style.width = `${adjustPct}%`;
      if (meterValAdmin) meterValAdmin.textContent = `${adminHours}h`;
      if (meterLblAdmin) meterLblAdmin.textContent = `Unpaid Admin ($0)`;
      if (meterValAdjust) meterValAdjust.textContent = `${adjustHours}h`;
      if (meterLblAdjust) meterLblAdjust.textContent = `Revenue ($$$)`;

      if (telemetryStatusLine) telemetryStatusLine.className = 'telemetry-status-line today';
      if (telemetryDot) telemetryDot.textContent = '⚠️';
      if (telemetryMsg) {
        telemetryMsg.innerHTML = `<strong>72% of your week earns $0 in fees.</strong> Your entire income depends on that ${adjustHours}-hour sliver.`;
      }

      // 4 Chore Rows: today's reality
      [shiftRow1, shiftRow2, shiftRow3, shiftRow4].forEach(row => {
        if (row) row.classList.remove('is-delegated');
      });

      const c1HrsToday = Math.round(adminHours * 0.28);
      const c2HrsToday = Math.round(adminHours * 0.22);
      const c3HrsToday = Math.round(adminHours * 0.20);
      const c4HrsToday = Math.round(adminHours * 0.20);

      if (shiftTitle1) shiftTitle1.textContent = 'Carrier hold & stall letters';
      if (shiftBadge1) {
        shiftBadge1.className = 'shift-badge warning';
        shiftBadge1.textContent = `${c1HrsToday} hrs / wk`;
      }
      if (shiftDesc1) shiftDesc1.textContent = 'Chasing desk adjusters, sitting on hold, and drafting routine status letters.';

      if (shiftTitle2) shiftTitle2.textContent = 'Manual intake & PDF retyping';
      if (shiftBadge2) {
        shiftBadge2.className = 'shift-badge warning';
        shiftBadge2.textContent = `${c2HrsToday} hrs / wk`;
      }
      if (shiftDesc2) shiftDesc2.textContent = 'Retyping policy DEC sheets, contractor estimates, and mortgage checks by hand.';

      if (shiftTitle3) shiftTitle3.textContent = 'Photo sorting in truck';
      if (shiftBadge3) {
        shiftBadge3.className = 'shift-badge warning';
        shiftBadge3.textContent = `${c3HrsToday} hrs / wk`;
      }
      if (shiftDesc3) shiftDesc3.textContent = 'Sorting 150+ ladder inspection photos into desktop folders late in the evening.';

      if (shiftTitle4) shiftTitle4.textContent = '"Any update?" calls & texts';
      if (shiftBadge4) {
        shiftBadge4.className = 'shift-badge warning';
        shiftBadge4.textContent = `${c4HrsToday} hrs / wk`;
      }
      if (shiftDesc4) shiftDesc4.textContent = 'Answering frantic "Any update?" calls and texts from homeowners and contractors.';

      // Adjusting Row (Today's Reality - Capped)
      if (adjustTopTag) adjustTopTag.className = 'adjusting-row-top-tag today';
      if (adjustTagDot) {
        adjustTagDot.textContent = '●';
        adjustTagDot.className = 'adjusting-tag-dot red';
      }
      if (adjustTagText) adjustTagText.textContent = 'YOUR ONLY REVENUE-GENERATING HOURS (SEVERELY CAPPED)';

      if (shiftValAdjust) {
        shiftValAdjust.textContent = `${adjustHours} hrs / wk`;
        shiftValAdjust.className = 'shift-badge adjust';
      }
      if (shiftValAdjustSub) {
        shiftValAdjustSub.textContent = `${adjustPct}% of week`;
        shiftValAdjustSub.className = 'shift-badge-sub';
      }

      if (shiftAhaCallout) shiftAhaCallout.className = 'shift-aha-callout today';
      if (ahaLeadBadge) ahaLeadBadge.className = 'aha-lead-badge today';
      if (ahaBadgeIcon) ahaBadgeIcon.textContent = '⚠️';
      if (ahaBadgeText) ahaBadgeText.textContent = 'CAPACITY BOTTLENECK';

      if (ahaStatement) {
        ahaStatement.className = 'aha-statement';
        ahaStatement.innerHTML = `You only have <strong>${adjustHours} hours / week</strong> to actually generate revenue.`;
      }
      if (ahaSubtext) {
        ahaSubtext.className = 'aha-subtext';
        ahaSubtext.textContent = `${adminPct}% of your week is consumed by unpaid administrative drag instead of inspecting damage and closing claim settlements.`;
      }
      if (ahaMetricStrip) {
        ahaMetricStrip.style.display = 'none';
      }

      // Show Today Trigger Button, Hide Climax CTA Box
      if (btnShiftAction) {
        btnShiftAction.style.display = 'flex';
        btnShiftAction.className = 'btn-shift-action';
      }
      if (btnShiftSparkle) btnShiftSparkle.textContent = '✦';
      if (btnShiftLabel) btnShiftLabel.textContent = 'Hand Routine Busywork to Chip (See The Shift)';
      if (shiftClimaxCtaBox) shiftClimaxCtaBox.style.display = 'none';

      // Summary Pill
      if (shiftSummaryPill) shiftSummaryPill.className = 'dark-summary-callout-pill current';
      if (shiftSummaryStat) {
        shiftSummaryStat.innerHTML = `⚠️ <span id="shift-reclaimed-hours">${adminHours}</span> Hours Drained by Routine Clerical`;
      }
      if (shiftSummarySub) shiftSummarySub.textContent = 'Capacity Bottlenecked • Illustrative 50h schedule';
    }
  }

  if (btnShiftAction) {
    btnShiftAction.addEventListener('click', () => {
      shiftMode = 'chip';
      renderShiftConsole();
    });
  }

  if (btnToggleBack) {
    btnToggleBack.addEventListener('click', () => {
      shiftMode = 'today';
      renderShiftConsole();
    });
  }

  if (btnClimaxBeta) {
    btnClimaxBeta.addEventListener('click', (e) => {
      e.preventDefault();
      openAlphaModal();
    });
  }

  if (caseloadSlider) {
    caseloadSlider.addEventListener('input', (e) => {
      currentCases = e.target.value;
      renderShiftConsole();
    });
  }

  caseloadPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      currentCases = btn.getAttribute('data-cases');
      renderShiftConsole();
    });
  });

  if (shiftCard) {
    renderShiftConsole();
  }
});


