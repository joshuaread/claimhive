/**
 * Claim Hive — Google Apps Script for Seats_200 Form Integration
 *
 * HOW TO ATTACH THIS TO YOUR GOOGLE SHEET IN 60 SECONDS:
 * 1. Open the ClaimHive lead Google Sheet (owner account)
 * 2. In the top menu, click Extensions > Apps Script
 * 3. Delete any default code in Code.gs, and paste this entire file
 * 4. Click the blue "Deploy" button (top right) > "New deployment"
 * 5. Under "Select type" (gear icon), select "Web app"
 * 6. Set Description: "Claim Hive Web Intake"
 * 7. Set "Execute as": "Me" (your Google account)
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL so the website form can post to it
 * 9. Click "Deploy", authorize access when prompted, and COPY the Web App URL (starts with https://script.google.com/macros/s/...)
 * 10. Paste that URL into js/request-form.js under LIVE_WEBHOOK_URL (and js/site.js WEBHOOK_URL / SEATS_URL)
 *
 * NOTE: When updating the code later, ALWAYS use Deploy > Manage deployments > edit (pencil
 * icon) > Version: New version on the EXISTING deployment, so the Web App URL stays the same.
 * Never choose "New deployment" — that mints a different URL and silently breaks the live forms.
 * Keep Execute as: Me and Who has access: Anyone.
 */

// Generic responses — never leak internal details to the caller.
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Spreadsheet formula-injection guard: neutralize string cells that could be
// interpreted as a formula by prefixing an apostrophe. Numbers are untouched.
function safeCell_(value) {
  if (typeof value === "string" && value.length > 0) {
    var first = value.charAt(0);
    if (first === "=" || first === "+" || first === "-" || first === "@" ||
        first === "\t" || first === "\r") {
      return "'" + value;
    }
  }
  return value;
}

