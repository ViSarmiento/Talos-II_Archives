// wiki operator page (HTML from api.php?action=parse) -> one operator record. Pure: no network, no files.
// The page is read by its visible labels ("Class", "Gender", "Combat Skills" ...) and heading ids, not by CSS classes,
// so a restyle of the wiki does not break it. Everything that could not be found is left empty and reported in `warnings`.
import { parseHTML, tokens, section, clean, findAll } from './wiki-dom.mjs';

export const BASE = 'https://endfield.wiki.gg';
export const SKILL_TYPES = { 'basic attack': 'Basic', 'battle skill': 'Battle', 'combo skill': 'Combo', 'ultimate': 'Ultimate', 'ultimate skill': 'Ultimate' };
const TIER_ALT = /^(elite|rank|stage|level|lv|tier|phase|break stage)[ _.-]*(\d+|max)(\.\w+)?$/i;
const TIER_TXT = /^(?:(Lv\.?|Level|Elite|Rank|Stage|Tier|Phase|Break Stage)\s*(\d+|max)|([αβγδ]))\b\s*[:\-–]?\s*(.*)$/i;
const NOISE = /^(?:[\d.,]+\s?[KkMm]?|×\s?\d+|Total Cost)$/;

// absolute, full-size file URL: .../images/thumb/Foo.png/64px-Foo.png?abc -> .../images/Foo.png
export const fullSize = src => {
  if (!src) return '';
  let u = src.startsWith('//') ? 'https:' + src : src.startsWith('/') ? BASE + src : src;
  u = u.replace(/\?.*$/, '');
  const m = u.match(/^(.*\/images)\/thumb\/(.+?)\/\d+px-[^/]+$/);
  return m ? `${m[1]}/${m[2]}` : u;
};
const firstImg = t => t?.imgs?.find(i => !/\bicon\.png$/i.test(i.alt)) || t?.imgs?.[0] || null;
const iconOf = t => { const i = firstImg(t); return i ? fullSize(i.src) : '' };

// ordered label scan: finds each label (a line equal to it, or starting with "label ") after the previous one and
// returns { label: { i, lines:[...] } } where lines are the label line's remainder plus the lines up to the next found label
function scan(lines, labels, end = lines.length, from = 0) {
  const hit = []; let pos = from;
  for (const lab of labels) {
    const l = lab.toLowerCase();
    for (let i = pos; i < end; i++) {
      const t = lines[i].t, tl = t.toLowerCase();
      if (tl === l || tl.startsWith(l + ' ') || tl.startsWith(l + ':')) { hit.push({ lab, i, rest: t.slice(lab.length).replace(/^[\s:]+/, '') }); pos = i + 1; break }
    }
  }
  const out = {};
  hit.forEach((h, k) => {
    const stop = k + 1 < hit.length ? hit[k + 1].i : end;
    out[h.lab] = { i: h.i, line: lines[h.i], lines: [h.rest, ...lines.slice(h.i + 1, stop).map(x => x.t)].filter(Boolean) };
  });
  return out;
}
const val = (o, k) => (o[k]?.lines || []).join(' ').trim();

const tierFromAlt = alt => { const m = TIER_ALT.exec(alt || ''); return m ? clean(`${m[1]} ${m[2]}`).replace(/^./, c => c.toUpperCase()) : null };


// ---- tables: per-level skill scaling, and talents / base skills as one table each ----
const BLK = new Set(['div', 'p', 'li', 'ul', 'ol', 'tr', 'td', 'th', 'dd', 'dt', 'table']);
// text of a node with a space at every line break or block edge, so "a<br>b" reads "a b" (textOf would glue them)
const cellText = n => clean((function t(x) {
  if (x.text !== undefined) return x.text;
  if (x.tag === 'br') return ' ';
  if (x.attrs && /mw-editsection|reference/.test(x.attrs.class || '')) return '';
  const inner = (x.children || []).map(t).join('');
  return BLK.has(x.tag) ? ` ${inner} ` : inner;
})(n));
const imgsIn = n => findAll(n, x => x.tag === 'img').map(i => ({ alt: i.attrs.alt || i.attrs.title || '', src: i.attrs.src || '' }));
const rowsOf = t => findAll(t, r => r.tag === 'tr').map(r => (r.children || []).filter(c => c.tag === 'td' || c.tag === 'th'));

