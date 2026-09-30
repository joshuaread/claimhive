/**
 * Claim Hive — Privacy-Conscious Analytics & Custom Event Dispatcher
 * Supports Google Analytics 4 (GA4) and Microsoft Clarity.
 *
 * Events Tracked:
 * - pricing_view: Fired upon viewing the Pricing page / breakdown
 * - request_alpha: Fired when an adjuster submits for the Immediate Alpha cohort
 * - join_january: Fired when an adjuster submits for the January general access cohort
 */

(function () {
  'use strict';

  // CONFIGURATION: Paste your production IDs here to activate tracking
  var GA4_MEASUREMENT_ID = ''; // e.g., 'G-XXXXXXXXXX'
  var CLARITY_PROJECT_ID = ''; // e.g., 'k8s7d6f5'

  // Ensure dataLayer exists for GA4
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  // 1. Automatically load GA4 when ID is configured
  if (GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID.indexOf('G-') === 0) {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
    document.head.appendChild(gaScript);

    window.gtag('js', new Date());
    window.gtag('config', GA4_MEASUREMENT_ID, {
      send_page_view: true
    });
  }

  // 2. Automatically load Microsoft Clarity when ID is configured
  if (CLARITY_PROJECT_ID && CLARITY_PROJECT_ID.length > 4) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
  }

  /**
   * Unified event dispatch function
   * @param {string} eventName 
   * @param {Object} params 
   */
  window.trackClaimHiveEvent = function (eventName, params) {
    params = params || {};

    // 1. Google Analytics 4
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, params);
      } catch (e) {
        console.debug('[Analytics:GA4 Error]', e);
      }
    }

    // 2. Microsoft Clarity
    if (typeof window.clarity === 'function') {
      try {
        window.clarity('event', eventName);
      } catch (e) {
        console.debug('[Analytics:Clarity Error]', e);
      }
    }

    console.log('[Claim Hive Event Tracked]', eventName, params);
  };

  // Auto-detect Pricing View
  document.addEventListener('DOMContentLoaded', function () {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('pricing') !== -1) {
      window.trackClaimHiveEvent('pricing_view', {
        page_location: window.location.href,
        page_title: document.title
      });
    }
  });
})();
