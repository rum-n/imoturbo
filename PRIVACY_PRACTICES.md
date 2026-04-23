# Chrome Web Store - Privacy Practices & Permission Justifications

## Privacy & Permissions Tab - Required Justifications

---

## 1. activeTab Permission

**Justification:**

The `activeTab` permission is required to detect when a user navigates to an imot.bg apartment listing page. This allows Imoturbo to:

- Recognize imot.bg listing URLs to display the analysis button
- Extract listing information (title, price, square meters, photos) from the page structure
- Determine when the extension should be active

**User Benefit:** Without this permission, the extension cannot identify which pages are apartment listings, making it unable to provide its core functionality.

**Data Handling:** The extension only reads page metadata and DOM elements. No personal data is collected from the activeTab.

---

## 2. Host Permission (`http://localhost:8787/*`, `https://*.imot.bg/*`, `http://*.imot.bg/*`)

**Justification:**

Host permissions are required for two purposes:

**imot.bg Host Permissions:**
- Inject content scripts to display the analysis sidebar on listing pages
- Extract listing details (price, area, description, photos)
- Send listing data to the analysis backend for intelligent scoring

**localhost:8787 (Optional Development):**
- Allow communication with a local backend server during development and self-hosting
- Support advanced analysis features that require server-side processing
- Enable AI-powered analysis of listing text and image content

**User Benefit:** These permissions enable the extension to function on imot.bg and provide real-time buyer intelligence analysis.

**Data Handling:**
- Listing data is sent only to analyze and score the property
- Data is not stored permanently on external servers
- Users can run the backend locally to keep all data private

---

## 3. Remote Code Permission / AI Analysis

**Justification:**

Imoturbo uses OpenAI's API (optional) for enhanced natural language analysis of:
- Listing descriptions to detect marketing language
- Photo analysis to assess listing quality
- Price reasonableness recommendations

This is necessary because:
- Automated analysis of listings improves accuracy
- AI can detect subtle red flags (exaggerated claims, vague wording)
- Natural language processing provides better insights than rules alone

**User Benefit:** Enables more accurate, intelligent analysis of complex listing data that would be difficult with simple rule-based logic alone.

**Data Handling:**
- Users can disable AI analysis and use rule-based analysis only
- OpenAI API calls are optional and can be configured per user preference
- No personal data is sent to OpenAI; only listing information is analyzed
- OpenAI's privacy policy applies to API requests: https://openai.com/privacy

**Transparency:** The extension clearly indicates whether AI-powered analysis is being used.

---

## 4. Scripting Permission

**Justification:**

The `scripting` permission is required to:

- Inject the analysis sidebar React component into imot.bg pages
- Execute content scripts that extract listing information from the page DOM
- Display the "⚡ Анализирай с Imoturbo" button on listing pages
- Render the buyer intelligence UI directly in the browser

**User Benefit:** Without scripting, the extension cannot display its analysis interface or interact with imot.bg pages in real-time.

**Data Handling:**
- Scripts only read and display information; they do not capture user input
- No keystroke logging or sensitive data collection
- All injected code is part of the extension bundle and does not load external scripts

---

## 5. Storage Permission

**Justification:**

The `storage` permission is required to:

- Store user preferences and settings locally (backend URL, analysis preferences)
- Maintain a local history of analyzed listings for duplicate detection
- Track when listings were previously seen to estimate staleness
- Cache analysis results to avoid re-analyzing the same listing

**User Benefit:** 
- Enables duplicate listing detection (comparing current listing to history)
- Provides stale listing scoring (days since first seen)
- Improves performance by caching results

**Data Handling:**
- All data is stored **locally in the browser** using Chrome's `chrome.storage.local` API
- No data is sent to external servers for storage
- Users can clear history at any time via the extension popup
- Data is deleted if the extension is uninstalled
- Maximum 25 listing entries are retained to minimize storage use

---

## Summary Table

| Permission | Purpose | Data Collected | User Control |
|-----------|---------|-----------------|--------------|
| activeTab | Detect listing pages | None | Always on |
| Host (imot.bg) | Inject sidebar, extract data | Listing info only | Always on |
| Host (localhost) | Backend communication | Optional, user-controlled | Optional |
| Scripting | Display UI components | None | Always on |
| Storage | Local history, caching | Listings viewed (local only) | Can clear anytime |
| Remote Code (OpenAI) | AI-powered analysis | Listing text/photos | Optional, user configurable |

---

## Data Privacy Statement

**What data Imoturbo collects:**
- Apartment listing information (title, price, area, description, photos) - from the imot.bg page
- Your analysis history - stored locally in your browser only

**What data Imoturbo does NOT collect:**
- Personal information (name, email, phone)
- Your browsing history outside of imot.bg
- Keystroke or mouse movement data
- Payment or financial information
- Cookie data or tracking identifiers

**Where data is stored:**
- **Locally in your browser** (Chrome Storage API)
- **Optionally on a user-operated backend server** if you self-host the analysis service
- **Never on Imoturbo servers** (Imoturbo does not operate data servers)

**Third-party services:**
- OpenAI API (optional, for enhanced AI analysis) - governed by OpenAI's privacy policy
- Analytics (none currently)
- Advertising (none)

**Data deletion:**
- Users can clear all local history in the extension popup
- All data is deleted if the extension is uninstalled
- No backup copies are kept anywhere

---

## Security & Code Practices

- ✓ No tracking code or analytics
- ✓ No ads or malware
- ✓ No password or sensitive data collection
- ✓ No external script injection (all code is bundled)
- ✓ Minimal permissions (only what's needed)
- ✓ Open source codebase (available on GitHub)
- ✓ Regular security updates

---

## User Choices & Transparency

**Users can:**
- Disable AI analysis and use rule-based analysis only
- Clear analysis history at any time
- Choose a custom backend server URL
- Uninstall the extension to delete all local data
- Review this privacy policy in the extension details page

**We commit to:**
- Being transparent about data collection
- Respecting user privacy by default
- Not selling or sharing user data
- Responding to privacy concerns within 30 days
