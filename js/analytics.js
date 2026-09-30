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

  // Ensure dataLayer exists for GA4
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

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
