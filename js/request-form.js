/**
 * Claim Hive — Access Request & Seats_200 Pipeline Handler ("request-form.js")
 * Single-dispatch integration to Google Sheets (Seats_200 tab).
 */

const LIVE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbydY_KWnckEh27uF5g5_v_rjwBL6b6DhMXjHlNjY__RzmQ-06UKErkkZBpcl2k69fvRkQ/exec';

// Submission lock & deduplication cache
let isSubmitting = false;
let lastSubmittedSignature = '';
let lastSubmittedTime = 0;

/**
 * Dispatch lead data to Google Sheets via EXACTLY ONE request.
 * Primary: fetch with mode: 'no-cors' (text/plain JSON)
 * Fallback: Hidden iframe POST only if fetch is unavailable
 */
function dispatchToGoogleSheets(payload) {
  const signature = `${payload.Email || ''}_${payload.Shop || ''}`.toLowerCase();
  const now = Date.now();

  // Deduplication guard: ignore duplicate submissions within 30 seconds
  if (signature && signature === lastSubmittedSignature && (now - lastSubmittedTime < 30000)) {
    console.warn('[Claim Hive] Duplicate submission suppressed locally:', signature);
    return;
  }

  lastSubmittedSignature = signature;
  lastSubmittedTime = now;

  console.log('[Claim Hive] Dispatching single lead to Google Sheets:', payload.Shop);

  if (typeof fetch === 'function') {
    // Send single fetch request
    fetch(LIVE_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.warn('[Claim Hive] Fetch failed, attempting fallback iframe:', err);
      sendViaIframe(payload);
    });
  } else {
    sendViaIframe(payload);
  }
}

