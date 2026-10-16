'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('./deadline-engine.js');
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'claim-deadlines.json'), 'utf8')
);

function d(iso) {
  return engine.parseISODate(iso);
}

function iso(civil) {
  return engine.formatISODate(civil);
}

test('parseISODate accepts valid civil dates and rejects invalid ones', () => {
  assert.deepEqual(engine.parseISODate('2026-10-16'), { y: 2026, m: 10, d: 16 });
  assert.equal(engine.parseISODate('2026-02-29'), null);
  assert.equal(engine.parseISODate('2024-02-29') && iso(engine.parseISODate('2024-02-29')), '2024-02-29');
  assert.equal(engine.parseISODate('10/16/2026'), null);
  assert.equal(engine.parseISODate(''), null);
});

test('addCalendarDays does not count the start date', () => {
  assert.equal(iso(engine.addCalendarDays(d('2026-01-01'), 15)), '2026-01-16');
  assert.equal(iso(engine.addCalendarDays(d('2026-01-01'), 0)), '2026-01-01');
  assert.equal(iso(engine.addCalendarDays(d('2026-12-31'), 1)), '2027-01-01');
});

test('addCalendarMonths clamps to the last valid day of the month', () => {
  assert.equal(iso(engine.addCalendarMonths(d('2026-01-31'), 1)), '2026-02-28');
  assert.equal(iso(engine.addCalendarMonths(d('2024-01-31'), 1)), '2024-02-29');
  assert.equal(iso(engine.addCalendarMonths(d('2025-04-16'), 18)), '2026-10-16');
  assert.equal(iso(engine.addCalendarMonths(d('2024-10-16'), 24)), '2026-10-16');
});

test('addCalendarYears handles leap-day start dates', () => {
  assert.equal(iso(engine.addCalendarYears(d('2024-02-29'), 1)), '2025-02-28');
  assert.equal(iso(engine.addCalendarYears(d('2021-10-16'), 5)), '2026-10-16');
});

test('2026 federal holidays use observed dates', () => {
  const holidays = engine.federalHolidaysForYear(2026).map(iso);
  assert.deepEqual(holidays, [
    '2026-01-01',
    '2026-01-19',
    '2026-02-16',
    '2026-05-25',
    '2026-06-19',
    '2026-07-03',
    '2026-09-07',
    '2026-10-12',
    '2026-11-11',
    '2026-11-26',
    '2026-12-25'
  ]);
  assert.equal(engine.isFederalHoliday(d('2026-07-04')), false);
  assert.equal(engine.isFederalHoliday(d('2026-07-03')), true);
  assert.equal(engine.isWeekend(d('2026-07-04')), true);
});

test('2027 federal holidays shift Sunday Independence Day to Monday', () => {
  const holidays = engine.federalHolidaysForYear(2027).map(iso);
  assert.ok(holidays.includes('2027-01-18'));
  assert.ok(holidays.includes('2027-06-18'));
  assert.ok(holidays.includes('2027-07-05'));
  assert.ok(holidays.includes('2027-12-24'));
  assert.equal(engine.isFederalHoliday(d('2027-07-04')), false);
  assert.equal(engine.isFederalHoliday(d('2027-07-05')), true);
  assert.equal(engine.isFederalHoliday(d('2027-12-25')), false);
  assert.equal(engine.isFederalHoliday(d('2027-12-24')), true);
});

test('2028 Saturday New Year is observed Friday Dec 31, 2027', () => {
  const holidays2027 = engine.federalHolidaysForYear(2027).map(iso);
  const holidays2028 = engine.federalHolidaysForYear(2028).map(iso);
  assert.ok(holidays2027.includes('2027-12-31'));
  assert.equal(holidays2028.includes('2028-01-01'), false);
  assert.equal(engine.isBusinessDay(d('2027-12-31')), false);
  assert.equal(engine.isWeekend(d('2028-01-01')), true);
});

