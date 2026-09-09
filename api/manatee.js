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
    const count = parseCount(html);
    const lastModified = upstream.headers.get('last-modified');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({
      count,
      source: 'Blue Spring Adventures',
      sourceUrl: SOURCE_URL,
      observedAt: null,
      sourceLastModified: lastModified,
      retrievedAt: new Date().toISOString(),
      freshness: count == null ? 'unavailable' : 'published-undated',
      note: count == null
        ? 'No machine-readable count was found on the source page.'
        : 'The source labels this field “Daily Manatee Count” but does not expose the observation date in a stable machine-readable field. Official monitoring documentation describes a typical 3–5 mornings-per-week count cadence. Treat this only as the latest published count, not a guaranteed same-day observation.'
    });
  } catch (error) {
    res.status(200).json({
      count: null,
      source: 'Blue Spring Adventures',
      sourceUrl: SOURCE_URL,
      observedAt: null,
      retrievedAt: new Date().toISOString(),
      freshness: 'unavailable',
      note: 'The published count feed is temporarily unavailable.',
      error: String(error.message || error)
    });
  }
};

module.exports.parseCount = parseCount;
