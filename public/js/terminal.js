// ---- shared: Enka lookup (cached) + the Endfield-style terminal panel used by the Home and Account search ----
// Needs core.js (helpers, normalize, icons) and app.js (decrypt).

// same shape as the real Enka Endfield response, so the demo exercises the real code path
const DEMO = { uid: 'demo', region: 'Demo', ttl: 0, playerInfo: { businessCard: { name: 'Demo Endministrator', shortId: 'DEMO', signature: 'Sample data, not a real account', adventureLevel: 42, worldLevel: 6, createTime: 1769040000,
  statistic: { charNum: 12, weaponNum: 21, docNum: 34 },
  charList: [['chr_0016_laevat', 60, 1], ['chr_0013_aglina', 60, 0], ['chr_0004_pelica', 50, 2], ['chr_0006_wolfgd', 55, 0], ['chr_0009_azrila', 50, 1], ['chr_0033_camille', 40, 0], ['chr_0099_notmapped', 20, 0]].map(([templateId, level, potentialLevel]) => ({ templateId, level, potentialLevel })) } } };

async function getData(uid) {
  if (uid === 'demo') return { data: DEMO, note: '' };
  const ck = 'et.cache.' + uid, c = load(ck, null);
  if (c && Date.now() < c.t + c.ttl * 1000) return { data: c.data, note: `Saved copy, Enka refreshes this UID in about ${Math.ceil((c.t + c.ttl * 1000 - Date.now()) / 1000)}s.` };
  let r, j;
  try { r = await fetch('/api/uid?uid=' + encodeURIComponent(uid)) } catch { throw Error('Could not reach the site\'s /api/uid function. Check your connection.') }
  try { j = await r.json() } catch { throw Error('/api/uid did not return JSON. If you are running locally, start the site with "npx vercel dev" (a plain static server has no API).') }
  if (!r.ok) throw Error(j.error || 'Request failed (HTTP ' + r.status + ')');
  save(ck, { t: Date.now(), ttl: Math.min(Math.max(Number(j.ttl) || 60, 30), 600), data: j });
  return { data: j, note: '' };
}

// what the person typed -> { uid } or { err }. Enka only looks accounts up by numeric UID (there is no name search).
function parseQuery(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return { err: 'Enter a UID.' };
  if (v.toLowerCase() === 'demo') return { uid: 'demo' };
  if (/[^\d\s-]/.test(v)) return { err: 'Name search is not available. Enka looks accounts up by numeric UID only, so enter the UID.' };
  const d = v.replace(/\D/g, '');
  if (d.length < 6 || d.length > 14) return { err: 'That is not a valid UID. UIDs are 6 to 14 digits.' };
  return { uid: d };
}

const pad2 = n => String(n).padStart(2, '0');
const tmFrame = (body, foot = '') => `<div class="tm" role="region" aria-label="Account terminal"><i class="tm-c a"></i><i class="tm-c b"></i><i class="tm-c c"></i><i class="tm-c d"></i>
  <header class="tm-h"><span class="tm-ttl"><i class="tm-dot"></i>TALOS-II TERMINAL<em> // ACCOUNT RECORD</em></span><button type="button" class="tm-x" data-tm="close" aria-label="Close terminal">CLOSE <b>✕</b></button></header>
  <div class="tm-b">${body}</div>${foot ? `<footer class="tm-f">${foot}</footer>` : ''}</div>`;
const tmLog = (lines, i0 = 0) => lines.map(([t, s], i) => `<p class="tl" style="--i:${i0 + i}"><span class="pr">&gt;</span> ${t}${s ? ` <b class="${s === 'OK' ? 'ok' : s === 'ERR' ? 'er' : ''}">${s}</b>` : ''}</p>`).join('');

