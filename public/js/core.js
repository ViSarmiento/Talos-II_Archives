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
function artHtml(o, w) {
  if (!o || !o.name) return `<div class="art"><span class="mono">?</span></div>`;
  const ch = artChain(o, w);
  const [fx, fy, fz] = ART_FOCUS[o.name] || ART_FOCUS_DEFAULT;
  return `<div class="art" style="--fx:${fx}%;--fy:${fy}%;--fz:${fz}"><span class="mono">${esc(initials(o.name))}</span><img class="pic" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${esc(ch[0])}" data-i="0" data-c="${esc(JSON.stringify(ch))}" onerror="artErr(this)"></div>`;
}
function artErr(img) { // try the next source, otherwise leave the monogram showing
  try { const c = JSON.parse(img.dataset.c), i = +img.dataset.i + 1; if (i < c.length) { img.dataset.i = i; if (i === c.length - 1) img.classList.add('ico'); img.src = c[i]; return } } catch {}
  img.remove();
}
const stars = n => '★'.repeat(n || 0);
const fmtDate = t => { const n = Number(t); if (!n) return ''; const d = new Date(n < 1e12 ? n * 1000 : n); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) };
