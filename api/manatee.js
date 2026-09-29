const PRIMARY_URL = 'https://savethemanatee.org/bssp-manatee-reports/';
const FALLBACK_URL = 'https://bluespringadventures.com/home/';

function strip(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#038;/gi, '&')
    .replace(/&quot;|&#8220;|&#8221;/gi, '"')
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/gi, "'")
    .replace(/&deg;|&#176;/gi, '°')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCount(html) {
  const text = strip(html);
  const idx = text.toLowerCase().indexOf('daily manatee count');
  if (idx < 0) return null;
  const slice = text.slice(idx, idx + 220);
  const match = slice.match(/daily manatee count\D{0,80}(\d{1,4})\s+manatees?/i);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isFinite(count) && count >= 0 && count < 2000 ? count : null;
}

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
};

const SMALL = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

function parseNumberWords(value) {
  const clean = String(value || '').toLowerCase().replace(/-/g, ' ').replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (/^\d{1,4}$/.test(clean)) {
    const n = Number(clean);
    return n >= 0 && n < 2000 ? n : null;
  }
  let total = 0;
  let current = 0;
  let saw = false;
  for (const word of clean.split(' ')) {
    if (Object.prototype.hasOwnProperty.call(SMALL, word)) { current += SMALL[word]; saw = true; continue; }
    if (Object.prototype.hasOwnProperty.call(TENS, word)) { current += TENS[word]; saw = true; continue; }
    if (word === 'hundred') { current = Math.max(1, current) * 100; saw = true; continue; }
    if (word === 'thousand') { total += Math.max(1, current) * 1000; current = 0; saw = true; continue; }
    return null;
  }
  const n = total + current;
  return saw && n >= 0 && n < 2000 ? n : null;
}

function parseLatestReport(html) {
  const text = strip(html);
  const dateRe = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b/gi;
  const first = dateRe.exec(text);
  if (!first) return null;
  const next = dateRe.exec(text);
  const segment = text.slice(first.index, next ? next.index : Math.min(text.length, first.index + 3000));
  const observedDate = `${first[3]}-${MONTHS[first[1].toLowerCase()]}-${String(first[2]).padStart(2, '0')}`;

  const countToken = '(\\d{1,4}|(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and)(?:[- ]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and)){0,6})';
  const patterns = [
    new RegExp(`manatee count(?:\\s+\\w+){0,6}?\\s+(?:to|of|at|was|is)\\s+${countToken}\\b`, 'i'),
    new RegExp(`roll call(?:\\s+\\w+){0,6}?\\s+(?:was|is|of|at)?\\s*${countToken}\\s+manatees?\\b`, 'i'),
    new RegExp(`\\b(?:saw|counted|recorded|had)\\s+${countToken}\\s+manatees?(?:\\s+at\\s+roll\\s+call)?\\b`, 'i'),
    new RegExp(`\\b${countToken}\\s+manatees?\\s+(?:at|for)\\s+roll\\s+call\\b`, 'i')
  ];

  let count = null;
  for (const pattern of patterns) {
    const m = segment.match(pattern);
    if (!m) continue;
    count = parseNumberWords(m[1]);
    if (count != null) break;
  }

  const tempMatch = segment.match(/\b(\d{2,3}(?:\.\d+)?)\s*°?\s*F\b/i);
  const riverTemperatureF = tempMatch ? Number(tempMatch[1]) : null;

  return {
    observedDate,
    count,
    riverTemperatureF: Number.isFinite(riverTemperatureF) ? riverTemperatureF : null
  };
}

function floridaSeason(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(date);
  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);
  const active = (month === 11 && day >= 15) || month === 12 || month <= 3;
  const seasonYear = month <= 3 ? year - 1 : year;
  return {
    active,
    label: active ? 'manatee-season' : 'off-season',
    start: `${seasonYear}-11-15`,
    end: `${seasonYear + 1}-03-31`
  };
}

function floridaToday(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  return `${p.find(x => x.type === 'year')?.value}-${p.find(x => x.type === 'month')?.value}-${p.find(x => x.type === 'day')?.value}`;
}

