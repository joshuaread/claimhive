/**
 * ClaimHive claim-deadline date engine.
 * Plain civil-date math. No DOM. Works in the browser and in Node tests.
 *
 * Day-count rules:
 * - The start date never counts.
 * - Calendar days add whole civil days.
 * - Business / working days skip Saturdays, Sundays, and U.S. federal
 *   holidays on their observed dates (Saturday holidays observed Friday,
 *   Sunday holidays observed Monday), per 5 U.S.C. 6103.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClaimDeadlineEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MS_PER_DAY = 86400000;
  var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function parseISODate(iso) {
    if (typeof iso !== 'string') return null;
    var m = ISO_RE.exec(iso.trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var utc = new Date(Date.UTC(y, mo - 1, d));
    if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) {
      return null;
    }
    return { y: y, m: mo, d: d };
  }

  function formatISODate(civil) {
    if (!civil) return null;
    return civil.y + '-' + pad2(civil.m) + '-' + pad2(civil.d);
  }

  function formatDisplayDate(civil) {
    if (!civil) return null;
    return WEEKDAYS[weekday(civil)] + ', ' + MONTH_NAMES[civil.m - 1] + ' ' + civil.d + ', ' + civil.y;
  }

  function toUtcMs(civil) {
    return Date.UTC(civil.y, civil.m - 1, civil.d);
  }

  function fromUtcMs(ms) {
    var dt = new Date(ms);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  function weekday(civil) {
    return new Date(Date.UTC(civil.y, civil.m - 1, civil.d)).getUTCDay();
  }

  function nthWeekdayOfMonth(year, month, weekdayIndex, n) {
    var first = new Date(Date.UTC(year, month - 1, 1));
    var firstWd = first.getUTCDay();
    var day = 1 + ((weekdayIndex - firstWd + 7) % 7) + (n - 1) * 7;
    return { y: year, m: month, d: day };
  }

  function lastWeekdayOfMonth(year, month, weekdayIndex) {
    var last = new Date(Date.UTC(year, month, 0));
    var lastDate = last.getUTCDate();
    var lastWd = last.getUTCDay();
    var delta = (lastWd - weekdayIndex + 7) % 7;
    return { y: year, m: month, d: lastDate - delta };
  }

  function nthThursday(year, month, n) {
    return nthWeekdayOfMonth(year, month, 4, n);
  }

  function observedHoliday(year, month, day) {
    var civil = { y: year, m: month, d: day };
    var wd = weekday(civil);
    if (wd === 6) return addCalendarDays(civil, -1);
    if (wd === 0) return addCalendarDays(civil, 1);
    return civil;
  }

  function namedFederalHolidays(year) {
    return [
      observedHoliday(year, 1, 1),
      nthWeekdayOfMonth(year, 1, 1, 3),
      nthWeekdayOfMonth(year, 2, 1, 3),
      lastWeekdayOfMonth(year, 5, 1),
      observedHoliday(year, 6, 19),
      observedHoliday(year, 7, 4),
      nthWeekdayOfMonth(year, 9, 1, 1),
      nthWeekdayOfMonth(year, 10, 1, 2),
      observedHoliday(year, 11, 11),
      nthThursday(year, 11, 4),
      observedHoliday(year, 12, 25)
    ];
  }

  function federalHolidaysForYear(year) {
    // Observed dates can fall in the prior year (Saturday Jan 1 → Friday Dec 31).
    var list = namedFederalHolidays(year).concat(namedFederalHolidays(year + 1));
    var seen = Object.create(null);
    var unique = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].y !== year) continue;
      var key = formatISODate(list[i]);
      if (!seen[key]) {
        seen[key] = true;
        unique.push(list[i]);
      }
    }
    unique.sort(compareDates);
    return unique;
  }

  var holidayCache = Object.create(null);

  function holidaySetForYear(year) {
    if (!holidayCache[year]) {
      var set = Object.create(null);
      var days = federalHolidaysForYear(year);
      for (var i = 0; i < days.length; i++) {
        set[formatISODate(days[i])] = true;
      }
      holidayCache[year] = set;
    }
    return holidayCache[year];
  }

  function isWeekend(civil) {
    var wd = weekday(civil);
    return wd === 0 || wd === 6;
  }

  function isFederalHoliday(civil) {
    return !!holidaySetForYear(civil.y)[formatISODate(civil)];
  }

  function isBusinessDay(civil) {
    return !isWeekend(civil) && !isFederalHoliday(civil);
  }

  function addCalendarDays(civil, n) {
    return fromUtcMs(toUtcMs(civil) + n * MS_PER_DAY);
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function addCalendarMonths(civil, n) {
    var monthIndex = civil.m - 1 + n;
    var year = civil.y + Math.floor(monthIndex / 12);
    var month = monthIndex - Math.floor(monthIndex / 12) * 12;
    if (month < 0) {
      month += 12;
      year -= 1;
    }
    var dim = daysInMonth(year, month + 1);
    var day = civil.d > dim ? dim : civil.d;
    return { y: year, m: month + 1, d: day };
  }

  function addCalendarYears(civil, n) {
    return addCalendarMonths(civil, n * 12);
  }

  function addBusinessDays(civil, n) {
    if (n < 0) {
      throw new Error('addBusinessDays only adds a non-negative count');
    }
    var current = civil;
    var added = 0;
    while (added < n) {
      current = addCalendarDays(current, 1);
      if (isBusinessDay(current)) added += 1;
    }
    return current;
  }

  function calendarDaysBetween(from, to) {
    return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
  }

  function compareDates(a, b) {
    return toUtcMs(a) - toUtcMs(b);
  }

  function laterDate(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return compareDates(a, b) >= 0 ? a : b;
  }

  function todayCivil(now) {
    var dt = now instanceof Date ? now : new Date();
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }

  function periodLabel(rule) {
    if (rule.amount == null || !rule.unit) return null;
    var unit = rule.unit;
    if (rule.amount === 1 && unit.charAt(unit.length - 1) === 's') {
      unit = unit.slice(0, -1);
    }
    var kind = rule.day_type === 'business' ? 'business ' : (rule.day_type === 'calendar' ? 'calendar ' : '');
    if (rule.unit === 'days') {
      return rule.amount + ' ' + kind + unit;
    }
    return rule.amount + ' ' + unit;
  }

  function triggerLabel(rule) {
    switch (rule.trigger) {
      case 'date_of_loss':
        return 'date of loss';
      case 'notice_of_claim':
        return 'date of loss (used as notice of claim)';
      case 'proof_of_loss':
        return 'proof-of-loss date';
      case 'later_event':
        return rule.later_event_label || 'a later claim event';
      case 'informational':
        return 'not a fixed day count';
      default:
        return rule.trigger;
    }
  }

  function startDateFor(rule, input) {
    if (rule.trigger === 'date_of_loss' || rule.trigger === 'notice_of_claim') {
      return input.dateOfLoss;
    }
    if (rule.trigger === 'proof_of_loss') {
      return input.proofOfLossDate || null;
    }
    return null;
  }

  function computeDueDate(rule, start) {
    if (!start || rule.amount == null || !rule.unit) return null;
    if (rule.day_type === 'business') {
      if (rule.unit !== 'days') return null;
      return addBusinessDays(start, rule.amount);
    }
    if (rule.unit === 'years') return addCalendarYears(start, rule.amount);
    if (rule.unit === 'months') return addCalendarMonths(start, rule.amount);
    if (rule.unit === 'days') return addCalendarDays(start, rule.amount);
    return null;
  }

  function evaluateRule(rule, input) {
    var start = startDateFor(rule, input);
    var due = computeDueDate(rule, start);
    var status = 'dated';
    var missingTrigger = null;

    if (rule.trigger === 'later_event') {
      status = 'needs_trigger';
      missingTrigger = rule.later_event_label || 'a later claim event';
      due = null;
    } else if (rule.trigger === 'informational') {
      status = 'informational';
      due = null;
    } else if (rule.trigger === 'proof_of_loss' && !input.proofOfLossDate) {
      status = 'needs_trigger';
      missingTrigger = 'proof-of-loss date';
      due = null;
    } else if (rule.is_floor_only) {
      status = 'floor';
    } else if (!due) {
      status = 'needs_trigger';
    }

    var daysRemaining = due ? calendarDaysBetween(input.asOf, due) : null;
    var notes = Array.isArray(rule.notes) ? rule.notes.slice() : [];

    if (rule.tolling_starts_on === 'proof_of_loss' && input.proofOfLossDate) {
      notes.push('Tolling starts on the proof-of-loss date: ' + formatDisplayDate(input.proofOfLossDate) + '.');
    } else if (rule.tolling_starts_on === 'proof_of_loss' && !input.proofOfLossDate) {
      notes.push('Enter a proof-of-loss date to see when tolling would start.');
    }

    return {
      id: rule.id,
      name: rule.name,
      ruleText: rule.rule_text,
      citation: {
        label: rule.citation.label,
        url: rule.citation.url
      },
      verified: rule.verified === true,
      verifiedBy: rule.verified_by || null,
      verifiedOn: rule.verified_on || null,
      sourceChecked: rule.source_checked || null,
      nextReview: rule.next_review,
      dayType: rule.day_type,
      periodLabel: periodLabel(rule),
      trigger: rule.trigger,
      triggerLabel: triggerLabel(rule),
      startDate: start ? formatISODate(start) : null,
      dueDate: due ? formatISODate(due) : null,
      dueDateDisplay: due ? formatDisplayDate(due) : null,
      daysRemaining: daysRemaining,
      status: status,
      missingTrigger: missingTrigger,
      isFilingDate: !!(due && rule.computes_filing_date && !rule.is_floor_only),
      isFloorOnly: !!rule.is_floor_only,
      isSuitLimitation: !!rule.is_suit_limitation,
      notes: notes
    };
  }

  function comingSoonState(dataset, code) {
    var list = dataset.coming_soon || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].code === code) return list[i];
    }
    return null;
  }

  function findState(dataset, code) {
    var states = dataset.states || [];
    for (var i = 0; i < states.length; i++) {
      if (states[i].code === code) return states[i];
    }
    return null;
  }

  function buildPolicyComparison(results, policyDeadline, asOf) {
    if (!policyDeadline) return null;

    var statuteRule = null;
    for (var i = 0; i < results.length; i++) {
      if (results[i].isSuitLimitation && results[i].dueDate) {
        statuteRule = results[i];
        break;
      }
    }

    var statuteCivil = statuteRule ? parseISODate(statuteRule.dueDate) : null;
    var later = laterDate(statuteCivil, policyDeadline);
    var source;
    if (!statuteCivil) source = 'policy';
    else if (compareDates(statuteCivil, policyDeadline) === 0) source = 'same';
    else if (later === policyDeadline) source = 'policy';
    else source = 'statute';

    return {
      statute: statuteCivil ? {
        date: formatISODate(statuteCivil),
        dateDisplay: formatDisplayDate(statuteCivil),
        label: statuteRule.name,
        isFloor: statuteRule.isFloorOnly,
        ruleId: statuteRule.id
      } : null,
      policy: {
        date: formatISODate(policyDeadline),
        dateDisplay: formatDisplayDate(policyDeadline)
      },
      later: {
        date: formatISODate(later),
        dateDisplay: formatDisplayDate(later),
        source: source,
        daysRemaining: calendarDaysBetween(asOf, later)
      },
      favorsPolicyholder: {
        date: formatISODate(later),
        dateDisplay: formatDisplayDate(later),
        source: source
      }
    };
  }

  function calculateDeadlines(dataset, rawInput) {
    var code = rawInput && rawInput.state ? String(rawInput.state).toUpperCase() : '';
    var coming = comingSoonState(dataset, code);
    if (coming) {
      return {
        ok: false,
        comingSoon: true,
        state: { code: coming.code, name: coming.name },
        results: [],
        policyComparison: null
      };
    }

    var state = findState(dataset, code);
    if (!state) {
      return {
        ok: false,
        comingSoon: false,
        error: 'unknown_state',
        state: { code: code, name: code },
        results: [],
        policyComparison: null
      };
    }

    var dateOfLoss = parseISODate(rawInput.dateOfLoss);
    if (!dateOfLoss) {
      return {
        ok: false,
        error: 'invalid_date_of_loss',
        state: { code: state.code, name: state.name },
        results: [],
        policyComparison: null
      };
    }

    var proofOfLossDate = rawInput.proofOfLossDate ? parseISODate(rawInput.proofOfLossDate) : null;
    if (rawInput.proofOfLossDate && !proofOfLossDate) {
      return {
        ok: false,
        error: 'invalid_proof_of_loss_date',
        state: { code: state.code, name: state.name },
        results: [],
        policyComparison: null
      };
    }

    var policyDeadline = rawInput.policyDeadline ? parseISODate(rawInput.policyDeadline) : null;
    if (rawInput.policyDeadline && !policyDeadline) {
      return {
        ok: false,
        error: 'invalid_policy_deadline',
        state: { code: state.code, name: state.name },
        results: [],
        policyComparison: null
      };
    }

    var asOf = rawInput.asOf ? parseISODate(rawInput.asOf) : todayCivil();
    if (!asOf) {
      return {
        ok: false,
        error: 'invalid_as_of',
        state: { code: state.code, name: state.name },
        results: [],
        policyComparison: null
      };
    }

    var input = {
      dateOfLoss: dateOfLoss,
      proofOfLossDate: proofOfLossDate,
      policyDeadline: policyDeadline,
      asOf: asOf
    };

    var results = [];
    var rules = state.rules || [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!rule.source_checked) continue;
      results.push(evaluateRule(rule, input));
    }

    return {
      ok: true,
      comingSoon: false,
      state: { code: state.code, name: state.name },
      asOf: formatISODate(asOf),
      results: results,
      policyComparison: buildPolicyComparison(results, policyDeadline, asOf)
    };
  }

  return {
    parseISODate: parseISODate,
    formatISODate: formatISODate,
    formatDisplayDate: formatDisplayDate,
    addCalendarDays: addCalendarDays,
    addCalendarMonths: addCalendarMonths,
    addCalendarYears: addCalendarYears,
    addBusinessDays: addBusinessDays,
    isWeekend: isWeekend,
    isFederalHoliday: isFederalHoliday,
    isBusinessDay: isBusinessDay,
    federalHolidaysForYear: federalHolidaysForYear,
    calendarDaysBetween: calendarDaysBetween,
    compareDates: compareDates,
    laterDate: laterDate,
    calculateDeadlines: calculateDeadlines
  };
});
