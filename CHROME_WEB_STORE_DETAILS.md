# Chrome Web Store Publishing Details

## Extension Information

**Name:** Imoturbo

**Version:** 0.1.0

**Short Description (132 characters max):**
Покупателска интелигентност за български апартаментни обяви на imot.bg.

**English Translation:**
Buyer intelligence for Bulgarian apartment listings on imot.bg.

---

## Single Purpose (REQUIRED)

**Primary Purpose:**
Analyze apartment listings on imot.bg to provide Bulgarian buyers with instant intelligence about pricing, red flags, good signs, and offer strategies.

**Detailed Single Purpose Statement:**
Imoturbo is a single-purpose extension designed to enhance the apartment buying experience on imot.bg by automatically analyzing listings when opened and displaying:
- Fair pricing analysis based on district averages
- Overpricing/underpricing assessment
- Red flags (poor photos, vague location, suspicious wording)
- Good signs (south-facing, metro proximity, renovated)
- Realistic offer recommendations
- Duplicate listing detection

The extension serves one clear user need: **help Bulgarian apartment buyers make informed decisions by providing instant, data-driven analysis of imot.bg listings.**

---

## Full Description (for Chrome Web Store)

Imoturbo is a buyer intelligence extension for Bulgarian real estate listings on imot.bg. When you open an apartment listing, Imoturbo instantly analyzes it and answers:

✓ **Is it overpriced?** Compares against 2025 district averages to show pricing delta
✓ **What's a realistic offer?** Suggests opening offer based on fair pricing range
✓ **Any red flags?** Detects missing photos, vague locations, suspicious wording
✓ **Good signs?** Highlights south-facing aspects, metro proximity, renovations
✓ **Is it a duplicate?** Flags listings seen before in your browser

### How It Works

1. Navigate to any apartment listing on imot.bg
2. Click the "⚡ Анализирай с Imoturbo" button in the bottom-right
3. View your personalized buyer intelligence in a clean sidebar:
   - Imoturbo score (0-100)
   - Fair pricing range vs. asking price
   - Red flags and good signs
   - Suggested offer strategy

### Features

- **Fair Range Calculation:** Based on 2025 district averages for Sofia neighborhoods
- **Bullshit Detector:** Identifies exaggerated marketing language ("luxury," "unique," "investment opportunity")
- **Local History:** Tracks listings you've seen in your browser
- **Duplicate Detection:** Alerts to similar listings under different prices
- **Stale Listing Score:** Estimates how long a listing may have been listed
- **Offer Strategy:** Suggests realistic opening offers

### Privacy & Data

- No account required
- All data stored locally in your browser
- No listings or data sent to third parties
- Analysis powered by AI and rule-based logic

### Supported Sites

Currently: imot.bg (Bulgarian real estate listings)

### Disclaimer

Imoturbo provides analysis based on available data and market averages. Always verify information independently and consult with real estate professionals before making offers.

---

## Permissions Justification

- **storage:** Store listing history and user preferences locally
- **activeTab:** Detect imot.bg listing pages
- **scripting:** Inject analysis sidebar on imot.bg pages
- **Host permissions (imot.bg, localhost):** Inject content scripts and communicate with backend

---

## Category

**Category:** Productivity

**Suggested Tags:** real estate, bulgarian, apartment, buyer, pricing, analysis

---

## Screenshots & Assets

### Required Screenshots

1. **Screenshot 1:** Sidebar on active listing with Imoturbo score
   - Shows: Score badge, pricing analysis, fair range comparison
   
2. **Screenshot 2:** Red flags and good signs sections expanded
   - Shows: Detailed intelligence points

3. **Screenshot 3:** Offer strategy section with recent analyses popup
   - Shows: Suggested offer and history

---

## Support & Contact

- **Support Email:** [To be added]
- **Website:** [To be added]
- **Privacy Policy:** [To be added]
- **Terms of Service:** [To be added]

---

## Technical Details

- **Manifest Version:** 3
- **Supported Browsers:** Chrome 88+
- **Backend:** Node.js (optional, for enhanced analysis)
- **Languages:** Bulgarian (BG) with Bulgarian UI throughout

---

## Compliance Checklist

- [x] Single, clear purpose
- [x] Permissions justified and minimal
- [x] No misleading descriptions
- [x] Works on imot.bg listing pages only
- [x] No data collection without consent
- [x] Proper error handling
- [x] Icons provided (16x16, 48x48, 128x128)
- [x] Manifest properly configured
