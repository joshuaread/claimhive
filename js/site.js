
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');
  if (refParam) {
    try {
      localStorage.setItem('claimhive_ref', refParam);
    } catch(e) {}
  }
});
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
        // Zero-padded, no seconds: fixed width, changes once a minute
        const pad = (n) => String(n).padStart(2, '0');
        betaInlineEl.textContent = `${pad(bDays)}d ${pad(bHours)}h ${pad(bMinutes)}m`;
      }
    }

    updateClocks();
    setInterval(updateClocks, 1000);
  }
  initCountdowns();

  // 4b. Live "seats requested" counter (reads the Sheet's "Seats hoped for" cell)
  (function initSeatCounter() {
    const counters = document.querySelectorAll('[data-seat-counter]');
    if (!counters.length) return;
    const SEATS_URL = 'https://script.google.com/macros/s/AKfycbydY_KWnckEh27uF5g5_v_rjwBL6b6DhMXjHlNjY__RzmQ-06UKErkkZBpcl2k69fvRkQ/exec?action=seats';
    const TIMEOUT_MS = 6000;
    const hideAll = () => counters.forEach(el => { el.hidden = true; });
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => { if (controller) controller.abort(); hideAll(); }, TIMEOUT_MS);
    fetch(SEATS_URL, { method: 'GET', cache: 'no-store', credentials: 'omit', signal: controller ? controller.signal : undefined })
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(data => {
        clearTimeout(timer);
        const seats = data && Number(data.seats);
        if (!Number.isFinite(seats) || seats <= 0) throw new Error('No valid seat count');
        const n = Math.round(seats);
        const label = `${n.toLocaleString('en-US')} ${n === 1 ? 'seat' : 'seats'} requested so far.`;
        counters.forEach(el => { el.textContent = label; el.hidden = false; });
      })
      .catch(err => { clearTimeout(timer); hideAll(); console.warn('[ClaimHive] Seat counter unavailable:', err); });
  })();

  // 5. Velvet-Rope Waitlist & Position Reveal Mechanics
  const waitlistForms = document.querySelectorAll('.waitlist-form');
  waitlistForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        const firmInput = form.querySelector('input[name="firm_name"]');
        const firmName = firmInput && firmInput.value.trim() ? firmInput.value.trim() : 'Your Firm';
        const container = form.closest('.waitlist-box') || form.parentElement;

        if (!email) return;

        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Securing priority spot...';
        }

        // 1) Derive refCode and hash FIRST before building payload (P0-1 bugfix)
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
          hash = (hash << 5) - hash + email.charCodeAt(i);
          hash |= 0;
        }
        const refCode = 'CH-' + (Math.abs(hash % 9000) + 1000);
        const refUrl = `https://claimhive.app/?ref=${refCode}`;

        // 2) Build payload with all required sheet columns
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextActionDate = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${tomorrow.getFullYear()}`;

        const payload = {
          Shop: `${firmName} (${email})`,
          POC: email,
          FullName: email,
          Firm: firmName,
          Email: email,
          Phone: 'N/A',
          Owner: 'Unassigned',
          Stage: 'Named',
          Seats_hoped: 1,
          Source: 'Website - Homepage Waitlist',
          Next_action: 'Beta invitation',
          Next_action_date: nextActionDate,
          Notes: `Waitlist submission. Generated Ref Code: ${refCode}`,
          LicenseStates: 'N/A',
          CurrentStack: 'N/A',
          OpenFilesNow: 'N/A',
          Cohort: 'Beta (Nov 1, 2026)',
          Referral: localStorage.getItem('claimhive_ref') || 'N/A',
          SubmittedAt: new Date().toISOString()
        };

        // 3) Dispatch webhook to Google Apps Script
        const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbydY_KWnckEh27uF5g5_v_rjwBL6b6DhMXjHlNjY__RzmQ-06UKErkkZBpcl2k69fvRkQ/exec';
        
        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
        } catch (fetchErr) {
          console.warn('[ClaimHive] Webhook dispatched with warning:', fetchErr);
        }

        // 4) Render honest, high-trust confirmation screen (P0-2 bugfix)
        container.innerHTML = `
          <div class="waitlist-revealed animate-fade-in" style="padding: 1.5rem 1rem; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--hive-gold-100); border: 1px solid var(--hive-gold-honey); padding: 0.35rem 0.85rem; border-radius: var(--hive-radius-pill); font-size: 0.75rem; font-weight: 700; color: var(--hive-gold-deep); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.85rem;">
              <span>✦ Beta Queue Confirmed</span>
            </div>
            <div style="font-family: var(--hive-font-heading); font-size: clamp(1.75rem, 4vw, 2.25rem); font-weight: 700; color: var(--hive-navy-900); line-height: 1.2; margin-bottom: 0.5rem;">
              You\'re on the list.
            </div>
            <div style="font-size: 0.9375rem; font-weight: 600; color: var(--hive-ink); margin-bottom: 0.5rem;">
              Priority reservation secured for ${escapeHtml(firmName)}.
            </div>
            <p style="font-size: 0.8125rem; color: var(--hive-text-secondary); line-height: 1.55; max-width: 440px; margin: 0 auto 1.25rem;">
              Beta invites rollout in cohorts starting November 1. We lock in your founding $80/seat rate through June 30, 2027 and will notify <strong>${escapeHtml(email)}</strong> before credentials go live.
            </p>
            <div style="background: var(--hive-canvas); border: 1px solid var(--hive-border-subtle); border-radius: var(--hive-radius-md); padding: 1rem; max-width: 440px; margin: 0 auto 1.25rem; text-align: left;">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--hive-gold-deep); text-transform: uppercase; margin-bottom: 0.25rem;">
                Your Priority Referral Link
              </div>
              <div style="font-size: 0.8125rem; color: var(--hive-text-secondary); margin-bottom: 0.5rem;">
                Share your personal link with another firm owner. We track partner referrals in our founding cohort ledger.
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" readonly value="${refUrl}" style="flex: 1; font-family: var(--hive-font-mono); font-size: 0.75rem; padding: 0.45rem 0.65rem; border: 1px solid var(--hive-border-default); border-radius: 6px; background: #FFF; color: var(--hive-ink);" id="ref-link-field">
                <button type="button" class="btn btn-sm btn-gold" onclick="navigator.clipboard.writeText('${refUrl}'); window.showToast ? window.showToast('Priority referral link copied!') : alert('Copied!');" style="white-space: nowrap; padding: 0.45rem 0.85rem; font-size: 0.8125rem;">
                  Copy Link
                </button>
              </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--hive-text-muted);">
              Have special caseload or integration requirements? Write to <a href="mailto:hello@claimhive.app" style="color: var(--hive-gold-deep); text-decoration: underline;">hello@claimhive.app</a>.
            </div>
          </div>
        `;
      } catch (err) {
        console.error('[ClaimHive] Form error:', err);
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Request beta access';
        }
        alert('Something went wrong. Please write directly to hello@claimhive.app.');
      }
    });
  });

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

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
});