function tmResult(uid, got, n, opts) {
  const p = n.profile, cell = (l, v, i) => v == null || v === '' ? '' : `<div class="tc" style="--i:${i}"><small>${l}</small><b>${esc(v)}</b></div>`;
  const cells = [['AUTHORITY LV', p.level], ['WORLD LV', p.worldLevel], ['OPERATORS', p.owned], ['WEAPONS', p.weapons], ['DOCUMENTS', p.docs], ['CREATED', fmtDate(p.created)]]
    .map(([l, v], i) => cell(l, v, 4 + i)).join('');
  const rows = n.ops.map((o, i) => o.known
    ? `<li style="--i:${10 + i};--c:${COL[o.element]}" data-rar="${o.rarity}"><span class="rb"></span><b>${esc(o.name)}</b><span class="tg">${icoEl(o.element)}${icoCls(o.cls)}<i>${esc(o.cls)}</i></span><span class="st">${stars(o.rarity)}</span><span class="lv">LV ${esc(o.level ?? '?')}</span><span class="pt">P${esc(o.potential ?? 0)}</span></li>`
    : `<li class="unk" style="--i:${10 + i}"><span class="rb"></span><b>UNMAPPED</b><span class="tg"><i>${esc(o.id)}</i></span><span class="st"></span><span class="lv">LV ${esc(o.level ?? '?')}</span><span class="pt"></span></li>`).join('');
  const body = `<div class="tm-id"><div class="tm-name" id="tmn">${esc(p.name || 'Unnamed player')}</div>
      <div class="tm-sub" style="--i:1"><span>UID ${esc(p.uid)}</span>${p.region ? `<span>${esc(p.region)}</span>` : ''}${p.shortId ? `<span>ID ${esc(p.shortId)}</span>` : ''}${p.enkaUser ? `<span>ENKA ${esc(p.enkaUser)}</span>` : ''}</div>
      ${p.sig ? `<div class="tm-sig" style="--i:2">// ${esc(p.sig)}</div>` : ''}</div>
    <div class="tm-grid">${cells}</div>
    <div class="tm-sec" style="--i:9">SHOWCASE OPERATORS<em>${pad2(n.ops.length)}</em></div>
    ${n.ops.length ? `<ul class="tm-ops">${rows}</ul>` : '<p class="tm-none">No operators in the showcase. Make sure the character showcase is public in-game, then search again.</p>'}`;
  const added = opts.isAdded?.(uid);
  const foot = (opts.onAdd ? `<button type="button" class="tm-add" data-tm="add"${added ? ' disabled' : ''}>${added ? 'ACCOUNT ADDED ✓' : 'ADD ACCOUNT'}</button>` : '<span class="tm-hint">VIEW ONLY. Add accounts from the Account tab.</span>')
    + (got.note ? `<span class="tm-hint">${esc(got.note)}</span>` : '');
  return { body, foot };
}

// Open the terminal in `host` and look `raw` up. opts: { onAdd(uid, normalized), isAdded(uid) }. Returns when the lookup is done.
async function tmRun(host, raw, opts = {}) {
  const q = parseQuery(raw), tk = host._tk = (host._tk || 0) + 1;
  host._opts = opts; host.hidden = false;
  if (!host._wired) {
    host._wired = true;
    host.addEventListener('click', async e => {
      const b = e.target.closest('[data-tm]'); if (!b) return;
      if (b.dataset.tm === 'close') { host._tk++; host.hidden = true; host.innerHTML = ''; host.dispatchEvent(new CustomEvent('tmclose')) }
      if (b.dataset.tm === 'add' && host._cur && host._opts.onAdd) { await host._opts.onAdd(host._cur.uid, host._cur.n); b.disabled = true; b.textContent = 'ACCOUNT ADDED ✓' }
    });
  }
  host._cur = null;
  if (q.err) { host.innerHTML = tmFrame(tmLog([['PARSE QUERY', 'ERR']]) + `<p class="tm-err">${esc(q.err)}</p>`); return }
  host.innerHTML = tmFrame(`<div class="tm-log">${tmLog([['OPEN LINK TO ENKA.NETWORK', 'OK'], [`QUERY UID <code>${esc(q.uid)}</code>`, '']])}<p class="tl wait" style="--i:2"><span class="pr">&gt;</span> AWAITING RESPONSE<span class="dots"></span></p></div><div class="tm-bar"><i></i></div>`);
  let got, n;
  const t0 = performance.now();
  try { got = await getData(q.uid); n = normalize(got.data, q.uid) } catch (e) {
    if (tk !== host._tk) return;
    host.innerHTML = tmFrame(tmLog([['OPEN LINK TO ENKA.NETWORK', 'OK'], [`QUERY UID <code>${esc(q.uid)}</code>`, 'ERR']]) + `<p class="tm-err">${esc(e.message)}</p>`); return;
  }
  const wait = 650 - (performance.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));   // let the boot lines play even when the answer is instant
  if (tk !== host._tk) return;
  host._cur = { uid: q.uid, n };
  const { body, foot } = tmResult(q.uid, got, n, opts);
  host.innerHTML = tmFrame(body, foot);
  const nm = host.querySelector('#tmn'); if (nm && typeof decrypt === 'function') { nm.style.visibility = 'hidden'; decrypt(nm, { delay: 0, duration: 700 }) }
}
