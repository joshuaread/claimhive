# Claim Hive — Public Adjuster Operating System

A professional, shippable, multi-page website and design system crafted for **Claim Hive** to reach burned-out USA-based licensed Public Insurance Adjusters (PAs), establish immediate trust, and provide the operational backbone to eliminate administrative chaos and safely scale caseloads.

---

## 🐝 Live Multi-Page Website Architecture

All pages follow the unhurried, spacious aesthetic of modern civic platforms (e.g. America.gov) paired with editorial typography (Merriweather Bold, Plus Jakarta Sans, Inter, JetBrains Mono):

| Page | File | Purpose & Highlights |
| :--- | :--- | :--- |
| **Home** | [`index.html`](file:///Users/josh/Projects/ClaimHive/Website/index.html) | Value prop, radical **$80/seat** pricing above the fold, 4 adjuster bottlenecks concierge, Josh Read's quote, 5-stage preview, Alpha & January CTAs. |
| **Product** | [`product.html`](file:///Users/josh/Projects/ClaimHive/Website/product.html) | Honest UI walkthrough of the 5 linear claim stages: Intake & Docketing, Evidence & Scoping, Estimate & Gaps, Letters & Demands, and the Next Action Engine. |
| **Pricing** | [`pricing.html`](file:///Users/josh/Projects/ClaimHive/Website/pricing.html) | **$80/seat/month flat**. Policyholders & external engineers 100% free forever. Founding rate locked through June 30, 2027. Zero per-claim fees, no cuts of fee settlements, comparison table & FAQ. |
| **Security & Trust** | [`security.html`](file:///Users/josh/Projects/ClaimHive/Website/security.html) | Institutional confidentiality: US-based SOC-2 vault, AES-256 KMS encryption, **Zero AI Training on Customer Claim Files**, 1-click full data export, and direct founder escalation. |
| **About Us** | [`about.html`](file:///Users/josh/Projects/ClaimHive/Website/about.html) | Josh Read's founder letter, catastrophe track record, and profiles for Tim, Jon, and Josh. |
| **Request Access** | [`request.html`](file:///Users/josh/Projects/ClaimHive/Website/request.html) | Frictionless intake application for Founding Cohorts (Alpha Q4 2026 vs. January 2027) wired to `Seats_200` Google Sheet schema, spam honeypot trap, and instant confirmation screen. |
| **Privacy Policy** | [`privacy.html`](file:///Users/josh/Projects/ClaimHive/Website/privacy.html) | Plain-English privacy covenants, explicit work-product privilege protection, zero commercialization of claim data, and DoD-grade data sanitization. |
| **Terms of Service** | [`terms.html`](file:///Users/josh/Projects/ClaimHive/Website/terms.html) | Fair B2B SaaS agreement: month-to-month flexibility, $80 founding price guarantee, 100% adjuster data ownership, 99.9% catastrophe SLA, and 30-day money-back guarantee. |
| **Design System** | [`design-system.html`](file:///Users/josh/Projects/ClaimHive/Website/design-system.html) | Living style guide, token dictionary, clickable token copy, and interactive Public Adjuster ROI & Capacity Calculator. |

---

## 💎 Brand Identity & Vector Assets

Reconstructed from official brand mark geometry with sub-pixel CAD accuracy:
- **`assets/claim-hive-icon.svg`**: Standalone Honey Gold (`#DAA94F`) hive circuit mark (12 capsules, 4 seamless concave flared bridges with $R=12$ curvature, matching original geometry).
- **`assets/claim-hive-text.svg`**: Wordmark with true Helvetica Bold glyphs and Midnight Navy (`#161B33`) 4-point AI sparkle star (`✦`) over the *i*.
- **`assets/claim-hive-full.svg`**: Signature stacked brand lockup.
- **`assets/claim-hive-horizontal.svg`**: Header navigation lockup.

---

## 📋 Intake Pipeline & Google Sheet Integration (`Seats_200`)

The intake form in [`request.html`](file:///Users/josh/Projects/ClaimHive/Website/request.html) is managed by [`js/request-form.js`](file:///Users/josh/Projects/ClaimHive/Website/js/request-form.js) and routes directly into the founding subscriber sheet schema (`Zero to One to 200 Subscribers`):

```
Form Submission
   │
   ├── 1. Honeypot check (#hp_website_url) & placeholder validation
   ├── 2. Mapping to Seats_200 schema:
   │      - Shop: "{FullName} — {FirmName}"
   │      - Email: work email (lowercase)
   │      - Phone: formatted phone string
   │      - Owner: "Josh" (if Josh mentioned) else "Unassigned"
   │      - Stage: "Named"
   │      - Seats_hoped: integer count
   │      - Source: "Josh book" (if Josh mentioned) else "Waitlist"
   │      - Next_action: "Josh text"
   │      - Next_action_date: tomorrow
   ├── 3. Webhook dispatch (Zapier / Make / Apps Script) or local audit storage
   └── 4. Immediate confirmation UI displaying personalized routing note
```

---

## 🚀 Quick Start & Local Preview

Serve the directory locally using any lightweight HTTP server:

```bash
# Using Python
python3 -m http.server 3000

# Open in browser:
# http://localhost:3000/
# http://localhost:3000/product.html
# http://localhost:3000/pricing.html
# http://localhost:3000/security.html
# http://localhost:3000/about.html
# http://localhost:3000/request.html
```

---

## 🛡️ Core Promises to USA Public Adjusters

1. **Flat $80/Seat/Month**: No tiers, no percentage of your settlement fees, and no per-claim toll booths.
2. **Policyholders Always 100% Free**: Unlimited client portal access so insureds stay informed without calling you 10 times a week.
3. **Founding Lock Through June 30, 2027**: Zero price hikes for our first 200 founding firms.
4. **Zero AI Training on Claim Files**: Your estimates, photos, and legal strategies remain privileged work product.
5. **Direct Line to Josh Read**: Call or text **(850) 400-HIVE**.