test('addBusinessDays skips weekends and observed holidays; start date never counts', () => {
  assert.equal(iso(engine.addBusinessDays(d('2026-01-05'), 1)), '2026-01-06');
  assert.equal(iso(engine.addBusinessDays(d('2026-01-02'), 1)), '2026-01-05');
  assert.equal(iso(engine.addBusinessDays(d('2026-01-16'), 1)), '2026-01-20');
  assert.equal(iso(engine.addBusinessDays(d('2026-07-02'), 1)), '2026-07-06');
  assert.equal(iso(engine.addBusinessDays(d('2026-01-02'), 15)), '2026-01-26');
});

test('calendarDaysBetween and laterDate pick the more lenient date', () => {
  assert.equal(engine.calendarDaysBetween(d('2026-10-16'), d('2026-10-16')), 0);
  assert.equal(engine.calendarDaysBetween(d('2026-10-16'), d('2026-10-20')), 4);
  assert.equal(engine.calendarDaysBetween(d('2026-10-20'), d('2026-10-16')), -4);
  assert.equal(iso(engine.laterDate(d('2026-10-16'), d('2027-10-16'))), '2027-10-16');
  assert.equal(iso(engine.laterDate(d('2028-01-01'), d('2027-01-01'))), '2028-01-01');
});

