// node scripts/apitest.js -- exercises api/uid.js against a mocked Enka (no network)
const assert = require('assert');
const handler = require('../api/uid.js');
const mkRes = () => { const r = { code: 200, headers: {}, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, setHeader(k, v) { this.headers[k] = v } }; return r };
const call = async q => { const res = mkRes(); await handler({ query: q }, res); return res };
const reply = (status, body, headers = {}) => ({ status, ok: status >= 200 && status < 300, text: async () => typeof body === 'string' ? body : JSON.stringify(body), headers: { get: k => headers[k.toLowerCase()] ?? null } });
(async () => {
  let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok  ' + name) };
  await t('rejects a bad uid', async () => assert.equal((await call({ uid: '12' })).code, 400));
  await t('200 passes data, adds meta and cache header', async () => {
    global.fetch = async () => reply(200, { uid: '111111', ttl: 120, playerInfo: {} });
    const r = await call({ uid: '111111' }); assert.equal(r.code, 200); assert.equal(r.body.uid, '111111'); assert(r.body._meta.source.includes('/endfield/uid/111111')); assert(/s-maxage=120/.test(r.headers['Cache-Control']));
  });
  await t('second call inside ttl is served from cache without hitting Enka', async () => {
    global.fetch = async () => { throw new Error('should not be called') };
    const r = await call({ uid: '111111' }); assert.equal(r.code, 200); assert.equal(r.body._meta.cached, true);
  });
  await t('maps 404/429/424', async () => {
    for (const [s, code, re] of [[404, 404, /not found/i], [429, 429, /rate limit/i], [424, 502, /maintenance/i]]) {
      global.fetch = async () => reply(s, { error: 'x' }); const r = await call({ uid: '22222' + s }); assert.equal(r.code, code); assert(re.test(r.body.error), r.body.error);
    }
  });
  await t('HTML 404 on first path falls through to the next candidate', async () => {
    const seen = []; global.fetch = async u => { seen.push(u); return u.includes('/endfield/') ? reply(404, '<html>nope</html>') : reply(200, { ttl: 60, playerInfo: {} }) };
    const r = await call({ uid: '333333' }); assert.equal(r.code, 200); assert.equal(seen.length, 2);
  });
  await t('JSON 404 (player missing) does not try other paths', async () => {
    const seen = []; global.fetch = async u => { seen.push(u); return reply(404, { error: 'no' }) };
    const r = await call({ uid: '444444' }); assert.equal(r.code, 404); assert.equal(seen.length, 1);
  });
  await t('network failure gives 502, timeout gives 504', async () => {
    global.fetch = async () => { throw new Error('ECONNRESET') }; assert.equal((await call({ uid: '555555' })).code, 502);
    global.fetch = async () => { const e = new Error('t'); e.name = 'TimeoutError'; throw e }; assert.equal((await call({ uid: '666666' })).code, 504);
  });
  console.log('\n' + n + ' api tests passed');
})().catch(e => { console.error(e); process.exit(1) });
