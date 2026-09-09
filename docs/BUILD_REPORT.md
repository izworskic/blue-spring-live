# Blue Spring Live — Build Report

Date: 2026-09-09

## Build status

The application is implemented as a Vercel-compatible static front end plus Node serverless API routes.

### Implemented
- Seasonal state machine: manatee season vs. water-activity season
- Live Blue Spring and St. Johns River water temperatures from the USGS Water Data OGC API
- Live USGS discharge observations
- 48-hour water-temperature history and thermal refuge differential
- River cooling trend, hours below 68°F/64°F and accumulated cold-pressure metric
- NWS hourly/daily forecast integration
- Seven-day visit-opportunity ranking
- Explicit next-48-hour condition-shift / cold-front signal
- Confidence scoring and stale-source degradation
- Conservatively parsed latest published manatee count from Blue Spring Adventures
- Reservation requirement and official outbound action
- Persona-aware arrival planner
- Interactive visitor schematic for major park stops
- Live-camera outbound surface
- SEO metadata + structured data + FAQ content
- Mobile responsive UI and keyboard-friendly controls
- Source/provenance panel and explicit model limitations

## Integrity decisions

The first release intentionally does **not** publish exact next-day manatee-count predictions. A sufficiently consistent daily historical census series has not yet been acquired and backtested. The seven-day ranking is therefore labeled as a **visit-opportunity outlook**, not a census forecast.

The Blue Spring Adventures count source exposes a current published number but does not expose a stable machine-readable observation timestamp. The interface labels that count conservatively rather than claiming it is today's verified count.

Reservation availability is not fabricated. The product states the reservation requirement and links to the official system.

## Verification

- JavaScript syntax checks: PASS
- Node regression tests: 5/5 PASS
- HTML parser: PASS
- Fragment-link integrity: PASS
- Duplicate HTML IDs: none
- External target links missing `rel=noopener`: none
- Florida season boundary regression: PASS

## Current release score

| Category | Available | Score |
|---|---:|---:|
| Decision Quality | 20 | 18 |
| Manatee Intelligence | 15 | 12 |
| Data Integrity | 15 | 15 |
| Arrival Utility | 10 | 9 |
| Mobile UX | 10 | 9 |
| Live Reliability | 10 | 8 |
| Visual / Interactive Quality | 8 | 7 |
| Repeat Value | 5 | 4 |
| SEO / Structured Content | 4 | 4 |
| Performance / Accessibility | 3 | 3 |
| **Total** | **100** | **89** |

The score is intentionally below the 92 release target because the exact count forecast is not backtested and the production deployment has not yet been independently smoke-tested through the Vercel read-side connector.

## Next evidence gate for 92+

Acquire a consistent daily winter count series with dates, source/method provenance and enough seasons for train/test splits. Backtest persistence, temperature-only and full thermal/weather models. Only after the full model beats the naive baselines should the interface expose count ranges such as “expected 500–650.”