test('JSON contains only source-checked cited rules; owner verification is pending', () => {
  let count = 0;
  for (const state of data.states) {
    for (const rule of state.rules) {
      count += 1;
      assert.equal(rule.verified, false, rule.id + ' must not claim owner verification');
      assert.equal(rule.verified_by, null, rule.id + ' verified_by');
      assert.equal(rule.verified_on, null, rule.id + ' verified_on');
      assert.equal(rule.source_checked, '2026-10-12', rule.id + ' source_checked');
      assert.ok(rule.citation, rule.id + ' missing citation');
      assert.ok(rule.citation.label);
      assert.ok(/^https:\/\//.test(rule.citation.url), rule.id + ' citation url');
    }
  }
  assert.equal(count, 25);
  assert.equal(
    data.meta.source_note,
    'Rules are cited to official sources. Professional review is pending. Not legal advice.'
  );
  assert.deepEqual(data.coming_soon.map((s) => s.code), ['OK', 'NC', 'MO', 'CO']);
  assert.deepEqual(data.states.map((s) => s.code), ['FL', 'TX', 'LA', 'GA', 'IL', 'SC']);
});

test('coming-soon states return no dates', () => {
  for (const code of ['OK', 'NC', 'MO', 'CO']) {
    const result = engine.calculateDeadlines(data, {
      state: code,
      dateOfLoss: '2026-01-05',
      asOf: '2026-10-16'
    });
    assert.equal(result.ok, false);
    assert.equal(result.comingSoon, true);
    assert.equal(result.results.length, 0);
  }
});

test('Florida dated clocks from a known date of loss', () => {
  const result = engine.calculateDeadlines(data, {
    state: 'FL',
    dateOfLoss: '2025-04-16',
    asOf: '2026-10-16'
  });
  assert.equal(result.ok, true);
  const byId = Object.fromEntries(result.results.map((r) => [r.id, r]));
  assert.equal(byId['fl-notice-claim'].dueDate, '2026-04-16');
  assert.equal(byId['fl-notice-supplemental'].dueDate, '2026-10-16');
  assert.equal(byId['fl-acknowledge'].dueDate, '2025-04-23');
  assert.equal(byId['fl-pay-or-deny'].dueDate, '2025-06-15');
  assert.equal(byId['fl-suit'].dueDate, '2030-04-16');
  assert.equal(byId['fl-notice-supplemental'].daysRemaining, 0);
  assert.ok(byId['fl-acknowledge'].daysRemaining < 0);
  assert.equal(result.results.every((r) => r.verified), false);
  assert.equal(result.results.every((r) => r.sourceChecked === '2026-10-12'), true);
});

test('Texas accept-or-reject needs a proof-of-loss date', () => {
  const withoutPol = engine.calculateDeadlines(data, {
    state: 'TX',
    dateOfLoss: '2026-01-05',
    asOf: '2026-01-05'
  });
  const accept = withoutPol.results.find((r) => r.id === 'tx-accept-reject');
  assert.equal(accept.dueDate, null);
  assert.equal(accept.status, 'needs_trigger');
  assert.equal(accept.missingTrigger, 'proof-of-loss date');

  const withPol = engine.calculateDeadlines(data, {
    state: 'TX',
    dateOfLoss: '2026-01-05',
    proofOfLossDate: '2026-01-16',
    asOf: '2026-01-16'
  });
  const dated = withPol.results.find((r) => r.id === 'tx-accept-reject');
  assert.equal(dated.dueDate, '2026-02-09');
  assert.equal(dated.periodLabel, '15 business days');

  const ack = withPol.results.find((r) => r.id === 'tx-acknowledge');
  assert.equal(ack.dueDate, '2026-01-20');
  assert.equal(ack.periodLabel, '15 calendar days');

  const pay = withPol.results.find((r) => r.id === 'tx-pay');
  assert.equal(pay.dueDate, null);
  assert.equal(pay.missingTrigger, 'notice of acceptance');

  const floor = withPol.results.find((r) => r.id === 'tx-suit-floor');
  assert.equal(floor.dueDate, '2028-01-05');
  assert.equal(floor.status, 'floor');
  assert.equal(floor.isFilingDate, false);
});

test('Louisiana pay clock starts at proof of loss; suit floor is 24 months', () => {
  const result = engine.calculateDeadlines(data, {
    state: 'LA',
    dateOfLoss: '2026-03-01',
    proofOfLossDate: '2026-03-20',
    asOf: '2026-03-20'
  });
  const byId = Object.fromEntries(result.results.map((r) => [r.id, r]));
  assert.equal(byId['la-start-adjustment'].dueDate, '2026-03-15');
  assert.equal(byId['la-pay'].dueDate, '2026-04-19');
  assert.equal(byId['la-suit-floor'].dueDate, '2028-03-01');
  assert.equal(byId['la-suit-floor'].isFloorOnly, true);
  assert.equal(byId['la-pol-form-complete'].dueDate, iso(engine.addBusinessDays(d('2026-03-20'), 10)));
});

test('policy override selects the later date as the one that favors the policyholder', () => {
  const statuteLater = engine.calculateDeadlines(data, {
    state: 'FL',
    dateOfLoss: '2021-10-16',
    policyDeadline: '2025-10-16',
    asOf: '2024-01-01'
  });
  assert.equal(statuteLater.policyComparison.statute.date, '2026-10-16');
  assert.equal(statuteLater.policyComparison.policy.date, '2025-10-16');
  assert.equal(statuteLater.policyComparison.favorsPolicyholder.date, '2026-10-16');
  assert.equal(statuteLater.policyComparison.favorsPolicyholder.source, 'statute');

  const policyLater = engine.calculateDeadlines(data, {
    state: 'FL',
    dateOfLoss: '2021-10-16',
    policyDeadline: '2028-01-01',
    asOf: '2024-01-01'
  });
  assert.equal(policyLater.policyComparison.favorsPolicyholder.date, '2028-01-01');
  assert.equal(policyLater.policyComparison.favorsPolicyholder.source, 'policy');

  const floorVsShortPolicy = engine.calculateDeadlines(data, {
    state: 'TX',
    dateOfLoss: '2026-01-05',
    policyDeadline: '2026-07-05',
    asOf: '2026-01-05'
  });
  assert.equal(floorVsShortPolicy.policyComparison.statute.isFloor, true);
  assert.equal(floorVsShortPolicy.policyComparison.favorsPolicyholder.date, '2028-01-05');
  assert.equal(floorVsShortPolicy.policyComparison.favorsPolicyholder.source, 'statute');
});

test('Illinois working days are counted as business days; uncited suit length is absent', () => {
  const result = engine.calculateDeadlines(data, {
    state: 'IL',
    dateOfLoss: '2026-01-02',
    proofOfLossDate: '2026-02-02',
    asOf: '2026-01-02'
  });
  const ack = result.results.find((r) => r.id === 'il-acknowledge');
  assert.equal(ack.dueDate, iso(engine.addBusinessDays(d('2026-01-02'), 15)));
  assert.equal(ack.dayType, 'business');
  assert.equal(result.results.some((r) => /homeowner policies/i.test(r.ruleText)), false);
  const tolling = result.results.find((r) => r.id === 'il-suit-tolling');
  assert.equal(tolling.dueDate, null);
  assert.equal(tolling.status, 'informational');
  assert.match(tolling.notes.join(' '), /February 2, 2026/);
});

test('South Carolina 90-day demand rule is not dated without a demand date', () => {
  const result = engine.calculateDeadlines(data, {
    state: 'SC',
    dateOfLoss: '2023-10-16',
    asOf: '2026-10-16'
  });
  const byId = Object.fromEntries(result.results.map((r) => [r.id, r]));
  assert.equal(byId['sc-pol-forms'].dueDate, '2023-11-05');
  assert.equal(byId['sc-refusal-after-demand'].dueDate, null);
  assert.equal(byId['sc-refusal-after-demand'].missingTrigger, 'written demand');
  assert.equal(byId['sc-contract-sol'].dueDate, '2026-10-16');
});

test('Georgia 60-day affirm/deny waits for proof of loss; 30-day investigation uses notice', () => {
  const result = engine.calculateDeadlines(data, {
    state: 'GA',
    dateOfLoss: '2026-06-01',
    asOf: '2026-06-01'
  });
  const byId = Object.fromEntries(result.results.map((r) => [r.id, r]));
  assert.equal(byId['ga-acknowledge'].dueDate, '2026-06-16');
  assert.equal(byId['ga-affirm-deny'].dueDate, null);
  assert.equal(byId['ga-investigate-no-pol'].dueDate, '2026-07-01');
  assert.equal(byId['ga-pay'].dueDate, null);

  const withPol = engine.calculateDeadlines(data, {
    state: 'GA',
    dateOfLoss: '2026-06-01',
    proofOfLossDate: '2026-06-20',
    asOf: '2026-06-20'
  });
  assert.equal(withPol.results.find((r) => r.id === 'ga-affirm-deny').dueDate, '2026-08-19');
});

test('source-checked cited rules still display when owner verification is pending', () => {
  const result = engine.calculateDeadlines(data, {
    state: 'FL',
    dateOfLoss: '2025-04-16',
    asOf: '2026-10-16'
  });
  assert.equal(result.ok, true);
  assert.ok(result.results.length >= 5);
  assert.equal(result.results.every((r) => r.verified === false), true);
  assert.equal(result.results.every((r) => !!r.sourceChecked), true);
});

test('rows without a source-checked citation never appear even if injected', () => {
  const poisoned = JSON.parse(JSON.stringify(data));
  poisoned.states[0].rules.push({
    id: 'fl-fake',
    name: 'Unverified-source trap',
    rule_text: 'should never show',
    citation: { label: 'none', url: 'https://example.com' },
    verified: true,
    verified_by: 'injected-trap',
    verified_on: '2026-10-12',
    next_review: '2027-01-12',
    day_type: 'calendar',
    unit: 'days',
    amount: 1,
    trigger: 'date_of_loss'
  });
  const result = engine.calculateDeadlines(poisoned, {
    state: 'FL',
    dateOfLoss: '2026-01-01',
    asOf: '2026-01-01'
  });
  assert.equal(result.results.some((r) => r.id === 'fl-fake'), false);
});
