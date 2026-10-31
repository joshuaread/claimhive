/**
 * Claim deadline calculator page — loads source-checked, cited rules and renders results.
 * GA4: calculator_run with state only. Dates are never sent to analytics.
 */
(function () {
  'use strict';

  var DATA_URL = '../data/claim-deadlines.json';
  var dataset = null;

  function $(id) {
    return document.getElementById(id);
  }

  function trackRun(state) {
    if (typeof window.trackClaimHiveEvent === 'function' && state) {
      window.trackClaimHiveEvent('calculator_run', { state: state });
    }
  }

  function daysRemainingLabel(days) {
    if (days == null) return null;
    if (days < 0) {
      var ago = Math.abs(days);
      return ago === 1 ? '1 day ago' : ago + ' days ago';
    }
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day remaining';
    return days + ' days remaining';
  }

  function daysBadgeClass(days) {
    if (days == null) return 'badge-info';
    if (days < 0) return 'badge-urgent';
    if (days <= 7) return 'badge-warning';
    return 'badge-success';
  }

  function statusBadge(result) {
    if (result.status === 'floor') return '<span class="badge badge-warning">Statutory floor — check the policy</span>';
    if (result.status === 'needs_trigger') return '<span class="badge badge-info">Needs another date</span>';
    if (result.status === 'informational') return '<span class="badge badge-info">Rule, no fixed date</span>';
    if (result.dayType === 'business') return '<span class="badge badge-navy">Business days</span>';
    return '<span class="badge badge-gold">Calendar days</span>';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDeadlineCard(result) {
    var dateBlock;
    if (result.dueDateDisplay) {
      dateBlock =
        '<p class="calc-due-date">' + escapeHtml(result.dueDateDisplay) + '</p>' +
        '<div class="calc-deadline-meta">' +
          statusBadge(result) +
          (result.daysRemaining != null
            ? '<span class="badge ' + daysBadgeClass(result.daysRemaining) + '">' +
              escapeHtml(daysRemainingLabel(result.daysRemaining)) + '</span>'
            : '') +
          (result.periodLabel
            ? '<span class="badge badge-trust">' + escapeHtml(result.periodLabel) + '</span>'
            : '') +
        '</div>';
    } else {
      var missing = result.missingTrigger
        ? 'Enter ' + result.missingTrigger + ' to date this clock.'
        : 'This rule does not produce a calendar date from the inputs on this page.';
      dateBlock =
        '<p class="calc-empty-date">' + escapeHtml(missing) + '</p>' +
        '<div class="calc-deadline-meta">' + statusBadge(result) +
          (result.periodLabel
            ? '<span class="badge badge-trust">' + escapeHtml(result.periodLabel) + '</span>'
            : '') +
        '</div>';
    }

    var notes = '';
    if (result.notes && result.notes.length) {
      notes = '<ul class="calc-notes">' + result.notes.map(function (n) {
        return '<li>' + escapeHtml(n) + '</li>';
      }).join('') + '</ul>';
    }

    return (
      '<article class="calc-deadline-card" data-rule-id="' + escapeHtml(result.id) + '">' +
        '<div class="calc-deadline-head">' +
          '<h3>' + escapeHtml(result.name) + '</h3>' +
        '</div>' +
        dateBlock +
        '<p class="calc-rule-text">' + escapeHtml(result.ruleText) + '</p>' +
        '<p class="calc-cite">Cite: <a href="' + escapeHtml(result.citation.url) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(result.citation.label) + '</a></p>' +
        '<p class="field-hint">Counted from the ' + escapeHtml(result.triggerLabel) +
          '. Source checked ' + escapeHtml(result.sourceChecked) +
          (result.nextReview ? '. Next source check ' + escapeHtml(result.nextReview) : '') +
          '.</p>' +
        notes +
      '</article>'
    );
  }

  function renderPolicyComparison(comparison) {
    if (!comparison) return '';
    var favoredSource = comparison.favorsPolicyholder.source;
    var favoredLabel = favoredSource === 'same'
      ? 'The policy date and the statute date are the same.'
      : favoredSource === 'policy'
        ? 'The policy date is later, so it is the deadline that favors the policyholder.'
        : 'The statute date is later, so it is the deadline that favors the policyholder.';

    var statuteBox = comparison.statute
      ? '<div class="calc-lenient-box' + (favoredSource === 'statute' || favoredSource === 'same' ? ' is-favored' : '') + '">' +
          '<div class="label">' + escapeHtml(comparison.statute.isFloor ? 'Statutory floor' : 'Statute deadline') + '</div>' +
          '<div class="calc-due-date" style="margin:0">' + escapeHtml(comparison.statute.dateDisplay) + '</div>' +
          '<p class="field-hint" style="margin:0.35rem 0 0">' + escapeHtml(comparison.statute.label) + '</p>' +
        '</div>'
      : '<div class="calc-lenient-box"><div class="label">Statute deadline</div>' +
          '<p class="calc-empty-date" style="margin:0">No cited suit-limitation date for this state.</p></div>';

    var policyFavored = favoredSource === 'policy' || favoredSource === 'same';

    return (
      '<section class="calc-lenient" aria-label="Deadline that favors the policyholder">' +
        '<span class="badge badge-success">Favors the policyholder</span>' +
        '<h2 style="margin-top:0.75rem">The more lenient (later) deadline</h2>' +
        '<p class="calc-lenient-date">' + escapeHtml(comparison.favorsPolicyholder.dateDisplay) + '</p>' +
        '<p class="field-hint">' + escapeHtml(favoredLabel) + ' Both dates are shown below.</p>' +
        '<div class="calc-lenient-pair">' +
          statuteBox +
          '<div class="calc-lenient-box' + (policyFavored ? ' is-favored' : '') + '">' +
            '<div class="label">Policy deadline</div>' +
            '<div class="calc-due-date" style="margin:0">' + escapeHtml(comparison.policy.dateDisplay) + '</div>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function showError(message) {
    var el = $('calc-error');
    el.hidden = !message;
    el.textContent = message || '';
  }

  function populateStates(data) {
    var select = $('calc-state');
    var available = document.createElement('optgroup');
    available.label = 'Available now';
    data.states.forEach(function (state) {
      var opt = document.createElement('option');
      opt.value = state.code;
      opt.textContent = state.name + ' (' + state.code + ')';
      available.appendChild(opt);
    });
    var soon = document.createElement('optgroup');
    soon.label = 'Coming soon';
    data.coming_soon.forEach(function (state) {
      var opt = document.createElement('option');
      opt.value = state.code;
      opt.textContent = state.name + ' (' + state.code + ') — coming soon';
      soon.appendChild(opt);
    });
    select.appendChild(available);
    select.appendChild(soon);
  }

  function renderSources(data) {
    var body = $('calc-sources-body');
    if (!body) return;
    var rows = [];
    data.states.forEach(function (state) {
      state.rules.forEach(function (rule) {
        if (!rule.source_checked) return;
        rows.push(
          '<tr>' +
            '<td>' + escapeHtml(state.code) + '</td>' +
            '<td>' + escapeHtml(rule.name) + '</td>' +
            '<td><a href="' + escapeHtml(rule.citation.url) + '" target="_blank" rel="noopener noreferrer">' +
              escapeHtml(rule.citation.label) + '</a></td>' +
            '<td>' + escapeHtml(rule.source_checked) + '</td>' +
            '<td>' + escapeHtml(rule.next_review) + '</td>' +
          '</tr>'
        );
      });
    });
    body.innerHTML = rows.join('');
  }

  function onSubmit(event) {
    event.preventDefault();
    showError('');
    $('calc-results').hidden = true;
    $('calc-coming-soon').hidden = true;

    var state = $('calc-state').value;
    var dateOfLoss = $('calc-date-of-loss').value;
    var proofOfLoss = $('calc-proof-of-loss').value;
    var policyDeadline = $('calc-policy-deadline').value;

    if (!state) {
      showError('Choose a state.');
      return;
    }
    if (!dateOfLoss) {
      showError('Enter the date of loss.');
      return;
    }

    trackRun(state);

    var result = window.ClaimDeadlineEngine.calculateDeadlines(dataset, {
      state: state,
      dateOfLoss: dateOfLoss,
      proofOfLossDate: proofOfLoss || undefined,
      policyDeadline: policyDeadline || undefined
    });

    if (result.comingSoon) {
      $('calc-coming-soon-text').textContent =
        result.state.name + ' is coming soon. Cited rules for this state are not in v1 yet.';
      $('calc-coming-soon').hidden = false;
      $('calc-coming-soon').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!result.ok) {
      var messages = {
        invalid_date_of_loss: 'Enter a valid date of loss.',
        invalid_proof_of_loss_date: 'Enter a valid proof-of-loss date, or leave it blank.',
        invalid_policy_deadline: 'Enter a valid policy deadline, or leave it blank.',
        unknown_state: 'That state is not in this calculator.'
      };
      showError(messages[result.error] || 'Could not calculate those deadlines.');
      return;
    }

    var html = renderPolicyComparison(result.policyComparison);
    html += '<div class="calc-deadline-list">';
    html += result.results.map(renderDeadlineCard).join('');
    html += '</div>';
    $('calc-results-body').innerHTML = html;
    $('calc-results-heading').textContent = 'Deadlines for ' + result.state.name;
    $('calc-results').hidden = false;
    $('calc-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Could not load statute table');
        return res.json();
      })
      .then(function (json) {
        dataset = json;
        populateStates(json);
        renderSources(json);
        var note = $('calc-verification-note');
        if (note && json.meta && json.meta.source_note) {
          note.textContent = json.meta.source_note +
            ' Last statute pull: ' + json.meta.last_statute_pull +
            '. Next quarterly pull: ' + json.meta.next_quarterly_pull +
            '. Statutes will be pulled quarterly.';
        }
      })
      .catch(function () {
        showError('The statute table could not be loaded. Refresh the page and try again.');
      });

    $('deadline-form').addEventListener('submit', onSubmit);
  });
})();