// Neutralize user-derived text before interpolating it into a Slack payload: strip
// Slack control sequences (<!here>, <@U…>, <#C…>) then escape &, <, > per Slack's rules.
function slackEscape_(s) {
  return String(s)
    .replace(/<[!@#][^>]*>/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Plain-text variant for plain_text fields (e.g. the header block), where Slack does not
// parse markup: strip control sequences and angle brackets, and cap to Slack's header limit.
function slackPlain_(s, maxLen) {
  var out = String(s).replace(/<[!@#][^>]*>/g, "").replace(/[<>]/g, "");
  return (maxLen && out.length > maxLen) ? out.slice(0, maxLen - 1) + "…" : out;
}

// Shared email format. Keep byte-identical with js/request-form.js and js/site.js.
var EMAIL_RE_ = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The only keys accepted from a POST. Anything else is dropped silently (not an error)
// before per-field validation. Staff/pipeline columns are NEVER taken from the client.
var ALLOWED_FIELDS_ = [
  "Shop", "POC", "FullName", "Firm", "Email", "Phone", "Seats_hoped", "Notes",
  "LicenseStates", "CurrentStack", "OpenFilesNow", "Cohort", "Referral",
  "SubmittedAt", "hp_website_url", "FormType"
];

// Per-field maximum string lengths (String(value).length).
var FIELD_LIMITS_ = { Notes: 2000, Shop: 500, Email: 254, FullName: 254, POC: 254 };
var DEFAULT_FIELD_LIMIT_ = 200;

// Raw-payload caps applied BEFORE unknown keys are dropped. Returns null when OK,
// otherwise an error string for logging.
function checkRawCaps_(data, rawLength) {
  if (rawLength > 10000) {
    return "Payload too large: " + rawLength + " chars";
  }
  if (!data || typeof data !== "object") {
    return "Payload is not an object";
  }

  var keys = [];
  for (var k in data) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      keys.push(k);
    }
  }
  if (keys.length > 40) {
    return "Too many keys: " + keys.length;
  }

  return null;
}

// Keep only allowlisted keys; everything else is dropped silently.
function pickAllowed_(data) {
  var clean = {};
  for (var i = 0; i < ALLOWED_FIELDS_.length; i++) {
    var key = ALLOWED_FIELDS_[i];
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      clean[key] = data[key];
    }
  }
  return clean;
}

// Per-field validation on the cleaned payload. Returns null when valid, otherwise
// an error string for logging.
function validatePayload_(clean) {
  // Per-field size limits on string values.
  for (var i = 0; i < ALLOWED_FIELDS_.length; i++) {
    var key = ALLOWED_FIELDS_[i];
    if (!Object.prototype.hasOwnProperty.call(clean, key)) continue;
    var value = clean[key];
    if (value === null || value === undefined) continue;
    var len = String(value).length;
    var limit = FIELD_LIMITS_.hasOwnProperty(key) ? FIELD_LIMITS_[key] : DEFAULT_FIELD_LIMIT_;
    if (len > limit) {
      return "Field '" + key + "' over limit (" + len + " > " + limit + ")";
    }
  }

  // Email required, trimmed, and well-formed.
  var email = (clean.Email || "").toString().trim();
  if (!email || !EMAIL_RE_.test(email)) {
    return "Missing or invalid email";
  }

  // Name required: at least one of FullName / POC non-empty after trim.
  var fullName = (clean.FullName || "").toString().trim();
  var poc = (clean.POC || "").toString().trim();
  if (!fullName && !poc) {
    return "Missing name (FullName/POC)";
  }

  return null;
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Target the first sheet or the one matching "Seats" / active
    var sheet = ss.getSheets()[0];

    var rawLength = (e.postData && e.postData.contents) ? e.postData.contents.length : 0;

    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    // Coerce to a plain object.
    if (!data || typeof data !== "object") {
      Logger.log("Rejected submission: parsed payload is not an object");
      return jsonResponse_({ status: "error", message: "Invalid submission." });
    }

    // Raw-payload caps applied BEFORE dropping unknown keys.
    var rawError = checkRawCaps_(data, rawLength);
    if (rawError) {
      Logger.log("Rejected submission: " + rawError);
      return jsonResponse_({ status: "error", message: "Invalid submission." });
    }

    // Honeypot: if the hidden trap field is filled, pretend success and write nothing.
    var honeypot = (data.hp_website_url || "").toString().trim();
    if (honeypot !== "") {
      return jsonResponse_({ status: "success" });
    }

    // Drop everything outside the allowlist, then validate/use only `clean`.
    var clean = pickAllowed_(data);

    // Validate the payload; all failures share one generic message.
    var validationError = validatePayload_(clean);
    if (validationError) {
      Logger.log("Rejected submission: " + validationError);
      return jsonResponse_({ status: "error", message: "Invalid submission." });
    }

    // Format tomorrow's date as M/D/YYYY (Next_action_date is staff-controlled).
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var formattedDate = (tomorrow.getMonth() + 1) + "/" + tomorrow.getDate() + "/" + tomorrow.getFullYear();

    // Form type: honor an explicit value, otherwise infer from the waitlist sentinels.
    var formType = (clean.FormType === "waitlist" || clean.FormType === "request")
      ? clean.FormType
      : ((clean.Phone === "N/A" && clean.LicenseStates === "N/A") ? "waitlist" : "request");

    // Staff/pipeline columns are set server-side, never taken from the client.
    var mentionsJosh = /\bjosh\b/i.test(clean.Referral || "") || /\bjosh\b/i.test(clean.Firm || "");
    var owner, source, nextAction;
    if (formType === "waitlist") {
      owner = "Unassigned";
      source = "Website - Homepage Waitlist";
      nextAction = "Beta invitation";
    } else {
      owner = mentionsJosh ? "Josh" : "Unassigned";
      source = mentionsJosh ? "Josh book" : "Website - Waitlist";
      nextAction = "Josh text";
    }

    // Seats_hoped stays public: integer 1..1000 or fall back to 1.
    var seatsParsed = Math.floor(Number(clean.Seats_hoped));
    var seats = (seatsParsed >= 1 && seatsParsed <= 1000) ? seatsParsed : 1; // NaN fails both checks -> 1
    clean.Seats_hoped = seats; // Slack uses the clamped value too

    // Compose rich notes column from intake questions (Notes stays public).
    var notes = clean.Notes || "";
    if (!notes) {
      var noteParts = [];
      if (clean.Cohort) noteParts.push("Cohort: " + clean.Cohort);
      if (clean.LicenseStates) noteParts.push("States: " + clean.LicenseStates);
      if (clean.CurrentStack) noteParts.push("Stack: " + clean.CurrentStack);
      if (clean.OpenFilesNow) noteParts.push("Active Files: " + clean.OpenFilesNow);
      if (clean.Referral) noteParts.push("Referred by: " + clean.Referral);
      if (clean.SubmittedAt) noteParts.push("Submitted: " + clean.SubmittedAt);
      notes = noteParts.join(" | ");
    }

    // Exact 21 columns matching the Seats_200 Google Sheet schema:
    // Col 1:  Shop
    // Col 2:  POC (Point of Contact / Name)
    // Col 3:  Email
    // Col 4:  Phone
    // Col 5:  Owner (Josh)
    // Col 6:  Stage (Named)
    // Col 7:  Seats_hoped
    // Col 8:  Seats_reserved
    // Col 9:  Seats_billed
    // Col 10: Source
    // Col 11: Login_sent
    // Col 12: Slack_in
    // Col 13: First_file_in
    // Col 14: Second_file_in
    // Col 15: Clinic_count
    // Col 16: Invoice_sent
    // Col 17: Intros_given
    // Col 18: Next_action
    // Col 19: Next_action_date
    // Col 20: Do_not_pitch
    // Col 21: Notes
    var row = [
      safeCell_(clean.Shop || clean.Firm || ((clean.FullName || "") + " — " + (clean.Firm || "Independent"))), // Shop
      safeCell_(clean.POC || clean.FullName || ""),                                      // POC
      safeCell_(clean.Email || ""),                                                      // Email
      safeCell_(clean.Phone || ""),                                                      // Phone
      safeCell_(owner),                                                                  // Owner
      "Named",                                                                           // Stage
      safeCell_(seats),                                                                  // Seats_hoped
      "",                                                                                // Seats_reserved
      "",                                                                                // Seats_billed
      safeCell_(source),                                                                 // Source
      "",                                                                                // Login_sent
      "",                                                                                // Slack_in
      "",                                                                                // First_file_in
      "",                                                                                // Second_file_in
      "",                                                                                // Clinic_count
      "",                                                                                // Invoice_sent
      "",                                                                                // Intros_given
      safeCell_(nextAction),                                                             // Next_action
      safeCell_(formattedDate),                                                          // Next_action_date
      "",                                                                                // Do_not_pitch
      safeCell_(notes)                                                                   // Notes
    ];

    // Serialize the dedupe-check + append so concurrent posts can't race.
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (lockErr) {
      Logger.log("Could not obtain script lock: " + lockErr.toString());
      return jsonResponse_({ status: "error", message: "Submission failed." });
    }

    var appended = false;
    try {
      // DEDUPLICATION: Prevent identical entries from being added within recent rows
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var checkCount = Math.min(10, lastRow - 1);
        var recentValues = sheet.getRange(lastRow - checkCount + 1, 1, checkCount, 4).getValues(); // Shop, POC, Email, Phone
        var candidateEmail = (clean.Email || "").toString().toLowerCase().trim();
        var candidatePoc = (clean.POC || clean.FullName || "").toString().toLowerCase().trim();

        for (var r = 0; r < recentValues.length; r++) {
          var existingPoc = (recentValues[r][1] || "").toString().toLowerCase().trim();
          var existingEmail = (recentValues[r][2] || "").toString().toLowerCase().trim();
          if (candidateEmail && existingEmail === candidateEmail) {
            // Don't reveal that this email already exists — report success, write nothing.
            return jsonResponse_({ status: "success" });
          }
          if (candidatePoc && existingPoc === candidatePoc && !candidateEmail) {
            return jsonResponse_({ status: "success" });
          }
        }
      }

      sheet.appendRow(row);
      appended = true;
    } finally {
      lock.releaseLock();
    }

    // SLACK INCOMING WEBHOOK NOTIFICATION TO #inbound — after the lock is released,
    // and only when a row was actually appended.
    if (appended) {
      try {
        sendSlackNotification(clean, owner, nextAction);
      } catch (slackErr) {
        Logger.log("Slack notification failed: " + slackErr.toString());
      }
    }

    return jsonResponse_({ status: "success" });

  } catch (err) {
    Logger.log("doPost failed: " + err.toString());
    return jsonResponse_({ status: "error", message: "Submission failed." });
  }
}