// every top-level table in document order with the id of the heading it sits under
function tablesByHeading(root) {
  const out = []; let head = '';
  (function go(n) {
    if (n.text !== undefined) return;
    if (/^h[2-4]$/.test(n.tag)) { head = n.attrs.id || (findAll(n, x => x.attrs && x.attrs.id)[0] || { attrs: {} }).attrs.id || ''; return }
    if (n.tag === 'table') { out.push({ head, node: n }); return }
    (n.children || []).forEach(go);
  })(root);
  return out;
}
// "Rank 7.png" -> "7"; a plain number cell stays as it is; anything else falls back to its position
const levelLabel = (c, i) => { const a = imgsIn(c).map(x => /(\d+)/.exec(x.alt)).find(Boolean); const t = cellText(c); return a ? a[1] : /^\d+$/.test(t) ? t : String(i + 1) };

// one skill's level table: { levels:['1'..'12'], rows:[{ label, values:[...] }] }, or null when the table is not a level table
function parseScaling(table) {
  const rows = rowsOf(table);
  if (rows.length < 2 || rows[0].length < 3) return null;
  const levels = rows[0].slice(1).map(levelLabel);
  if (!rows[0].slice(1).some(c => imgsIn(c).some(i => /rank|lv|level/i.test(i.alt)) || /^\d+$/.test(cellText(c)))) return null;
  const out = [];
  for (const r of rows.slice(1)) {
    const label = cellText(r[0]), values = r.slice(1).map(cellText);
    if (!label || !values.some(Boolean)) continue;
    while (values.length < levels.length) values.push('');
    out.push({ label, values: values.slice(0, levels.length) });
  }
  return out.length ? { levels, rows: out } : null;
}

// talents / base skills: a table whose first row is the name (with its icon) and whose other rows are [tier icon | effect text]
function parseEntryTables(tables) {
  const out = [];
  for (const { node } of tables) {
    const rows = rowsOf(node);
    if (rows.length < 2 || rows[0].length !== 1) continue;
    const name = cellText(rows[0][0]); if (!name) continue;
    const ic = imgsIn(rows[0][0]).find(i => !/\bicon\.png$/i.test(i.alt)) || imgsIn(rows[0][0])[0];
    const tiers = [];
    for (const r of rows.slice(1)) {
      if (r.length < 2) continue;
      const text = cellText(r[r.length - 1]); if (!text) continue;
      const a = imgsIn(r[0]).map(i => tierFromAlt(i.alt)).find(Boolean);
      tiers.push({ label: a || cellText(r[0]), text });
    }
    if (tiers.length) out.push({ name, icon: ic ? fullSize(ic.src) : '', tiers });
  }
  return out;
}

