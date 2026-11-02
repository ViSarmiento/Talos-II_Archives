// GET /api/uid?uid=123456789  ->  proxies Enka.Network (browsers can't call it directly: CORS + custom User-Agent rule).
// Env ENKA_ENDFIELD_URL overrides the endpoint ("{uid}" is replaced). Add `&debug=1` to see which URL answered.
const CANDIDATES = [
  'https://enka.network/api/endfield/uid/{uid}', // pattern used by Enka's other games (/api/hsr/uid, /api/zzz/uid)
  'https://enka.network/api/ef/uid/{uid}',       // fallback guess, only tried if the first path returns a non-JSON page
];
const UA = 'Talos-II-Archives/1.1 (Endfield fan site)';
const MESSAGES = {
  400: 'That UID format is not valid.',
  404: 'UID not found, or this account has no public showcase.',
  424: 'Enka cannot reach the game right now (maintenance or a fresh game update). Try again later.',
  429: 'Enka rate limit hit. Wait a minute and retry.',
  500: 'Enka had a server error. Try again shortly.',
  503: 'Enka is temporarily unavailable. Try again shortly.',
};
const cache = new Map(); // best effort, per warm function instance: honours Enka's ttl so repeat lookups don't burn rate limit

async function ask(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
  const text = await r.text();
  let data = null; try { data = JSON.parse(text) } catch {}
  return { status: r.status, ok: r.ok, data, retryAfter: r.headers.get('retry-after') };
}

module.exports = async (req, res) => {
  const uid = String(req.query.uid || '').replace(/\D/g, '');
  if (uid.length < 6 || uid.length > 14) return res.status(400).json({ error: 'Enter a valid numeric UID.' });

  const hit = cache.get(uid);
  if (hit && Date.now() < hit.until) {
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ ...hit.data, _meta: { ...hit.data._meta, cached: true } });
  }

  const urls = process.env.ENKA_ENDFIELD_URL ? [process.env.ENKA_ENDFIELD_URL] : CANDIDATES;
  let last = null;
  for (const tpl of urls) {
    const url = tpl.replace('{uid}', uid);
    try {
      const r = await ask(url);
      last = { ...r, url };
      if (r.data === null && r.status === 404 && tpl !== urls[urls.length - 1]) continue; // HTML 404 = wrong path, try the next candidate
      if (!r.ok) {
        const msg = MESSAGES[r.status] || `Enka error (HTTP ${r.status}).`;
        if (r.retryAfter) res.setHeader('Retry-After', r.retryAfter);
        return res.status(r.status === 424 ? 502 : r.status).json({ error: msg, status: r.status, ...(req.query.debug ? { url } : {}) });
      }
      if (r.data === null) return res.status(502).json({ error: 'Enka returned a non-JSON response.', status: r.status, ...(req.query.debug ? { url } : {}) });
      const ttl = Math.max(Number(r.data.ttl) || 60, 30);
      const body = { ...r.data, _meta: { source: url, fetchedAt: Date.now(), cached: false } };
      cache.set(uid, { until: Date.now() + Math.min(ttl, 600) * 1000, data: body });
      if (cache.size > 200) cache.delete(cache.keys().next().value);
      res.setHeader('Cache-Control', `s-maxage=${Math.min(ttl, 300)}, stale-while-revalidate=120`);
      return res.status(200).json(body);
    } catch (e) {
      last = { error: e.name === 'TimeoutError' ? 'timeout' : String(e.message || e), url };
    }
  }
  const timedOut = last && last.error === 'timeout';
  return res.status(timedOut ? 504 : 502).json({
    error: timedOut ? 'Enka took too long to answer. Try again.' : 'Could not reach Enka.Network.',
    ...(req.query.debug ? { detail: last } : {}),
  });
};