function sendViaIframe(payload) {
  try {
    let iframe = document.getElementById('claim_hive_gform_sink');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.name = 'claim_hive_gform_sink';
      iframe.id = 'claim_hive_gform_sink';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    hiddenForm.action = LIVE_WEBHOOK_URL;
    hiddenForm.target = 'claim_hive_gform_sink';
    hiddenForm.style.display = 'none';

    for (const [key, val] of Object.entries(payload)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = val;
      hiddenForm.appendChild(input);
    }

    document.body.appendChild(hiddenForm);
    hiddenForm.submit();
    setTimeout(() => { hiddenForm.remove(); }, 4000);
  } catch (e) {
    console.error('[Claim Hive] Iframe fallback error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('claim-hive-request-form');
  const formContainer = document.getElementById('request-form-container');
  const successContainer = document.getElementById('request-success-container');
  const cohortCards = document.querySelectorAll('.cohort-card-label');

  // Cohort Card Radio Toggle
  function selectCohort(card) {
    if (!card) return;
    cohortCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }

  cohortCards.forEach(card => {
    card.addEventListener('click', () => {
      selectCohort(card);
    });
  });

  // URL Parameter pre-selection (?cohort=january or ?cohort=alpha)
  const urlParams = new URLSearchParams(window.location.search);
  const cohortParam = urlParams.get('cohort');
  if (cohortParam === 'january') {
    const janCard = Array.from(cohortCards).find(c => c.textContent.includes('January'));
    if (janCard) selectCohort(janCard);
  } else if (cohortParam === 'alpha') {
    const alphaCard = Array.from(cohortCards).find(c => c.textContent.includes('Alpha'));
    if (alphaCard) selectCohort(alphaCard);
  }

  // If redirected from "Log in" button (?view=login)
  if (urlParams.get('view') === 'login') {
    const loginNotice = document.getElementById('login-portal-notice');
    if (loginNotice) {
      loginNotice.style.display = 'block';
    }
  }

  if (!form) return;

  // Form Submission Handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (isSubmitting) {
      console.warn('[Claim Hive] Form is already submitting. Duplicate click prevented.');
      return;
    }

    // Check Honeypot spam trap
    const honeypot = document.getElementById('hp_website_url');
    if (honeypot && honeypot.value.trim() !== '') {
      showSuccessScreen({ FullName: 'Adjuster' });
      return;
    }

    // Extract form values
    const fullName = (document.getElementById('fullName')?.value || '').trim() || 'Claim Hive Member';
    const firmName = (document.getElementById('firmName')?.value || '').trim() || 'Independent';
    const workEmail = (document.getElementById('workEmail')?.value || '').trim();
    const phone = (document.getElementById('phone')?.value || '').trim();
    const licenseStates = (document.getElementById('licenseStates')?.value || '').trim() || 'All Licensed States';
    const seatsNeeded = parseInt(document.getElementById('seatsNeeded')?.value, 10) || 1;
    const currentStack = document.getElementById('currentStack')?.value || 'Not Specified';
    const openFiles = document.getElementById('openFiles')?.value || 'Not Specified';
    const cohortRadio = document.querySelector('input[name="cohort"]:checked');
    const cohort = cohortRadio ? cohortRadio.value : 'Immediate Alpha (Q4 2026)';
    let referral = (document.getElementById('referral')?.value || '').trim();
    if (!referral) { try { referral = localStorage.getItem('claimhive_ref') || ''; } catch(e) {} }

    // Lock submission button immediately
    isSubmitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Securing your spot...</span>';
    }

    // Route Owner and Source according to Tom connection
    const mentionedTom = /tom/i.test(referral) || /tom/i.test(firmName);
    const owner = mentionedTom ? 'Tom' : 'Unassigned';
    const source = mentionedTom ? 'Tom book' : (cohort.includes('Alpha') ? 'Website - Alpha' : 'Website - Waitlist');

    // Build tomorrow's date string formatted as M/D/YYYY
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextActionDate = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${tomorrow.getFullYear()}`;

    // Build formatted notes string
    const notesArray = [
      `Cohort: ${cohort}`,
      `States: ${licenseStates}`,
      `Current Stack: ${currentStack}`,
      `Active Files: ${openFiles}`
    ];
    if (referral) notesArray.push(`Referred by: ${referral}`);
    const notes = notesArray.join(' | ');

    // Payload strictly aligned to Seats_200 schema
    const payload = {
      Shop: `${firmName} (${fullName})`,
      POC: fullName,
      FullName: fullName,
      Firm: firmName,
      Email: workEmail.toLowerCase(),
      Phone: phone,
      Owner: owner,
      Stage: 'Named',
      Seats_hoped: seatsNeeded,
      Source: source,
      Next_action: 'Tom text',
      Next_action_date: nextActionDate,
      Notes: notes,
      LicenseStates: licenseStates,
      CurrentStack: currentStack,
      OpenFilesNow: openFiles,
      Cohort: cohort,
      Referral: referral,
      SubmittedAt: new Date().toISOString()
    };

    // Save to local backup for offline resilience
    try {
      const localSubmissions = JSON.parse(localStorage.getItem('claim_hive_seats_200') || '[]');
      localSubmissions.push(payload);
      localStorage.setItem('claim_hive_seats_200', JSON.stringify(localSubmissions));
    } catch (e) {}

    // Trigger Analytics Event (GA4 & Clarity: request_alpha vs join_january)
    if (typeof window.trackClaimHiveEvent === 'function') {
      const eventName = cohort.includes('Alpha') ? 'request_alpha' : 'join_january';
      window.trackClaimHiveEvent(eventName, {
        firm_name: firmName,
        seats_hoped: seatsNeeded,
        cohort: cohort,
        owner: owner,
        referral_code: referral
      });
    }

    // Dispatch EXACTLY ONCE to Google Sheets Webhook
    dispatchToGoogleSheets(payload);

    // Show Success Screen immediately
    showSuccessScreen(payload);
  });

  function showSuccessScreen(data) {
    if (formContainer && successContainer) {
      formContainer.style.display = 'none';
      successContainer.style.display = 'block';

      const nameSlot = document.getElementById('success-user-name');
      if (nameSlot) nameSlot.textContent = data.FullName || 'Adjuster';

      const routingNote = document.getElementById('success-routing-note');
      if (routingNote) {
        if (data.Owner === 'Tom') {
          routingNote.textContent = 'Tom was notified of your submission and will text you directly by tomorrow morning.';
        } else {
          routingNote.textContent = 'Our onboarding team will review your firm profile and follow up within 24 hours.';
        }
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
});