/**
 * Send instantaneous lead notification to private Slack channel #inbound.
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Claim Hive Slack workspace, create an Incoming Webhook for #inbound.
 * 2. In Google Apps Script, click Project Settings (gear icon) > Script Properties > Add script property:
 *    Property: SLACK_WEBHOOK_URL
 *    Value: https://hooks.slack.com/services/T.../B.../X...
 * 3. (Optional) Alternatively, paste the webhook URL directly into FALLBACK_SLACK_WEBHOOK below.
 */
var FALLBACK_SLACK_WEBHOOK = ""; // Paste webhook URL here if not using Script Properties

function sendSlackNotification(data, owner, nextAction) {
  var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL') || FALLBACK_SLACK_WEBHOOK;

  if (!webhookUrl || webhookUrl.indexOf("https://hooks.slack.com") === -1) {
    Logger.log("Slack Webhook URL not set. Skipping Slack ping.");
    return;
  }

  var shop = slackEscape_(data.Shop || data.Firm || (data.FullName + " — " + (data.Firm || "Independent")));
  var poc = slackEscape_(data.POC || data.FullName || "Adjuster");
  var email = slackEscape_(data.Email || "No email");
  var phone = slackEscape_(data.Phone || "No phone");
  var cohort = slackEscape_(data.Cohort || "Immediate Alpha (Q4 2026)");
  var seats = slackEscape_(data.Seats_hoped || "1");
  var files = slackEscape_(data.OpenFilesNow || "Not specified");
  var stack = slackEscape_(data.CurrentStack || "Not specified");
  var referral = data.Referral ? ("\n• *Referral / Know Josh:* " + slackEscape_(data.Referral)) : "";

  var slackPayload = {
    text: "🐝 *New Inbound Lead on Claim Hive:* " + shop + " (" + seats + " seats)",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: slackPlain_("🐝 New Claim Hive Lead: " + (data.POC || data.FullName || "Adjuster") + " (" + (data.Shop || data.Firm || "Independent") + ")", 150),
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: "*Cohort:*\n" + cohort },
          { type: "mrkdwn", text: "*Seats Needed:*\n" + seats + " seats" },
          { type: "mrkdwn", text: "*Phone:*\n" + phone },
          { type: "mrkdwn", text: "*Email:*\n" + email },
          { type: "mrkdwn", text: "*Active Files:*\n" + files },
          { type: "mrkdwn", text: "*Current Stack:*\n" + stack }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "• *Next Action:* " + slackEscape_(nextAction) + "\n• *Owner:* " + slackEscape_(owner) + referral
        }
      }
    ]
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(slackPayload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(webhookUrl, options);
}

