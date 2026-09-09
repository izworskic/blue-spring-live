const SPRING_SITE = 'USGS-02235500';
const RIVER_SITE = 'USGS-02236000';
const TEMP_CODE = '00010';
const DISCHARGE_CODE = '00060';
const LAT = 28.9489;
const LON = -81.3400;

const USGS_BASE = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections';

async function fetchJson(url, headers = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': 'BlueSpringLive/1.0 (+https://chrisizworski.com)', ...headers } });
  if (!r.ok) throw new Error(`${new URL(url).hostname} ${r.status}`);
  return r.json();
}

function featureValue(fc, parameterCode) {
  const feature = (fc?.features || []).find(f => f?.properties?.parameter_code === parameterCode) || fc?.features?.[0];
  if (!feature) return null;
  const p = feature.properties || {};
  const value = Number(p.value);
  return {
    value: Number.isFinite(value) ? value : null,
    unit: p.unit_of_measure || null,
    time: p.time || null,
    approval: p.approval_status || null,
    lastModified: p.last_modified || null
  };
}

function cToF(c) { return c == null ? null : c * 9 / 5 + 32; }

async function latestUSGS(site, parameterCode) {
  const url = new URL(`${USGS_BASE}/latest-continuous/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('lang', 'en-US');
  url.searchParams.set('monitoring_location_id', site);
  url.searchParams.set('parameter_code', parameterCode);
  url.searchParams.set('properties', 'monitoring_location_id,parameter_code,value,time,unit_of_measure,approval_status,last_modified');
  url.searchParams.set('limit', '100');
  const json = await fetchJson(url.toString());
  return featureValue(json, parameterCode);
}

async function historyUSGS(site, parameterCode, duration = 'P2D') {
  const url = new URL(`${USGS_BASE}/continuous/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('lang', 'en-US');
  url.searchParams.set('monitoring_location_id', site);
  url.searchParams.set('parameter_code', parameterCode);
  url.searchParams.set('properties', 'value,time,parameter_code');
  url.searchParams.set('time', duration);
  url.searchParams.set('skipGeometry', 'TRUE');
  url.searchParams.set('limit', '5000');
  const json = await fetchJson(url.toString());
  return (json.features || []).map(f => ({
    time: f.properties?.time,
    value: Number(f.properties?.value)
  })).filter(x => x.time && Number.isFinite(x.value)).sort((a,b) => new Date(a.time)-new Date(b.time));
}

function delta(history, hours) {
  if (!history?.length) return null;
  const latest = history[history.length - 1];
  const target = new Date(latest.time).getTime() - hours * 3600000;
  let closest = history[0];
  for (const row of history) {
    if (Math.abs(new Date(row.time).getTime() - target) < Math.abs(new Date(closest.time).getTime() - target)) closest = row;
  }
  return latest.value - closest.value;
}

function hoursBelow(history, thresholdC, windowHours = 24) {
  if (!history?.length) return null;
  const end = new Date(history[history.length - 1].time).getTime();
  const start = end - windowHours * 3600000;
  const rows = history.filter(r => new Date(r.time).getTime() >= start);
  if (rows.length < 2) return 0;
  let hours = 0;
  for (let i = 1; i < rows.length; i++) {
    const dt = (new Date(rows[i].time) - new Date(rows[i-1].time)) / 3600000;
    const avg = (rows[i].value + rows[i-1].value) / 2;
    if (avg < thresholdC) hours += Math.max(0, Math.min(dt, 1));
  }
  return Math.round(hours * 10) / 10;
}

function coldIntegral(history, thresholdC = 20, windowHours = 24) {
  if (!history?.length) return null;
  const end = new Date(history[history.length - 1].time).getTime();
  const start = end - windowHours * 3600000;
  const rows = history.filter(r => new Date(r.time).getTime() >= start);
  let integral = 0;
  for (let i = 1; i < rows.length; i++) {
    const dt = Math.max(0, Math.min((new Date(rows[i].time) - new Date(rows[i-1].time)) / 3600000, 1));
    const avg = (rows[i].value + rows[i-1].value) / 2;
    integral += Math.max(0, thresholdC - avg) * dt;
  }
  return Math.round(integral * 10) / 10;
}

async function nws() {
  const point = await fetchJson(`https://api.weather.gov/points/${LAT},${LON}`, { 'Accept': 'application/geo+json' });
  const hourlyUrl = point?.properties?.forecastHourly;
  const dailyUrl = point?.properties?.forecast;
  const [hourly, daily] = await Promise.all([
    fetchJson(hourlyUrl, { 'Accept': 'application/geo+json' }),
    fetchJson(dailyUrl, { 'Accept': 'application/geo+json' })
  ]);
  return {
    hourly: (hourly?.properties?.periods || []).slice(0, 48).map(p => ({
      startTime: p.startTime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      shortForecast: p.shortForecast,
      precipitationProbability: p.probabilityOfPrecipitation?.value ?? null,
      relativeHumidity: p.relativeHumidity?.value ?? null,
      isDaytime: p.isDaytime
    })),
    daily: (daily?.properties?.periods || []).slice(0, 14).map(p => ({
      name: p.name,
      startTime: p.startTime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      shortForecast: p.shortForecast,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      isDaytime: p.isDaytime,
      precipitationProbability: p.probabilityOfPrecipitation?.value ?? null
    })),
    generatedAt: hourly?.properties?.generatedAt || daily?.properties?.generatedAt || null,
    office: point?.properties?.gridId || null
  };
}

function isManateeSeason(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const d = Number(parts.find(p => p.type === 'day')?.value);
  return (m === 11 && d >= 15) || m === 12 || m <= 3;
}

function fallbackPayload(error) {
  return {
    ok: false,
    retrievedAt: new Date().toISOString(),
    season: isManateeSeason() ? 'manatee' : 'water-activity',
    error: String(error?.message || error)
  };
}

module.exports = async function handler(req, res) {
  try {
    const [springTemp, riverTemp, springFlow, riverFlow, springHist, riverHist, weather] = await Promise.all([
      latestUSGS(SPRING_SITE, TEMP_CODE), latestUSGS(RIVER_SITE, TEMP_CODE),
      latestUSGS(SPRING_SITE, DISCHARGE_CODE), latestUSGS(RIVER_SITE, DISCHARGE_CODE),
      historyUSGS(SPRING_SITE, TEMP_CODE), historyUSGS(RIVER_SITE, TEMP_CODE), nws()
    ]);

    const springF = cToF(springTemp?.value);
    const riverF = cToF(riverTemp?.value);
    const refugeDelta = springF != null && riverF != null ? springF - riverF : null;

    const payload = {
      ok: true,
      retrievedAt: new Date().toISOString(),
      season: isManateeSeason() ? 'manatee' : 'water-activity',
      water: {
        spring: {
          site: SPRING_SITE,
          temperatureF: springF,
          temperatureC: springTemp?.value ?? null,
          observedAt: springTemp?.time ?? null,
          dischargeCfs: springFlow?.value ?? null,
          dischargeObservedAt: springFlow?.time ?? null,
          sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-02235500/'
        },
        river: {
          site: RIVER_SITE,
          temperatureF: riverF,
          temperatureC: riverTemp?.value ?? null,
          observedAt: riverTemp?.time ?? null,
          dischargeCfs: riverFlow?.value ?? null,
          dischargeObservedAt: riverFlow?.time ?? null,
          sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-02236000/'
        },
        refugeDeltaF: refugeDelta,
        riverTrend6hF: delta(riverHist, 6) == null ? null : delta(riverHist, 6) * 9 / 5,
        riverTrend24hF: delta(riverHist, 24) == null ? null : delta(riverHist, 24) * 9 / 5,
        hoursRiverBelow68F24h: hoursBelow(riverHist, 20, 24),
        hoursRiverBelow64F24h: hoursBelow(riverHist, 17.7778, 24),
        coldIntegral24hCHours: coldIntegral(riverHist, 20, 24),
        history: {
          spring: springHist.slice(-192).map(x => ({time:x.time, temperatureF:cToF(x.value)})),
          river: riverHist.slice(-192).map(x => ({time:x.time, temperatureF:cToF(x.value)}))
        }
      },
      weather,
      sources: {
        usgs: 'USGS Water Data OGC API v0',
        nws: 'National Weather Service API'
      }
    };
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.status(200).json(payload);
  } catch (error) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json(fallbackPayload(error));
  }
};

module.exports._test = { delta, hoursBelow, coldIntegral, cToF, isManateeSeason };
