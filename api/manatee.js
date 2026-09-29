const SOURCE_URL = 'https://bluespringadventures.com/home/';

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ');
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

function floridaSeason(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric'
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

module.exports = async function handler(req, res) {
  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'BlueSpringLive/1.0 (+https://chrisizworski.com)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const html = await upstream.text();
    const publishedCount = parseCount(html);
    const season = floridaSeason();
    const count = season.active ? publishedCount : null;
    const lastModified = upstream.headers.get('last-modified');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({
      count,
      source: 'Blue Spring Adventures',
      sourceUrl: SOURCE_URL,
      observedAt: null,
      sourceLastModified: lastModified,
      retrievedAt: new Date().toISOString(),
      season,
      freshness: !season.active ? 'off-season' : count == null ? 'unavailable' : 'published-undated',
      note: !season.active
        ? 'Manatee refuge season is November 15 through March 31. The source can retain an undated count outside that window, so Blue Spring Live suppresses it rather than present a stale number as current.'
        : count == null
          ? 'No machine-readable count was found on the source page.'
          : 'The source labels this field “Daily Manatee Count” but does not expose the observation date in a stable machine-readable field. Treat this only as the latest published in-season count, not a guaranteed same-day observation.'
    });
  } catch (error) {
    const season = floridaSeason();
    res.status(200).json({
      count: null,
      source: 'Blue Spring Adventures',
      sourceUrl: SOURCE_URL,
      observedAt: null,
      retrievedAt: new Date().toISOString(),
      season,
      freshness: season.active ? 'unavailable' : 'off-season',
      note: season.active
        ? 'The published count feed is temporarily unavailable.'
        : 'Manatee refuge season is November 15 through March 31; no off-season count is presented.',
      error: String(error.message || error)
    });
  }
};

module.exports.parseCount = parseCount;
module.exports.floridaSeason = floridaSeason;
