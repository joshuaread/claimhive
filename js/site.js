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

  // 9. Interactive Caseload & Time Flip Console Engine
  const caseloadSlider = document.getElementById('caseload-slider-input');
  const caseloadSliderVal = document.getElementById('caseload-slider-val');
  const caseloadPresets = document.querySelectorAll('.caseload-preset-btn');
  const flipCard = document.getElementById('caseload-flip-card');
  const flipTabCurrent = document.getElementById('flip-tab-current');
  const flipTabHive = document.getElementById('flip-tab-hive');

  // Dynamic Card Elements
  const flipCardViewLabel = document.getElementById('flip-card-view-label');
  const flipCaseloadNum = document.getElementById('flip-caseload-num');
  const flipCaseloadUnit = document.getElementById('flip-caseload-unit');
  const flipCardSub = document.getElementById('flip-card-sub');
  const flipStatusPill = document.getElementById('flip-status-pill');

  const flipDotAdmin = document.getElementById('flip-dot-admin');
  const flipLblAdminName = document.getElementById('flip-lbl-admin-name');
  const flipValAdmin = document.getElementById('flip-val-admin');
  const flipLblAdjustName = document.getElementById('flip-lbl-adjust-name');
  const flipValAdjust = document.getElementById('flip-val-adjust');

  const flipBarAdmin = document.getElementById('flip-bar-admin');
  const flipBarAdjust = document.getElementById('flip-bar-adjust');
  const flipLblAdmin = document.getElementById('flip-lbl-admin');
  const flipLblAdjust = document.getElementById('flip-lbl-adjust');

  const thiefBadge1 = document.getElementById('thief-badge-1');
  const thiefTitle1 = document.getElementById('thief-title-1');
  const thiefDesc1 = document.getElementById('thief-desc-1');

  const thiefBadge2 = document.getElementById('thief-badge-2');
  const thiefTitle2 = document.getElementById('thief-title-2');
  const thiefDesc2 = document.getElementById('thief-desc-2');

  const thiefBadge3 = document.getElementById('thief-badge-3');
  const thiefTitle3 = document.getElementById('thief-title-3');
  const thiefDesc3 = document.getElementById('thief-desc-3');

  const thiefBadge4 = document.getElementById('thief-badge-4');
  const thiefTitle4 = document.getElementById('thief-title-4');
  const thiefDesc4 = document.getElementById('thief-desc-4');

  const flipSummaryPill = document.getElementById('flip-summary-pill');
  const flipSummaryStat = document.getElementById('flip-summary-stat');
  const flipSummarySub = document.getElementById('flip-summary-sub');

  let currentCases = 20;
  let flipMode = 'hive'; // 'hive' or 'current'

  function renderCaseloadConsole() {
    const cases = parseInt(currentCases, 10) || 20;

    if (caseloadSlider && caseloadSlider.value != cases) caseloadSlider.value = cases;
    if (caseloadSliderVal) caseloadSliderVal.textContent = `${cases} Active Files`;

    caseloadPresets.forEach(btn => {
      const btnCases = parseInt(btn.getAttribute('data-cases'), 10);
      btn.classList.toggle('active', btnCases === cases);
    });

    // Model: standard 50-hour week for public adjusters
    const adminHours = Math.min(43, Math.max(18, Math.round(cases * 1.8)));
    const adjustHours = 50 - adminHours;
    const adminPct = Math.round((adminHours / 50) * 100);
    const adjustPct = 100 - adminPct;

    // With ClaimHive: 83% reduction in repetitive admin
    const adminHive = Math.max(4, Math.round(adminHours * 0.17));
    const adjustHive = 50 - adminHive;
    const adminHivePct = Math.round((adminHive / 50) * 100);
    const adjustHivePct = 100 - adminHivePct;

    const reclaimedHours = adminHours - adminHive;
    const projectedCases = Math.round(cases * 1.9);
    const growthPct = Math.round(((projectedCases - cases) / cases) * 100);

    if (!flipCard) return;

    if (flipMode === 'hive') {
      flipCard.setAttribute('data-view', 'hive');
      if (flipTabHive) {
        flipTabHive.classList.add('active');
        flipTabHive.setAttribute('aria-selected', 'true');
      }
      if (flipTabCurrent) {
        flipTabCurrent.classList.remove('active');
        flipTabCurrent.setAttribute('aria-selected', 'false');
      }

      if (flipCardViewLabel) flipCardViewLabel.textContent = 'WITH CLAIMHIVE (SAME 50-HR WEEK)';
      if (flipCaseloadNum) flipCaseloadNum.textContent = projectedCases;
      if (flipCaseloadUnit) flipCaseloadUnit.textContent = 'active files / PA';
      if (flipCardSub) {
        flipCardSub.innerHTML = `<span style="color: var(--hive-gold-honey); font-weight: 600;">+${growthPct}% caseload capacity</span> &bull; 0 new staff`;
      }
      if (flipStatusPill) {
        flipStatusPill.className = 'card-tag-pill flip-badge-highlight';
        flipStatusPill.textContent = '✦ Uncapped Growth • 0 Added Payroll';
      }

      if (flipDotAdmin) flipDotAdmin.className = 'hour-ledger-dot admin';
      if (flipLblAdminName) flipLblAdminName.textContent = 'Reviewing AI Drafts:';
      if (flipValAdmin) flipValAdmin.textContent = `${adminHive} hrs / wk`;

      if (flipLblAdjustName) flipLblAdjustName.textContent = 'Fee-Earning Adjusting:';
      if (flipValAdjust) {
        flipValAdjust.className = 'hour-ledger-val gold';
        flipValAdjust.textContent = `${adjustHive} hrs / wk`;
      }

      if (flipBarAdmin) flipBarAdmin.style.width = `${adminHivePct}%`;
      if (flipBarAdjust) flipBarAdjust.style.width = `${adjustHivePct}%`;

      if (flipLblAdmin) flipLblAdmin.textContent = `${adminHive}h AI Approvals (${adminHivePct}%)`;
      if (flipLblAdjust) {
        flipLblAdjust.textContent = `${adjustHive}h Adjusting (${adjustHivePct}%)`;
        flipLblAdjust.style.color = 'var(--hive-gold-honey)';
      }

      // Feature Micro Cards: ClaimHive Solutions
      if (thiefBadge1) {
        thiefBadge1.className = 'console-thief-badge';
        thiefBadge1.textContent = '+7 HRS / WK';
      }
      if (thiefTitle1) thiefTitle1.textContent = 'Zero photo sorting';
      if (thiefDesc1) thiefDesc1.textContent = '150 ladder photos & test squares file directly into the claim from your truck.';

      if (thiefBadge2) {
        thiefBadge2.className = 'console-thief-badge';
        thiefBadge2.textContent = '+10 HRS / WK';
      }
      if (thiefTitle2) thiefTitle2.textContent = 'Carrier hold autopilot';
      if (thiefDesc2) thiefDesc2.textContent = 'Chip tracks statutory deadlines and drafts demand letters directly into your email drafts when desk adjusters stall—you review, add your voice, and send.';

      if (thiefBadge3) {
        thiefBadge3.className = 'console-thief-badge';
        thiefBadge3.textContent = '+8 HRS / WK';
      }
      if (thiefTitle3) thiefTitle3.textContent = 'Zero manual intake';
      if (thiefDesc3) thiefDesc3.textContent = 'Policy PDFs, estimates, and checks are OCR-parsed and linked without a scanner.';

      if (thiefBadge4) {
        thiefBadge4.className = 'console-thief-badge';
        thiefBadge4.textContent = '+7 HRS / WK';
      }
      if (thiefTitle4) thiefTitle4.textContent = 'No "any update?" calls';
      if (thiefDesc4) thiefDesc4.textContent = 'Clients and contractors track live claim milestones in their own secure visual portal.';

      // Bottom Summary Callout
      if (flipSummaryPill) flipSummaryPill.className = 'dark-summary-callout-pill';
      if (flipSummaryStat) {
        flipSummaryStat.innerHTML = `✦ <span id="summary-reclaimed-hours">${reclaimedHours}</span> Hours Reclaimed Every Week`;
      }
      if (flipSummarySub) flipSummarySub.textContent = '0 Added Payroll • Illustrative 50h schedule';

    } else {
      // 'current' view (Today's Reality)
      flipCard.setAttribute('data-view', 'current');
      if (flipTabCurrent) {
        flipTabCurrent.classList.add('active');
        flipTabCurrent.setAttribute('aria-selected', 'true');
      }
      if (flipTabHive) {
        flipTabHive.classList.remove('active');
        flipTabHive.setAttribute('aria-selected', 'false');
      }

      if (flipCardViewLabel) flipCardViewLabel.textContent = 'WITHOUT CLAIMHIVE (50-HR WEEK)';
      if (flipCaseloadNum) flipCaseloadNum.textContent = cases;
      if (flipCaseloadUnit) flipCaseloadUnit.textContent = 'active files / PA';
      if (flipCardSub) {
        flipCardSub.textContent = '50 hours committed every week';
      }
      if (flipStatusPill) {
        flipStatusPill.className = 'card-tag-pill flip-badge-warning';
        flipStatusPill.textContent = '🔴 Capacity Bottlenecked • Overwhelmed';
      }

      if (flipDotAdmin) flipDotAdmin.className = 'hour-ledger-dot warning';
      if (flipLblAdminName) flipLblAdminName.textContent = 'Clerical, Intake & Hold:';
      if (flipValAdmin) flipValAdmin.textContent = `${adminHours} hrs / wk`;

      if (flipLblAdjustName) flipLblAdjustName.textContent = 'Fee-Earning Adjusting:';
      if (flipValAdjust) {
        flipValAdjust.className = 'hour-ledger-val';
        flipValAdjust.textContent = `${adjustHours} hrs / wk`;
      }

      if (flipBarAdmin) flipBarAdmin.style.width = `${adminPct}%`;
      if (flipBarAdjust) flipBarAdjust.style.width = `${adjustPct}%`;

      if (flipLblAdmin) flipLblAdmin.textContent = `${adminHours}h Clerical (${adminPct}%)`;
      if (flipLblAdjust) {
        flipLblAdjust.textContent = `${adjustHours}h Adjusting (${adjustPct}%)`;
        flipLblAdjust.style.color = '#CBD5E1';
      }

      // Feature Micro Cards: Today's Reality Pain Points
      if (thiefBadge1) {
        thiefBadge1.className = 'console-thief-badge warning';
        thiefBadge1.textContent = '7 HRS / WK';
      }
      if (thiefTitle1) thiefTitle1.textContent = 'Photo sorting in truck';
      if (thiefDesc1) thiefDesc1.textContent = 'Renaming 150 ladder photos, hail marks, and test squares by hand after every inspection.';

      if (thiefBadge2) {
        thiefBadge2.className = 'console-thief-badge warning';
        thiefBadge2.textContent = '10 HRS / WK';
      }
      if (thiefTitle2) thiefTitle2.textContent = 'Carrier hold & stall letters';
      if (thiefDesc2) thiefDesc2.textContent = 'Trapped on hold with desk adjusters; tracking statutory reply deadlines on sticky notes.';

      if (thiefBadge3) {
        thiefBadge3.className = 'console-thief-badge warning';
        thiefBadge3.textContent = '8 HRS / WK';
      }
      if (thiefTitle3) thiefTitle3.textContent = 'Manual intake & retyping';
      if (thiefDesc3) thiefDesc3.textContent = 'Re-entering policy limits, endorsements, and line items from scanned PDF estimates.';

      if (thiefBadge4) {
        thiefBadge4.className = 'console-thief-badge warning';
        thiefBadge4.textContent = '7 HRS / WK';
      }
      if (thiefTitle4) thiefTitle4.textContent = 'Repetitive update calls';
      if (thiefDesc4) thiefDesc4.textContent = 'Answering the same "where\'s my check?" calls and texts from clients and contractors.';

      // Bottom Summary Callout
      if (flipSummaryPill) flipSummaryPill.className = 'dark-summary-callout-pill current';
      if (flipSummaryStat) {
        flipSummaryStat.innerHTML = `⚠️ <span id="summary-reclaimed-hours">${adminHours}</span> Hours Drained by Routine Clerical`;
      }
      if (flipSummarySub) flipSummarySub.textContent = 'Capacity Bottlenecked • Illustrative 50h schedule';
    }
  }

  // Toggle Tab Click Handlers
  if (flipTabCurrent) {
    flipTabCurrent.addEventListener('click', () => {
      flipMode = 'current';
      renderCaseloadConsole();
    });
  }

  if (flipTabHive) {
    flipTabHive.addEventListener('click', () => {
      flipMode = 'hive';
      renderCaseloadConsole();
    });
  }

  // Slider & Presets
  if (caseloadSlider) {
    caseloadSlider.addEventListener('input', (e) => {
      currentCases = e.target.value;
      renderCaseloadConsole();
    });
  }

  caseloadPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      currentCases = btn.getAttribute('data-cases');
      renderCaseloadConsole();
    });
  });

  if (flipCard) {
    renderCaseloadConsole();
  }
});