// Browser GET check
function doGet(e) {
  return ContentService.createTextOutput("Claim Hive Google Sheets & Slack Webhook is active and ready.");
}

/**
 * ============================================================================
 * CHAMPION REFERRAL AGENT (Scheduled Cron Task)
 * ============================================================================
 * Runs automatically (e.g., every 24 hours) via Google Apps Script Time-Driven Triggers.
 * Scans the sheet for users who have successfully referred > 4 people and pings Slack.
 */
function checkChampionReferrals() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Seats_200") || ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  Logger.log("Scanning " + data.length + " rows in sheet: " + sheet.getName());
  
  if (data.length < 2) {
    Logger.log("Not enough data rows.");
    return;
  }

  var champions = {}; 
  var referralCounts = {}; 

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var shop = row[0] || "Unknown Shop";
    var poc = row[1] || "Unknown Name";
    var email = row[2] || "No Email";
    
    // Convert the entire row to a string so we don't depend on it being exactly Column U
    var rowStr = row.join(" | ");

    var genMatch = rowStr.match(/Generated Ref Code:\s*(CH-[A-Z0-9\-]+)/i);
    if (genMatch) {
      var genCode = genMatch[1].toUpperCase();
      champions[genCode] = { name: poc, email: email, shop: shop };
      Logger.log("Found Champion: " + genCode + " (" + poc + ")");
    }

    var refMatch = rowStr.match(/Referred by:\s*(CH-[A-Z0-9\-]+)/i);
    if (refMatch) {
      var refCode = refMatch[1].toUpperCase();
      if (!referralCounts[refCode]) referralCounts[refCode] = [];
      referralCounts[refCode].push(poc + " (" + shop + ")");
    }
  }
  
  for (var c in referralCounts) {
    Logger.log("Code " + c + " has " + referralCounts[c].length + " referrals.");
  }

  var props = PropertiesService.getScriptProperties();
  var alertedStr = props.getProperty('ALERTED_CHAMPIONS') || "[]";
  var alerted = JSON.parse(alertedStr);
  var newlyAlerted = false;

  var webhookUrl = props.getProperty('SLACK_WEBHOOK_URL') || FALLBACK_SLACK_WEBHOOK;
  if (!webhookUrl || webhookUrl.indexOf("https://hooks.slack.com") === -1) {
    Logger.log("Webhook URL missing or invalid. Check Script Properties.");
    return;
  }

  for (var code in referralCounts) {
    if (referralCounts[code].length > 4) {
      Logger.log("Code " + code + " qualifies for alert!");
      if (alerted.indexOf(code) === -1) {
        Logger.log("Alerting Slack for " + code);
        
        var champInfo = champions[code] || { name: "Unknown (Not in sheet)", email: "N/A", shop: "N/A" };
        var referredList = referralCounts[code].join("\n• ");

        var slackPayload = {
          text: "🏆 *New Claim Hive Champion Unlocked!* (" + slackEscape_(code) + ")",
          blocks: [
            { type: "header", text: { type: "plain_text", text: "🏆 5+ Referrals Reached!", emoji: true } },
            { type: "section", text: { type: "mrkdwn", text: "*Champion:* " + slackEscape_(champInfo.name) + "\n*Firm:* " + slackEscape_(champInfo.shop) + "\n*Email:* " + slackEscape_(champInfo.email) + "\n*Code:* `" + slackEscape_(code) + "`" } },
            { type: "section", text: { type: "mrkdwn", text: "*They successfully referred (" + referralCounts[code].length + "):*\n• " + slackEscape_(referredList) } },
            { type: "context", elements: [{ type: "mrkdwn", text: "Time to send them a mug/hat! 🧢☕" }] }
          ]
        };

        var options = {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(slackPayload),
          muteHttpExceptions: true
        };
        
        var response = UrlFetchApp.fetch(webhookUrl, options);
        Logger.log("Slack response: " + response.getContentText());

        alerted.push(code);
        newlyAlerted = true;
      } else {
        Logger.log("Code " + code + " was already alerted previously.");
      }
    }
  }

  if (newlyAlerted) {
    props.setProperty('ALERTED_CHAMPIONS', JSON.stringify(alerted));
  }
}