// skills: [{ type, label, name, icon, desc[] }] from the "Combat Skills" section (rank tables are skipped)
function parseSkills(sec, warnings) {
  const body = sec.filter(t => !t.tbl && (t.k === 't' || t.k === 'i'));
  const at = body.map((t, i) => t.k === 't' && SKILL_TYPES[t.t.toLowerCase()] ? i : -1).filter(i => i >= 0);
  const out = [];
  at.forEach((i, k) => {
    const prevEnd = k ? at[k - 1] : -1, next = k + 1 < at.length ? at[k + 1] : body.length;
    const nameTok = [...body.slice(prevEnd + 1, i)].reverse().find(t => t.k === 't');
    // icon: an image just before the name, preferring the wiki's Attack-/Skill-/Combo-/Ult- files
    const imgs = body.slice(prevEnd + 1, i).flatMap(t => t.imgs);
    const ic = imgs.find(x => /^(Attack|Skill|Combo|Ult)[-_ ]/i.test(x.alt)) || imgs[0];
    // the next skill's name line (and its icon) sit right before its type line: leave that line out of this description
    const descEnd = next === body.length ? next : next - 1;
    const raw = body.slice(i + 1, descEnd).filter(t => t.k === 't').map(t => t.t);
    const desc = []; // "BASIC ATTACK:" on a line of its own is joined with the line after it
    for (let j = 0; j < raw.length; j++) {
      let s = raw[j];
      if (/^[A-Z][A-Z' -]{2,}:$/.test(s) && raw[j + 1]) s += ' ' + raw[++j];
      s = s.replace(/^SKILL DESCRIPTION:\s*/i, '');
      if (s) desc.push(s);
    }
    out.push({ type: SKILL_TYPES[body[i].t.toLowerCase()], label: body[i].t, name: nameTok ? nameTok.t : '', icon: ic ? fullSize(ic.src) : '', desc });
  });
  if (out.length < 4) warnings.push(`combat skills: found ${out.length} of 4`);
  return out;
}

// talents / base skills: entries of { name, icon, tiers:[{ label, text }] }.
// Entry = an icon followed by a name (or a sub-heading), then lines of effect text; a tier marker ("Elite 1", "Lv. 2", an Elite/Rank icon,
// or a Greek letter) starts a new tier. Shared by Talents and Base Skills because the wiki lays them out the same way.
function parseEntries(sec) {
  const toks = sec.filter(t => t.k === 'h' || t.k === 't' || t.k === 'i');
  const entries = []; let cur = null, tier = '';
  const start = (name, icon) => { cur = { name, icon: icon || '', tiers: [] }; entries.push(cur); tier = '' };
  const push = (label, text) => {
    if (!cur || !text) return;
    const last = cur.tiers[cur.tiers.length - 1];
    if (last && last.label === label && !TIER_TXT.test(text) && label === (tier || '')) last.text += ' ' + text; else cur.tiers.push({ label, text });
  };
  for (const t of toks) {
    if (t.k === 'h') { if (t.level >= 3 && !/upgrade/i.test(t.id)) start(t.text, ''); continue }
    if (t.k === 'i') {
      const ti = t.imgs.map(i => tierFromAlt(i.alt)).find(Boolean);
      if (ti) { tier = ti; continue }
      const ic = fullSize(t.imgs[0]?.src);
      if (cur && !cur.name) { cur.icon ||= ic; continue }
      start('', ic); continue;
    }
    let text = t.t;
    if (NOISE.test(text)) continue;
    const ti = t.imgs.map(i => tierFromAlt(i.alt)).find(Boolean); if (ti) tier = ti;
    const lead = t.imgs.find(i => !tierFromAlt(i.alt) && !/\bicon\.png$/i.test(i.alt));
    if (!cur) { start(text, lead ? fullSize(lead.src) : ''); continue }
    if (!cur.name) { cur.name = text; continue }
    if (lead && text.length <= 60 && !/[.!?]$/.test(text) && cur.tiers.length) { start(text, fullSize(lead.src)); continue }
    const m = TIER_TXT.exec(text);
    if (m && !m[4]) { tier = clean(m[1] ? `${m[1].replace(/\.$/, '')} ${m[2]}` : m[3]); continue }
    if (m) { tier = clean(m[1] ? `${m[1].replace(/\.$/, '')} ${m[2]}` : m[3]); text = m[4] }
    push(tier, text);
  }
  const ents = entries.filter(e => e.name && (e.tiers.length || e.icon));
  // "Memory Crucible β" / "Memory Crucible γ" -> one entry with two tiers
  const byBase = new Map();
  for (const e of ents) {
    const base = e.name.replace(/\s+[αβγδ]$/, ''), g = e.name.slice(base.length).trim();
    if (!byBase.has(base)) byBase.set(base, { name: base, icon: e.icon, tiers: [] });
    const dst = byBase.get(base); dst.icon ||= e.icon;
    for (const tr of e.tiers) dst.tiers.push({ label: tr.label || g, text: tr.text });
    if (!e.tiers.length && g) dst.tiers.push({ label: g, text: '' });
  }
  return [...byBase.values()].map(e => ({ ...e, tiers: e.tiers.filter(x => x.text) }));
}

export function parseOperator(html, hint = {}) {
  const warnings = [], root = parseHTML(html), toks = tokens(root);
  const firstH = toks.findIndex(t => t.k === 'h'), top = toks.slice(0, firstH < 0 ? toks.length : firstH);
  const lines = top.filter(t => t.k === 't');
  const name = hint.name || '';

  // ---- header ----
  const iClass = lines.findIndex(l => /^Class(\s|$)/.test(l.t));
  const navAt = lines.findIndex((l, i) => i > Math.max(iClass, 0) && /^Operator(\s|$)/.test(l.t));
  const hdr = scan(lines, ['Class', 'Weapon', 'Element', 'Faction', 'Tags', 'Main Attribute', 'Sub Attribute', 'How to obtain'], navAt < 0 ? lines.length : navAt);
  const lead = lines.find(l => /\b\d\s*★/.test(l.t));
  const rar = lead ? +lead.t.match(/(\d)\s*★/)[1] : (top.slice(0, 12).flatMap(t => t.imgs || []).filter(i => /^Star\.svg$/i.test(i.alt)).length || hint.rarity || 0);
  let quote = ''; if (iClass > 0) { const q = lines[iClass - 1].t; if (q !== name && q.length > 12) quote = q }
  const tagLines = hdr['Tags']?.lines || [];
  const head = {
    rarity: rar,
    class: val(hdr, 'Class') || hint.cls || '', classIcon: iconOf(hdr['Class']?.line),
    weapon: val(hdr, 'Weapon') || hint.weapon || '', weaponIcon: iconOf(hdr['Weapon']?.line),
    element: val(hdr, 'Element') || hint.element || '', elementIcon: iconOf(hdr['Element']?.line),
    faction: val(hdr, 'Faction'), factionIcon: iconOf(hdr['Faction']?.line),
    tags: tagLines,
    mainAttr: val(hdr, 'Main Attribute'), mainAttrIcon: iconOf(hdr['Main Attribute']?.line),
    subAttr: val(hdr, 'Sub Attribute'), subAttrIcon: iconOf(hdr['Sub Attribute']?.line),
    obtain: val(hdr, 'How to obtain'),
    quote,
  };
  const internal = scan(lines, ['Internal name'])['Internal name']; head.internalId = internal ? (internal.lines[0] || '') : '';
  for (const k of ['class', 'weapon', 'element']) if (!head[k]) warnings.push(`header: no ${k}`);

  // ---- basic info ----
  const bi = lines.findIndex(l => l.t === 'Basic Info');
  const biEnd = (() => { const r = lines.findIndex((l, i) => i > bi && /^(Gift Preference|Recommended Weapons)$/.test(l.t)); return r < 0 ? lines.length : r })();
  const info = bi < 0 ? {} : scan(lines, ['Gender', 'Authentication', 'Date of Birth', 'Race', 'Oripathy Infection Status', 'Integrated Physical Exam',
    'Physiological Strength', 'Combat Skill', 'Tactical Acumen', 'Originium Arts Assimilation', 'Expertise & Hobbies'], biEnd, bi + 1);
  if (bi < 0) warnings.push('no "Basic Info" block');
  const exp = [], hob = [];
  if (info['Expertise & Hobbies']) {
    const from = info['Expertise & Hobbies'].i + 1;
    const marks = []; for (let i = from; i < biEnd; i++) { const m = /^(Expertise|Hobb(?:y|ies))\s*(\d+)\s*:\s*(.+)$/i.exec(lines[i].t); if (m) marks.push({ i, kind: /^E/i.test(m[1]) ? 'e' : 'h', n: +m[2], cat: m[3].trim() }) }
    marks.forEach((m, k) => {
      let rest = lines.slice(m.i + 1, k + 1 < marks.length ? marks[k + 1].i : biEnd).map(l => l.t), title = '';
      if (rest[0] && rest[0].toLowerCase().startsWith(m.cat.toLowerCase() + ':')) title = rest.shift().slice(m.cat.length + 1).trim();
      (m.kind === 'e' ? exp : hob).push({ n: m.n, category: m.cat, name: title, desc: rest.join(' ') });
    });
  }
  const profile = {
    gender: val(info, 'Gender'), authentication: val(info, 'Authentication'), dob: val(info, 'Date of Birth'), race: val(info, 'Race'),
    oripathy: val(info, 'Oripathy Infection Status'),
    exam: { physiologicalStrength: val(info, 'Physiological Strength'), combatSkill: val(info, 'Combat Skill'), tacticalAcumen: val(info, 'Tactical Acumen'), originiumArtsAssimilation: val(info, 'Originium Arts Assimilation') },
    expertise: exp, hobbies: hob, weapons: [],
  };
  // ---- recommended weapons (grouped by "Matching Skills" / "Matching Stats") ----
  const rw = lines.findIndex(l => l.t === 'Recommended Weapons');
  if (rw >= 0) {
    let grp = ''; const seen = new Set();
    for (let i = rw + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/\b\d\s*★/.test(l.t) && /\bis an?\b/.test(l.t)) break;
      const g = /^Matching (Skills|Stats)/i.exec(l.t); if (g) { grp = g[1][0].toUpperCase() + g[1].slice(1).toLowerCase(); continue }
      const icon = iconOf(l);
      for (const a of l.links) { const n = a.title || a.text; if (!n || seen.has(n) || /^Matching/i.test(n)) continue; seen.add(n); profile.weapons.push({ name: n, icon, match: grp }) }
      if (!l.links.length && l.t && !seen.has(l.t) && /^[\w' -]+$/.test(l.t)) { seen.add(l.t); profile.weapons.push({ name: l.t, icon, match: grp }) }
    }
  }

  // ---- sections ----
  const skills = parseSkills(section(toks, 'Combat_Skills', ['Skill_upgrades', 'Talents', 'Base_Skills']), warnings);
  const tbls = tablesByHeading(root);
  // level tables under "Combat Skills", in page order = basic attack, battle skill, combo skill, ultimate
  const scal = tbls.filter(t => t.head === 'Combat_Skills').map(t => parseScaling(t.node)).filter(Boolean);
  if (scal.length !== skills.length) warnings.push(`combat skills: ${scal.length} level tables for ${skills.length} skills`);
  skills.forEach((sk, i) => { if (scal[i]) sk.scaling = scal[i] });
  // talents and base skills are one table each; the line-by-line reader is the fallback when a page has none
  const tTables = parseEntryTables(tbls.filter(t => t.head === 'Talents')), bTables = parseEntryTables(tbls.filter(t => t.head === 'Base_Skills'));
  const talents = tTables.length ? tTables : parseEntries(section(toks, 'Talents', ['Talent_upgrades', 'Base_Skills', 'Base_Skill_upgrades', 'Changelog', 'Navigation']));
  const baseSkills = bTables.length ? bTables : parseEntries(section(toks, 'Base_Skills', ['Base_Skill_upgrades', 'Changelog', 'Navigation']));
  if (!talents.length) warnings.push('talents: nothing parsed');
  if (!baseSkills.length) warnings.push('base skills: nothing parsed');

  return { ...head, profile, skills, talents, baseSkills, warnings };
}
