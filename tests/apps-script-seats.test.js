/**
 * Dependency-free tests for the Apps Script seat counter (doGet ?action=seats).
 *
 * Run: node tests/apps-script-seats.test.js
 *
 * Loads ../google_apps_script.js into a sandboxed vm context with mocked Google
 * Apps Script services. All data below is SYNTHETIC (fake firm names, 555 phones,
 * reserved test domains). No network is touched: UrlFetchApp.fetch throws if called.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = fs.readFileSync(path.join(__dirname, '..', 'google_apps_script.js'), 'utf8');

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeContentService() {
  return {
    MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
    createTextOutput: function (s) {
      return {
        _text: String(s),
        _mime: null,
        setMimeType: function (m) { this._mime = m; return this; },
        getContent: function () { return this._text; },
        getMimeType: function () { return this._mime; }
      };
    }
  };
}

// sheetConfig: { grid: [[...]], throwOnRead: bool }
function makeSpreadsheet(sheetConfig) {
  var sheet = {
    _appended: [],
    _reads: 0,
    getLastRow: function () { return sheetConfig.grid.length; },
    getName: function () { return 'Seats_200'; },
    getRange: function (startRow, startCol, numRows, numCols) {
      return {
        getValues: function () {
          sheet._reads++;
          if (sheetConfig.throwOnRead) throw new Error('sheet read boom');
          var out = [];
          for (var r = 0; r < numRows; r++) {
            var srcRow = sheetConfig.grid[startRow - 1 + r] || [];
            var cells = [];
            for (var c = 0; c < numCols; c++) {
              var v = srcRow[startCol - 1 + c];
              cells.push(v === undefined ? '' : v);
            }
            out.push(cells);
          }
          return out;
        }
      };
    },
    getDataRange: function () {
      return { getValues: function () { return sheetConfig.grid; } };
    },
    appendRow: function (row) { sheet._appended.push(row); }
  };
  return {
    sheet: sheet,
    api: {
      getActiveSpreadsheet: function () {
        return {
          getSheets: function () { return [sheet]; },
          getSheetByName: function () { return sheet; },
          getActiveSheet: function () { return sheet; }
        };
      }
    }
  };
}

// cacheConfig: { store: {}, throwOnGetScriptCache: bool, throwOnGet: bool }
function makeCacheService(cacheConfig) {
  cacheConfig._puts = [];
  return {
    getScriptCache: function () {
      if (cacheConfig.throwOnGetScriptCache) throw new Error('cache service boom');
      var store = cacheConfig.store || (cacheConfig.store = {});
      return {
        get: function (key) {
          if (cacheConfig.throwOnGet) throw new Error('cache get boom');
          return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        put: function (key, val, ttl) {
          cacheConfig._puts.push({ key: key, val: val, ttl: ttl });
          store[key] = val;
        }
      };
    }
  };
}

function loadApp(opts) {
  opts = opts || {};
  var logs = [];
  var sheetConfig = opts.sheet || { grid: [] };
  var cacheConfig = opts.cache || { store: {} };
  var sp = makeSpreadsheet(sheetConfig);
  var urlFetchCalls = [];

  var sandbox = {
    SpreadsheetApp: sp.api,
    ContentService: makeContentService(),
    CacheService: makeCacheService(cacheConfig),
    Logger: { log: function (s) { logs.push(String(s)); } },
    PropertiesService: {
      getScriptProperties: function () {
        var props = opts.props || {};
        return {
          getProperty: function (k) {
            return Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null;
          },
          setProperty: function (k, v) { props[k] = v; }
        };
      }
    },
    LockService: {
      getScriptLock: function () {
        return { waitLock: function () {}, releaseLock: function () {} };
      }
    },
    UrlFetchApp: {
      fetch: function () {
        urlFetchCalls.push(Array.prototype.slice.call(arguments));
        throw new Error('UrlFetchApp.fetch must not be called in tests');
      }
    },
    JSON: JSON, Date: Date, Math: Math, Object: Object,
    String: String, Number: Number, isFinite: isFinite
  };

  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'google_apps_script.js' });

  return {
    ctx: sandbox,
    logs: logs,
    sheet: sp.sheet,
    cacheConfig: cacheConfig,
    urlFetchCalls: urlFetchCalls
  };
}

// ---------------------------------------------------------------------------
// Synthetic fixtures (header + data rows). Columns:
// 0 Shop | 1 POC | 2 Email | 3 Phone | 4 Owner | 5 Stage | 6 Seats_hoped
// ---------------------------------------------------------------------------

var HEADER = ['Shop', 'POC', 'Email', 'Phone', 'Owner', 'Stage', 'Seats_hoped'];

// Summation fixture. Real seat sum = 3 + 2 (floor 2.7) + 1000 (cap 5000) + 4 = 1009.
var SUM_GRID = [
  HEADER,
  ['Anders Firm', 'Mara Finch', 'mara@anders-firm.com', '555-0100', 'Unassigned', 'Named', '3'],
  ['Blue Ridge Claims', 'Quinn Vale', 'quinn@blueridge-firm.com', '555-0101', 'Unassigned', 'Named', 2.7],
  ['Cobalt Adjusters', 'Rhea Monroe', 'rhea@cobalt-firm.com', '555-0102', 'Unassigned', 'Named', 5000],
  ['Zero Seats Co', 'Sam Okafor', 'sam@zeroseats-firm.com', '555-0103', 'Unassigned', 'Named', 0],
  ['Negative Co', 'Nina Park', 'nina@negative-firm.com', '555-0104', 'Unassigned', 'Named', -5],
  ['Alpha Co', 'Alex Reyes', 'alex@alpha-firm.com', '555-0105', 'Unassigned', 'Named', 'abc'],
  ['Empty Seats', 'Dana Cole', 'dana@emptyseats-firm.com', '555-0106', 'Unassigned', 'Named', ''],
  ['Blank Seats', 'Omar Diaz', 'omar@blankseats-firm.com', '555-0107', 'Unassigned', 'Named'],
  ['Four Co', 'Priya Shah', 'priya@four-firm.com', '555-0108', 'Unassigned', 'Named', 4]
];
var SUM_EXPECTED = 1009;

// Synthetic identities that must NOT appear anywhere in the response body.
var SUM_SECRETS = [
  'Anders Firm', 'Mara Finch', 'mara@anders-firm.com', '555-0100',
  'Blue Ridge Claims', 'quinn@blueridge-firm.com', 'Priya Shah', 'priya@four-firm.com'
];

// TEST-exclusion fixture. Only "Anna Testa" (7) and "Contest Adjusters" (5) count = 12.
var TEST_GRID = [
  HEADER,
  ['TEST FIRM - DELETE', '(TEST BETA SIGNUP - DELETE ME)', 'test-beta-20261027@example.com', '555-0200', 'Unassigned', 'Named', 50],
  ['Testa Adjusting', 'Anna Testa', 'anna@testa-adjusting.co', '555-0201', 'Unassigned', 'Named', 7],
  ['Contest Adjusters', 'Lee Gray', 'lee@contest-firm.com', '555-0202', 'Unassigned', 'Named', 5],
  ['Org Example', 'Jo Kim', 'jo@example.org', '555-0203', 'Unassigned', 'Named', 9],
  ['Bar Co', 'Foo Bar', 'foo@bar.test', '555-0204', 'Unassigned', 'Named', 11]
];
var TEST_EXPECTED = 12;

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

var passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { console.log('PASS ' + name); passed++; }
  else { console.log('FAIL ' + name); failed++; }
}

function seatsBody(app, action) {
  var out = app.ctx.doGet({ parameter: { action: action === undefined ? 'seats' : action } });
  return { text: out.getContent(), mime: out.getMimeType() };
}

// Replica of the js/site.js "4b. Live seats requested counter" display logic.
// Returns the label string, or null when the counter would hide itself.
function siteCounterLabel(body) {
  var data;
  try { data = JSON.parse(body); } catch (e) { return null; }
  var seats = data && Number(data.seats);
  if (!Number.isFinite(seats) || seats <= 0) return null;
  var n = Math.round(seats);
  return n.toLocaleString('en-US') + ' ' + (n === 1 ? 'seat' : 'seats') + ' requested so far.';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// 1. Summation over real rows: header excluded; blanks/""/"abc"/0/negative ignored;
//    "3" string counts; 2.7 floors; 5000 caps to 1000.
(function () {
  var app = loadApp({ sheet: { grid: SUM_GRID } });
  var r = seatsBody(app);
  var obj = JSON.parse(r.text);
  check('seats sums Seats_hoped over real rows (=1009)', obj.seats === SUM_EXPECTED);
})();

// 2. TEST exclusions.
(function () {
  var app = loadApp({ sheet: { grid: TEST_GRID } });
  var obj = JSON.parse(seatsBody(app).text);
  check('TEST rows excluded, real "Testa"/"Contest" included (=12)', obj.seats === TEST_EXPECTED);
})();

// 3. Response shape: JSON mime, only the "seats" key, no row data leaks.
(function () {
  var app = loadApp({ sheet: { grid: SUM_GRID } });
  var r = seatsBody(app);
  var obj = JSON.parse(r.text);
  var keys = Object.keys(obj);
  check('response mime is application/json', r.mime === 'application/json');
  check('response has only the "seats" key', keys.length === 1 && keys[0] === 'seats');
  var leaked = false;
  for (var i = 0; i < SUM_SECRETS.length; i++) {
    if (r.text.indexOf(SUM_SECRETS[i]) !== -1) { leaked = true; break; }
  }
  check('no row data leaks into the response body', leaked === false);
})();

// 4. Empty sheet (only header) -> {"seats":0}.
(function () {
  var app = loadApp({ sheet: { grid: [HEADER] } });
  var obj = JSON.parse(seatsBody(app).text);
  check('empty sheet (header only) -> seats 0', obj.seats === 0 && app.sheet._reads === 0);
})();

// 5. Cache hit returns cached value WITHOUT reading the sheet.
(function () {
  var app = loadApp({
    sheet: { grid: SUM_GRID },
    cache: { store: { claimhive_seats_v1: '777' } }
  });
  var obj = JSON.parse(seatsBody(app).text);
  check('cache hit returns cached value (777)', obj.seats === 777);
  check('cache hit does not read the sheet', app.sheet._reads === 0);
})();

// 6. Cache miss computes and puts value with ttl 300.
(function () {
  var app = loadApp({ sheet: { grid: SUM_GRID }, cache: { store: {} } });
  var obj = JSON.parse(seatsBody(app).text);
  var puts = app.cacheConfig._puts;
  check('cache miss computes correct value', obj.seats === SUM_EXPECTED);
  check('cache miss puts "claimhive_seats_v1" = String(N) ttl 300',
    puts.length === 1 &&
    puts[0].key === 'claimhive_seats_v1' &&
    puts[0].val === String(SUM_EXPECTED) &&
    puts[0].ttl === 300);
})();

// 7. CacheService throwing still returns the right count.
(function () {
  var app = loadApp({ sheet: { grid: SUM_GRID }, cache: { throwOnGetScriptCache: true } });
  var obj = JSON.parse(seatsBody(app).text);
  check('CacheService throwing still returns correct count', obj.seats === SUM_EXPECTED);
})();

// 8. Sheet read throwing -> {"error":"unavailable"}.
(function () {
  var app = loadApp({ sheet: { grid: SUM_GRID, throwOnRead: true }, cache: { store: {} } });
  var obj = JSON.parse(seatsBody(app).text);
  check('sheet read throwing -> {"error":"unavailable"}',
    obj.error === 'unavailable' && obj.seats === undefined);
})();

// 9. No action / other action -> exact unchanged plain-text health string.
(function () {
  var HEALTH = 'Claim Hive Google Sheets & Slack Webhook is active and ready.';
  var app = loadApp({ sheet: { grid: SUM_GRID } });
  var noAction = app.ctx.doGet({ parameter: {} });
  var other = app.ctx.doGet({ parameter: { action: 'ping' } });
  var noParam = app.ctx.doGet({});
  check('no action -> exact health string (plain text)',
    noAction.getContent() === HEALTH && noAction.getMimeType() === null);
  check('other action -> exact health string', other.getContent() === HEALTH);
  check('no parameter object -> exact health string', noParam.getContent() === HEALTH);
})();

// 10. Site.js counter replication against the returned body.
(function () {
  // Real data -> "N seats requested so far."
  var appReal = loadApp({ sheet: { grid: SUM_GRID } });
  check('site counter: real data yields "1,009 seats requested so far."',
    siteCounterLabel(seatsBody(appReal).text) === '1,009 seats requested so far.');

  // Singular form.
  var appOne = loadApp({
    sheet: { grid: [HEADER, ['Solo Co', 'Rae Lin', 'rae@solo-firm.com', '555-0300', 'Unassigned', 'Named', 1]] }
  });
  check('site counter: 1 seat yields singular label',
    siteCounterLabel(seatsBody(appOne).text) === '1 seat requested so far.');

  // Zero -> hidden.
  var appZero = loadApp({ sheet: { grid: [HEADER] } });
  check('site counter: {"seats":0} hides the counter',
    siteCounterLabel(seatsBody(appZero).text) === null);

  // Error -> hidden.
  check('site counter: {"error":...} hides the counter',
    siteCounterLabel('{"error":"unavailable"}') === null);
})();

// 11. doPost smoke test: a valid synthetic payload still appends and succeeds.
(function () {
  var app = loadApp({ sheet: { grid: [HEADER] } });
  var payload = {
    Shop: 'Synthetic Co',
    POC: 'Pat Lee',
    FullName: 'Pat Lee',
    Email: 'pat@synthetic-firm.com',
    Phone: '555-0199',
    Seats_hoped: 3,
    FormType: 'request'
  };
  var out = app.ctx.doPost({ postData: { contents: JSON.stringify(payload) } });
  var obj = JSON.parse(out.getContent());
  check('doPost accepts valid synthetic payload (status success)', obj.status === 'success');
  check('doPost appended exactly one row', app.sheet._appended.length === 1);
  check('doPost made no network calls', app.urlFetchCalls.length === 0);
})();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
