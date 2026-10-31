// GET /api/uid?uid=123456789  ->  proxies Enka.Network (browser can't call it directly: CORS + User-Agent rule)
// Set ENKA_ENDFIELD_URL in Vercel env if the path differs. "{uid}" is replaced.
module.exports = async (req, res) => {
  const uid = String(req.query.uid || '').replace(/\D/g, '');
  if (uid.length < 6 || uid.length > 14) return res.status(400).json({ error: 'Enter a valid numeric UID.' });
  const url = (process.env.ENKA_ENDFIELD_URL || 'https://enka.network/api/endfield/uid/{uid}').replace('{uid}', uid);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'End:Tech/1.0 (Endfield fan site)', Accept: 'application/json' } });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { return res.status(502).json({ error: 'Enka returned a non-JSON response (HTTP ' + r.status + ').' }); }
    if (!r.ok) {
      const msg = { 404: 'UID not found, or its showcase is private.', 429: 'Enka rate limit hit. Wait a moment and retry.', 424: 'Enka could not reach the game servers.' }[r.status];
      return res.status(r.status).json({ error: msg || 'Enka error (HTTP ' + r.status + ').' });
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (e) { return res.status(502).json({ error: 'Could not reach Enka.Network.' }); }
};
