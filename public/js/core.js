// ---- shared logic: helpers, roster lookup, Enka normalizer, art ----
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
const COL = { Cryo: 'var(--cryo)', Heat: 'var(--heat)', Nature: 'var(--nat)', Electric: 'var(--ele)', Physical: 'var(--phy)' };
const CLASSES = ['Guard', 'Caster', 'Striker', 'Supporter', 'Vanguard', 'Defender'];
const key = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// exact name match only (substring matching misfires on short names like "Si" inside "Rossi")
const lookup = n => ROSTER.find(r => key(r.name) === key(n)) || null;

// "chr_0013_aglina" -> roster entry (or null if the id is not mapped yet)
function resolveTemplate(id) {
  const s = String(id ?? '').trim();
  if (!s) return null;
  const mapped = ID_MAP[s.toLowerCase()];
  if (mapped) return lookup(mapped);
  const byName = lookup(s);
  if (byName) return byName;
  const slug = s.toLowerCase().replace(/^chr_\d+_/, '');
  if (slug.length >= 5 && slug !== s.toLowerCase()) {
    const hit = ROSTER.find(r => key(r.name).startsWith(slug));
    if (hit) return hit;
  }
  return null;
}

const pick = (o, ks) => { for (const k of ks) if (o && o[k] != null && typeof o[k] !== 'object') return o[k] };
function findList(o, d = 0) { // fallback if Enka changes the shape: first array of objects that looks like operators
  if (!o || typeof o !== 'object' || d > 4) return null;
  for (const [k, v] of Object.entries(o)) if (Array.isArray(v) && v.length && typeof v[0] === 'object' && /char|avatar|oper|role|unit/i.test(k)) return v;
  for (const v of Object.values(o)) { const r = findList(v, d + 1); if (r) return r }
  return null;
}

// Enka Endfield response (per enkanetwork-go models):
// { uid, region, ttl, owner?, playerInfo: { businessCard: { name, shortId, signature, adventureLevel, worldLevel,
//   createTime, statistic:{charNum,weaponNum,docNum}, charList:[{templateId:"chr_..",level,potentialLevel}] },
//   charData:[{templateId:<number>, level, potentialLevel, weapon, equip, skillInfo, talent}] } }
function normalize(raw, uid) {
  const pi = raw.playerInfo || raw.player || raw;
  const bc = pi.businessCard || {};
  const seen = new Set(), ops = [];
  const add = c => {
    const id = pick(c, ['templateId', 'charId', 'id', 'name']);
    if (id == null) return;
    const r = resolveTemplate(id), k = r ? key(r.name) : 'id:' + id;
    if (seen.has(k)) return;
    seen.add(k);
    ops.push({
      id: String(id), name: r ? r.name : null, known: !!r,
      level: pick(c, ['level', 'lv', 'charLevel']), potential: pick(c, ['potentialLevel', 'potential']),
      element: r?.element, cls: r?.cls, rarity: r?.rarity, weapon: r?.weapon,
    });
  };
  const list = Array.isArray(bc.charList) ? bc.charList : [];
  list.forEach(add);
  if (!list.length) (Array.isArray(pi.charData) ? pi.charData : []).forEach(add);
  if (!ops.length) (findList(raw) || []).forEach(add);
  const st = bc.statistic || {};
  return {
    profile: {
      uid: raw.uid || uid, region: raw.region,
      name: pick(bc, ['name', 'nickname']) ?? pick(pi, ['nickname', 'name']),
      shortId: bc.shortId, sig: pick(bc, ['signature']) ?? pick(pi, ['signature']),
      level: pick(bc, ['adventureLevel', 'level']) ?? pick(pi, ['level']), worldLevel: bc.worldLevel,
      created: bc.createTime, owned: st.charNum, weapons: st.weaponNum, docs: st.docNum,
      enkaUser: raw.owner?.username, ttl: raw.ttl,
    },
    ops,
  };
}

// ---- art: local file (if self-hosted) -> wiki splash -> wiki icon -> monogram ----
const WIKI_IMG = 'https://endfield.wiki.gg/images';
function artChain(o, w = 480) {
  const base = o.name.replace(/ /g, '_'), sp = ART_SPLASH_FILE[o.name] || base, out = [];
  if (ART_LOCAL) out.push(`/img/ops/${key(o.name)}.png`);
  out.push(`${WIKI_IMG}/thumb/${sp}_Splash_Art.png/${w}px-${sp}_Splash_Art.png`);
  out.push(`${WIKI_IMG}/thumb/${base}_icon.png/${Math.min(w, 256)}px-${base}_icon.png`);
  return out.map(encodeURI);
}
const initials = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

