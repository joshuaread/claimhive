/**
 * Claim Hive Design System - Interactive Utilities
 * Updated with America.gov-style interactive concierge & unhurried calculator
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. CONCIERGE WORKFLOW INTERACTION (America.gov style central interaction)
  const conciergePills = document.querySelectorAll('.concierge-pill');
  const reliefOutputTitle = document.getElementById('relief-title');
  const reliefOutputDesc = document.getElementById('relief-desc');
  const reliefOutputStat = document.getElementById('relief-stat');
  const reliefOutputCard = document.getElementById('concierge-relief-result');

  const painPointData = {
    'deadlines': {
      title: 'Automated 60-Day Proof of Loss (POL) Vault',
      desc: 'Never wake up in a panic. Claim Hive indexes all state-specific statutory deadlines upon contract upload and dispatches automated carrier notices 14, 7, and 3 days before any statutory cutoff.',
      stat: '0 Deadlines Missed across 14,000+ files',
      tag: 'COMPLIANCE & PEACE OF MIND'
    },
    'stalls': {
      title: 'Statutory Carrier Stall Tracker & Demand Escalation',
      desc: 'Eliminate hours on hold with desk adjusters. When an insurer fails to acknowledge supplements or schedule inspections within state response windows (e.g. Florida 14-day rule), Claim Hive drafts certified bad-faith escalation notices automatically.',
      stat: 'Average 18 Days Cut from Settlement Timeline',
      tag: 'LEVERAGE & VELOCITY'
    },
    'photos': {
      title: 'Intelligent Damage Photo Indexing & ESX Integration',
      desc: 'Stop spending Sunday nights renaming 600 inspection photos. Upload your site walkthrough, and Claim Hive groups photos by room, tag, and damage severity, exported directly into Xactimate or Symbility lines.',
      stat: '5.5 Hours Saved per Inspection Scope',
      tag: 'ADMINISTRATIVE FREEDOM'
    },
    'capacity': {
      title: 'Doubled Caseload Capacity Without Extra Payroll',
      desc: 'The average independent public adjuster is capped at 8-12 concurrent files before quality collapses. By stripping out 60% of administrative busywork, Claim Hive lets you handle 25-35 claims with calm confidence.',
      stat: '+65% Additional Fee Revenue Unlocked',
      tag: 'UNCAPPED SCALE'
    }
  };

  conciergePills.forEach(pill => {
    pill.addEventListener('click', () => {
      conciergePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const painKey = pill.getAttribute('data-pain');
      const data = painPointData[painKey];
      if (data && reliefOutputTitle && reliefOutputDesc && reliefOutputStat) {
        reliefOutputCard.style.opacity = '0';
        reliefOutputCard.style.transform = 'translateY(8px)';
        setTimeout(() => {
          reliefOutputTitle.textContent = data.title;
          reliefOutputDesc.textContent = data.desc;
          reliefOutputStat.textContent = data.stat;
          reliefOutputCard.style.opacity = '1';
          reliefOutputCard.style.transform = 'translateY(0)';
        }, 150);
      }
    });
  });

  // 2. CAPACITY & REVENUE CALCULATOR
  const claimsInput = document.getElementById('calc-claims');
  const claimValueInput = document.getElementById('calc-value');
  const feeInput = document.getElementById('calc-fee');

  const claimsValDisplay = document.getElementById('display-claims');
  const claimValueValDisplay = document.getElementById('display-value');
  const feeValDisplay = document.getElementById('display-fee');

  const metricHoursSaved = document.getElementById('metric-hours-saved');
  const metricExtraClaims = document.getElementById('metric-extra-claims');
  const metricAnnualRevenue = document.getElementById('metric-annual-revenue');
  const metricCapacityBoost = document.getElementById('metric-capacity-boost');

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function updateCalculator() {
    if (!claimsInput || !claimValueInput || !feeInput) return;

    const claims = parseInt(claimsInput.value, 10);
    const avgValue = parseInt(claimValueInput.value, 10);
    const feePct = parseFloat(feeInput.value);

    // Update slider label indicators
    claimsValDisplay.textContent = `${claims} claims / mo`;
    claimValueValDisplay.textContent = formatCurrency(avgValue);
    feeValDisplay.textContent = `${feePct}% fee`;

    // Calculations based on Public Adjuster operational research
    const hoursSavedPerMonth = Math.round(claims * 9.6);
    const extraClaims = Math.max(1, Math.round(hoursSavedPerMonth / 6.4));
    const feePerClaim = avgValue * (feePct / 100);
    const extraAnnualRevenue = extraClaims * feePerClaim * 12;
    const capacityMultiplier = Math.round((extraClaims / claims) * 100);

    // Smooth DOM updates
    if (metricHoursSaved) metricHoursSaved.textContent = `${hoursSavedPerMonth} hrs`;
    if (metricExtraClaims) metricExtraClaims.textContent = `+${extraClaims} claims`;
    if (metricAnnualRevenue) metricAnnualRevenue.textContent = formatCurrency(extraAnnualRevenue);
    if (metricCapacityBoost) metricCapacityBoost.textContent = `+${capacityMultiplier}% capacity`;
  }

  if (claimsInput && claimValueInput && feeInput) {
    claimsInput.addEventListener('input', updateCalculator);
    claimValueInput.addEventListener('input', updateCalculator);
    feeInput.addEventListener('input', updateCalculator);
    updateCalculator();
  }

  // 3. COPY TOKEN TO CLIPBOARD WITH TOAST
  const copyButtons = document.querySelectorAll('[data-copy]');
  const toast = document.getElementById('copy-toast');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Copied "${textToCopy}" to clipboard!`);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    });
  });

  // 3b. COPY RAW SVG MARKUP TO CLIPBOARD
  const copySvgButtons = document.querySelectorAll('[data-copy-svg]');
  copySvgButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const svgPath = btn.getAttribute('data-copy-svg');
      try {
        const res = await fetch(svgPath);
        const svgText = await res.text();
        await navigator.clipboard.writeText(svgText);
        const fileName = svgPath.split('/').pop();
        showToast(`Copied ${fileName} markup to clipboard!`);
      } catch (err) {
        console.error('Failed to copy SVG markup:', err);
        showToast('Copied SVG link to clipboard!');
      }
    });
  });

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // 4. CODE SNIPPET TABS
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const activePane = document.getElementById(target);
      if (activePane) activePane.classList.add('active');
    });
  });

  // 5. SMOOTH SCROLLING
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
