# Blue Spring Live

Blue Spring Live is a decision-support tool for Blue Spring State Park in Orange City, Florida. It combines live water observations, weather, seasonal park rules, reservation context, a published manatee count feed and visitor planning into one interface.

## What it answers

- Is today worth visiting?
- During manatee season, which upcoming morning has the strongest thermal refuge signal?
- What are the live Blue Spring and St. Johns River temperatures?
- Is the river cooling or warming?
- What should I do first after I enter the park?
- What changes outside manatee season?

## Live providers

- USGS Water Data OGC API v0
  - USGS-02235500 — Blue Springs near Orange City, FL
  - USGS-02236000 — St. Johns River near DeLand, FL (current operational river-temperature proxy; SJRWMD documentation references Sanford 02234500, whose USGS water-temperature series is no longer current)
- National Weather Service API
- Blue Spring Adventures — latest published manatee count when machine-readable; the source field is labeled “Daily Manatee Count,” but the observation date is not exposed reliably
- Florida State Parks — authoritative park hours, water-season rules, reservations and visitor logistics

## Important data integrity rule

The current manatee count source does not expose a stable machine-readable observation timestamp. The UI therefore labels it as the **latest published count**, not automatically as a same-day count. If it cannot be retrieved, the app shows unavailable rather than inserting a fallback number.

The current release ranks manatee **visit opportunity** from thermal and weather conditions. It does **not** output an exact predicted census count until a consistent historical daily count series can be acquired and backtested.

## Architecture

No always-on paid server is required. The project is static HTML/CSS/JS plus two lightweight Vercel serverless endpoints:

- `/api/live` — USGS + NWS aggregation and derived thermal metrics
- `/api/manatee` — conservative published-count parser

Vercel caches API responses at the edge.

## Local verification

```bash
npm run verify
```

No npm dependencies are required.

## Deployment

Deploy the repository directly to Vercel. The included `vercel.json` supplies caching and security headers.

## Current model status

The release deliberately separates **observed data**, **forecast weather**, and **derived visit opportunity**. A fully calibrated manatee-count forecast remains gated on acquiring a defensible daily historical census series with provenance.