// ---- centering: find the operator inside the splash and place it, instead of trusting a fixed crop ----
// Pure maths (tested in scripts/selftest.js). `m` is a list of opaque-pixel columns/rows summarised as
// { nw, nh, x0, x1, y0, y1, cx } in image pixels: x0/x1 = left/right edge of the subject (5th..95th percentile of the
// part being framed), y0/y1 = top/bottom of the subject, cx = horizontal centre of that part. Box is 1 wide, r tall.
function fitMath(m, r, o = {}) {
  const part = o.part ?? .6, wmax = o.wmax ?? 1.08, cxT = o.cx ?? .5, topT = o.top ?? .04;
  const sh = Math.max(m.y1 - m.y0, 1) * part, sw = Math.max(m.x1 - m.x0, 1);
  const s = Math.min(wmax / sw, r * (1 - topT) / sh);   // scale: whole width fits, and the framed part fills the height
  return { w: m.nw * s * 100, l: (cxT - m.cx * s) * 100, t: (r * topT - m.y0 * s) / r * 100 };
}
// read the alpha channel on a small canvas; null when the image is cross-origin without CORS or has no cut-out
function artMeasure(img, part = .6) {
  try {
    const nw = img.naturalWidth, nh = img.naturalHeight; if (!nw || !nh) return null;
    const W = 96, H = Math.max(8, Math.round(W * nh / nw)), c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data; let clear = 0, top = -1, bot = -1; const rows = [];
    for (let j = 0; j < H; j++) { let n = 0; for (let i = 0; i < W; i++) if (d[(j * W + i) * 4 + 3] > 40) n++; else clear++; rows.push(n); if (n > 1) { if (top < 0) top = j; bot = j } }
    if (top < 0) return null;
    if (clear < W * H * .08) return 'opaque';                             // a flat rectangle, not a cut-out: nothing to centre on
    const cut = top + Math.max(2, Math.round((bot - top + 1) * part)), xs = [];
    for (let j = top; j < cut; j++) for (let i = 0; i < W; i++) if (d[(j * W + i) * 4 + 3] > 40) xs.push(i);
    xs.sort((a, b) => a - b); const q = f => xs[Math.min(xs.length - 1, Math.floor(xs.length * f))] / W * nw;
    return { nw, nh, x0: q(.04), x1: q(.96), cx: q(.5), y0: top / H * nh, y1: (bot + 1) / H * nh };
  } catch { return null }
}
// place an <img class="pic"> inside its .art box (box must be laid out; called on load and on resize)
function artFit(img) {
  const box = img.parentElement, W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
  const o = { part: +(box.dataset.part || .6), cx: +(img.dataset.cx || .5), wmax: +(img.dataset.wmax || 1.08) };
  const m = img._m !== undefined ? img._m : (img._m = artMeasure(img, o.part)); if (!m) return;
  if (m === 'opaque') { box.classList.add('opaque'); return }
  const f = fitMath(m, H / W, o);
  img.style.cssText += `;position:absolute;max-width:none;object-fit:fill;transform:none;height:auto;width:${f.w}%;left:${f.l}%;top:${f.t}%`;
  img.classList.add('fit'); box.classList.add('fitted');
}
function artLoad(img) { img._m = undefined; img.parentElement?.classList.add('has'); artFit(img) }
if (typeof addEventListener === 'function') addEventListener('resize', () => document.querySelectorAll('.pic.fit').forEach(artFit));

// ---- art markup ----
// Endministrator has two splashes (male and female); show both in one frame.
const ART_DUO = { Endministrator: ['Endministrator_(Male)', 'Endministrator_(Female)'] };
function picTag(chain, extra = '', cls = '') {
  return `<img class="pic ${cls}" ${extra} alt="" loading="lazy" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" src="${esc(chain[0])}" data-i="0" data-c="${esc(JSON.stringify(chain))}" onload="artLoad(this)" onerror="artErr(this)">`;
}
// the <img> tags for one operator (two for Endministrator); `cls` is added to each so a page can style layers separately
function artLayer(o, w, cls = '') {
  if (ART_DUO[o.name]) {
    const u = f => encodeURI(`${WIKI_IMG}/thumb/${f}_Splash_Art.png/${w}px-${f}_Splash_Art.png`);
    return ART_DUO[o.name].map((f, k) => picTag([u(f)], `data-duo="${k}" data-cx="${k ? .7 : .3}" data-wmax=".78"`, cls)).join('');
  }
  return picTag(artChain(o, w), '', cls);
}
function artHtml(o, w, opt = {}) {
  if (!o || !o.name) return `<div class="art"><span class="mono">?</span></div>`;
  const part = opt.part ?? .6, mono = `<span class="mono">${esc(initials(o.name))}</span>`, [fx, fy, fz] = ART_FOCUS[o.name] || ART_FOCUS_DEFAULT;
  return `<div class="art${ART_DUO[o.name] ? ' duo' : ''}" data-part="${part}" style="--fx:${fx}%;--fy:${fy}%;--fz:${fz}">${mono}${artLayer(o, w)}</div>`;
}
function artErr(img) { // CORS attempt failed -> same file without CORS (cannot be measured, uses the default crop); then next source; then the monogram
  try {
    if (img.crossOrigin) { img.removeAttribute('crossorigin'); img.dataset.nocors = '1'; img.src = img.src; return }
    const c = JSON.parse(img.dataset.c), i = +img.dataset.i + 1;
    if (i < c.length) { img.dataset.i = i; img.dataset.nocors = ''; if (i === c.length - 1) img.classList.add('ico'); img.setAttribute('crossorigin', 'anonymous'); img.src = c[i]; return }
  } catch {}
  const box = img.parentElement; img.remove(); if (box) { box.dataset.lost = (+box.dataset.lost || 0) + 1; box.dispatchEvent(new CustomEvent('artlost', { bubbles: true })) }
  if (box && box.classList.contains('duo')) box.querySelectorAll('.pic').forEach(p => { p.dataset.cx = '.5'; p.dataset.wmax = '1.08'; artFit(p) });
}
const stars = n => '★'.repeat(n || 0);
const fmtDate = t => { const n = Number(t); if (!n) return ''; const d = new Date(n < 1e12 ? n * 1000 : n); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) };