function dateAgeDays(isoDate, today = floridaToday()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ''))) return null;
  const a = Date.parse(`${today}T12:00:00Z`);
  const b = Date.parse(`${isoDate}T12:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((a - b) / 86400000)) : null;
}

async function fetchText(url) {
  const upstream = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BlueSpringLive/1.0; +https://chrisizworski.com)',
      'Accept': 'text/html,application/xhtml+xml'
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!upstream.ok) throw new Error(`${new URL(url).hostname} ${upstream.status}`);
  return { html: await upstream.text(), lastModified: upstream.headers.get('last-modified') };
}

async function primaryObservation(season) {
  const { html, lastModified } = await fetchText(PRIMARY_URL);
  const report = parseLatestReport(html);
  if (!report?.observedDate) throw new Error('Save the Manatee report date not found');
  const sameSeason = report.observedDate >= season.start && report.observedDate <= season.end;
  const ageDays = dateAgeDays(report.observedDate);
  const count = season.active && sameSeason ? report.count : null;
  let freshness = 'off-season';
  if (season.active && sameSeason) {
    freshness = count == null ? 'dated-no-count' : ageDays <= 1 ? 'dated-current' : ageDays <= 7 ? 'dated-recent' : 'dated-stale';
  }
  return {
    count,
    source: 'Save the Manatee Club',
    sourceUrl: PRIMARY_URL,
    observedAt: null,
    observedDate: count != null ? report.observedDate : null,
    sourceLastModified: lastModified,
    retrievedAt: new Date().toISOString(),
    season,
    freshness,
    latestReport: {
      observedDate: report.observedDate,
      count: report.count,
      riverTemperatureF: report.riverTemperatureF,
      ageDays
    },
    note: season.active && sameSeason
      ? count == null
        ? `Save the Manatee Club published a dated Blue Spring report for ${report.observedDate}, but no roll-call count was parsed from that entry.`
        : `Dated morning roll call from Save the Manatee Club for ${report.observedDate}. This is a published field observation, not a live census.`
      : `The latest dated Save the Manatee Club report is ${report.observedDate}. Current manatee refuge season runs ${season.start} through ${season.end}, so an older-season count is not presented as current.`
  };
}

async function fallbackObservation(season, primaryError) {
  try {
    const { html, lastModified } = await fetchText(FALLBACK_URL);
    const publishedCount = parseCount(html);
    const count = season.active ? publishedCount : null;
    return {
      count,
      source: 'Blue Spring Adventures',
      sourceUrl: FALLBACK_URL,
      observedAt: null,
      observedDate: null,
      sourceLastModified: lastModified,
      retrievedAt: new Date().toISOString(),
      season,
      freshness: !season.active ? 'off-season' : count == null ? 'unavailable' : 'published-undated-fallback',
      latestReport: null,
      note: !season.active
        ? 'Manatee refuge season is November 15 through March 31; no off-season count is presented.'
        : count == null
          ? 'The primary dated roll-call source and fallback published count are unavailable.'
          : 'Primary dated Save the Manatee Club roll call was unavailable, so this is a fallback published count without a reliable observation date.',
      primaryError: String(primaryError?.message || primaryError || '')
    };
  } catch (fallbackError) {
    return {
      count: null,
      source: 'Save the Manatee Club',
      sourceUrl: PRIMARY_URL,
      observedAt: null,
      observedDate: null,
      retrievedAt: new Date().toISOString(),
      season,
      freshness: season.active ? 'unavailable' : 'off-season',
      latestReport: null,
      note: season.active
        ? 'The dated Blue Spring roll-call source is temporarily unavailable.'
        : 'Manatee refuge season is November 15 through March 31; no off-season count is presented.',
      primaryError: String(primaryError?.message || primaryError || ''),
      fallbackError: String(fallbackError?.message || fallbackError || '')
    };
  }
}

module.exports = async function handler(req, res) {
  const season = floridaSeason();
  let payload;
  try {
    payload = await primaryObservation(season);
  } catch (error) {
    payload = await fallbackObservation(season, error);
  }
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.status(200).json(payload);
};

module.exports.parseCount = parseCount;
module.exports.parseLatestReport = parseLatestReport;
module.exports.parseNumberWords = parseNumberWords;
module.exports.floridaSeason = floridaSeason;
module.exports.dateAgeDays = dateAgeDays;
