# Imoturbo

Imoturbo is a Chrome-compatible Manifest V3 extension plus a lightweight Node.js backend for Bulgarian real-estate buyer intelligence. The MVP supports `imot.bg`, avoids databases entirely, and stores user history only in browser local storage.

## What It Does

- Detects supported imot.bg apartment listing pages.
- Extracts listing URL, title, price, currency, square meters, floor, district text, description, photos, and seller hints.
- Sends listing text to a small backend for pricing, red-flag, and offer analysis.
- Compares price against ZnamCenite-derived 2025 Sofia neighborhood averages in `backend/src/config/pricing.json`.
- Flags local duplicates and stale listings from browser storage history.
- Shows a polished right sidebar with score, fair range, pricing delta, red flags, good signs, bullshit warnings, and offer strategy.

## Architecture

```text
Chrome Extension
  -> Backend POST /analyze
  -> Price truth + rule-based checks + optional OpenAI text analysis
  -> Extension enriches with local duplicate/stale history
  -> Imoturbo sidebar
```

No database is used. The backend only uses an in-memory TTL cache and a local JSON pricing config file.

## Setup

```bash
npm install
cp backend/.env.example backend/.env
npm run build
```

OpenAI is optional. Without `OPENAI_API_KEY`, the backend uses deterministic rules. With `OPENAI_API_KEY`, it asks the model to improve text-derived warnings and offer language, while keeping pricing deterministic.

## Development

Backend:

```bash
npm run dev:backend
```

Extension:

```bash
npm run dev:extension
```

The default backend URL used by the extension is `http://localhost:8787`. You can change it from the popup settings.

## Load Extension In Chrome

1. Build the extension with `npm --workspace extension run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose "Load unpacked".
5. Select `extension/dist`.

## Backend Endpoints

`GET /health`

Returns:

```json
{ "status": "ok" }
```

`POST /analyze`

Accepts listing data and returns structured analysis:

```json
{
  "score": 74,
  "asking_price": 259000,
  "currency": "EUR",
  "fair_range": {
    "min": 232000,
    "max": 245000
  },
  "status": "Likely overpriced (+7%)",
  "price_truth": {
    "district": "Lozenets",
    "eur_per_sqm": 2600,
    "fair_min": 2250,
    "fair_max": 2380,
    "overpriced_pct": 7,
    "confidence": 0.88
  },
  "red_flags": ["No obvious exterior photos"],
  "good_signs": ["South-facing", "Near metro"],
  "bullshit_warnings": ["\"Near metro\" may still mean a 12+ minute walk"],
  "offer_strategy": "Try €238,000 first",
  "stale_listing": {
    "visits": 1,
    "days_seen": 0,
    "message": "First time seen in this browser",
    "likely_negotiable": false
  },
  "duplicate_signal": {
    "is_duplicate": false,
    "confidence": 0,
    "matches": []
  },
  "duplicate_flag": false
}
```

## Docker

```bash
docker build -t imoturbo-backend ./backend
docker run --env-file backend/.env -p 8787:8787 imoturbo-backend
```

## Notes

- No PostgreSQL, MongoDB, Prisma, ORM, user accounts, or remote persistence.
- Pricing ranges are intentionally hardcoded in `backend/src/config/pricing.json`.
- The backend caches analyses in memory for 24 hours using `hash(url + price + sqm)`.
- Photon/Nominatim address checks were removed from the MVP.
