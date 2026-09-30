/**
 * Claim Hive — Google Apps Script for Seats_200 Form Integration
 *
 * HOW TO ATTACH THIS TO YOUR GOOGLE SHEET IN 60 SECONDS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1Womd_Ss-9TqrMpHyviZNj1kuZm08Z-LmxjQtj2i7pAw/edit
 * 2. In the top menu, click Extensions > Apps Script
 * 3. Delete any default code in Code.gs, and paste this entire file
 * 4. Click the blue "Deploy" button (top right) > "New deployment"
 * 5. Under "Select type" (gear icon), select "Web app"
 * 6. Set Description: "Claim Hive Web Intake"
 * 7. Set "Execute as": "Me" (your Google account)
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL so the website form can post to it
 * 9. Click "Deploy", authorize access when prompted, and COPY the Web App URL (starts with https://script.google.com/macros/s/...)
 * 10. Paste that URL into Website/js/request-form.js under CLAIM_HIVE_WEBHOOK_URL
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Target the first sheet or the one matching "Seats" / active
    var sheet = ss.getSheets()[0];
    
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

    // Format tomorrow's date as M/D/YYYY
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var formattedDate = (tomorrow.getMonth() + 1) + "/" + tomorrow.getDate() + "/" + tomorrow.getFullYear();
    var nextActionDate = data.Next_action_date || formattedDate;

    // Compose rich notes column from intake questions
    var notes = data.Notes || "";
    if (!notes) {
      var noteParts = [];
      if (data.Cohort) noteParts.push("Cohort: " + data.Cohort);
      if (data.LicenseStates) noteParts.push("States: " + data.LicenseStates);
      if (data.CurrentStack) noteParts.push("Stack: " + data.CurrentStack);
      if (data.OpenFilesNow) noteParts.push("Active Files: " + data.OpenFilesNow);
      if (data.Referral) noteParts.push("Referred by: " + data.Referral);
      if (data.SubmittedAt) noteParts.push("Submitted: " + data.SubmittedAt);
      notes = noteParts.join(" | ");
    }

    // Exact 21 columns matching the Seats_200 Google Sheet schema:
    // Col 1:  Shop
    // Col 2:  POC (Point of Contact / Name)
    // Col 3:  Email
    // Col 4:  Phone
    // Col 5:  Owner (Tom)
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
      data.Shop || data.Firm || (data.FullName + " — " + (data.Firm || "Independent")), // Shop
      data.POC || data.FullName || "",                                                   // POC
      data.Email || "",                                                                  // Email
      data.Phone || "",                                                                  // Phone
      data.Owner || "Tom",                                                               // Owner
      data.Stage || "Named",                                                             // Stage
      data.Seats_hoped || 1,                                                             // Seats_hoped
      "",                                                                                // Seats_reserved
      "",                                                                                // Seats_billed
      data.Source || "Website - " + (data.Cohort || "Alpha"),                            // Source
      "",                                                                                // Login_sent
      "",                                                                                // Slack_in
      "",                                                                                // First_file_in
      "",                                                                                // Second_file_in
      "",                                                                                // Clinic_count
      "",                                                                                // Invoice_sent
      "",                                                                                // Intros_given
      data.Next_action || "Tom text",                                                    // Next_action
      nextActionDate,                                                                    // Next_action_date
      "",                                                                                // Do_not_pitch
      notes                                                                              // Notes
    ];

    // DEDUPLICATION: Prevent identical entries from being added within recent rows
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var checkCount = Math.min(10, lastRow - 1);
      var recentValues = sheet.getRange(lastRow - checkCount + 1, 1, checkCount, 4).getValues(); // Shop, POC, Email, Phone
      var candidateEmail = (data.Email || "").toString().toLowerCase().trim();
      var candidatePoc = (data.POC || data.FullName || "").toString().toLowerCase().trim();

      for (var r = 0; r < recentValues.length; r++) {
        var existingPoc = (recentValues[r][1] || "").toString().toLowerCase().trim();
        var existingEmail = (recentValues[r][2] || "").toString().toLowerCase().trim();
        if (candidateEmail && existingEmail === candidateEmail) {
          return ContentService.createTextOutput(JSON.stringify({ result: "skipped_duplicate", reason: "Email already submitted in recent rows" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        if (candidatePoc && existingPoc === candidatePoc && !candidateEmail) {
          return ContentService.createTextOutput(JSON.stringify({ result: "skipped_duplicate", reason: "POC already submitted in recent rows" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    sheet.appendRow(row);

    // SLACK INCOMING WEBHOOK NOTIFICATION TO #inbound
    try {
      sendSlackNotification(data);
    } catch (slackErr) {
      Logger.log("Slack notification failed: " + slackErr.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success", rowAdded: row }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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

function sendSlackNotification(data) {
  var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL') || FALLBACK_SLACK_WEBHOOK;
  
  if (!webhookUrl || webhookUrl.indexOf("https://hooks.slack.com") === -1) {
    Logger.log("Slack Webhook URL not set. Skipping Slack ping.");
    return;
  }

  var shop = data.Shop || data.Firm || (data.FullName + " — " + (data.Firm || "Independent"));
  var poc = data.POC || data.FullName || "Adjuster";
  var email = data.Email || "No email";
  var phone = data.Phone || "No phone";
  var cohort = data.Cohort || "Immediate Alpha (Q4 2026)";
  var seats = data.Seats_hoped || "1";
  var files = data.OpenFilesNow || "Not specified";
  var stack = data.CurrentStack || "Not specified";
  var referral = data.Referral ? ("\n• *Referral / Know Tom:* " + data.Referral) : "";

  var slackPayload = {
    text: "🐝 *New Inbound Lead on Claim Hive:* " + shop + " (" + seats + " seats)",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🐝 New Claim Hive Lead: " + poc + " (" + shop + ")",
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
          text: "• *Next Action:* Tom text tomorrow\n• *Owner:* " + (data.Owner || "Tom") + referral
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
