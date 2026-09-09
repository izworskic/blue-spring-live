# Blue Spring Live — Research and source contracts

## Live hydrology
- USGS 02235500 — Blue Springs near Orange City, Florida
- USGS 02236000 — St. Johns River near DeLand, Florida. This is the current operational river-temperature proxy. SJRWMD monitoring documentation references Sanford 02234500, but the USGS temperature series at that station ended in 2016, so it cannot support current live temperature intelligence.
- Implementation uses the modern Water Data OGC API (`api.waterdata.usgs.gov`) rather than hard-wiring the legacy WaterServices interface.
- Temperature parameter: 00010
- Discharge parameter: 00060

## Forecast weather
- National Weather Service API at `api.weather.gov`
- Point forecast near Blue Spring State Park
- Hourly temperature, rain probability, wind, humidity and forecast text are used.

## Manatee observations
- Blue Spring Adventures publishes a field labeled “Daily Manatee Count” on its Blue Spring State Park page. Current SJRWMD monitoring documentation describes count surveys as typically 3–5 mornings per week between November and March, usually 8–10 a.m.; the web field therefore must not be interpreted as proof of a same-day survey.
- The page does not currently expose a stable observation timestamp in the machine-readable content, so the provider marks it `published-undated`.
- The UI never silently merges count series from different organizations or methods.

## Park/access
- Florida State Parks is the authoritative source for hours, seasonal water activity rules, reservation requirements and closures.
- Day-use reservations became required in July 2026.
- Water activities are normally open April 1–November 14 and closed during manatee refuge season, subject to park conditions.

## Biological interpretation
- Blue Spring is a warm-water refuge. The application treats ~68°F as biological context rather than a binary switch.
- Primary derived signal: Blue Spring temperature minus St. Johns River temperature.
- Secondary signals: river cooling rate, duration below cold thresholds, accumulated cold exposure and overnight air-temperature forcing.

## Modeling policy
The first release ranks visit opportunity. It does not claim a statistically validated exact count forecast until a consistent historical daily count data set is obtained and benchmarked.
