// node scripts/sync-operators.mjs [options] [Operator Name ...]      (npm run sync)
//
// Reads every operator page on endfield.wiki.gg through the MediaWiki API (api.php?action=parse), turns it into one record per
// operator, downloads every icon it mentions, and writes:
//   public/data/operators.json      all operators (the operator page reads only this file)
//   public/img/wiki/<file>          the icons, referenced from the JSON as /img/wiki/<file>
// Run it whenever the wiki changes; commit the result. The site never calls the wiki for operator data at request time.
//
//   (no names)     every operator in ROSTER (public/js/data.js)
//   Laevatain Si   only those; the other operators already in operators.json are kept
//   --refresh      ignore the saved wiki HTML in scripts/.cache and fetch again
//   --no-icons     skip icon downloads (keeps the remote URLs out of the JSON: icons are left empty)
//   --debug        also write scripts/.cache/<Name>.tokens.txt, the flat line-by-line view the parser reads (for fixing a parse)
//   --delay=<ms>   pause between wiki requests (default 500)
//
// Needs Node 20+. No packages.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { parseOperator, BASE } from './lib/parse-operator.mjs';
import { parseHTML, tokens } from './lib/wiki-dom.mjs';

const root = new URL('../', import.meta.url);
const OUT_JSON = new URL('public/data/operators.json', root), ICON_DIR = new URL('public/img/wiki/', root), CACHE = new URL('scripts/.cache/', root);
const args = process.argv.slice(2), flag = n => args.includes('--' + n), opt = (n, d) => (args.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1] ?? d;
const names = args.filter(a => !a.startsWith('--'));
const DELAY = +opt('delay', 500), UA = process.env.WIKI_UA || 'Talos-II-Archives-sync/1.0 (unofficial Endfield fan site; operator data sync)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
mkdirSync(CACHE, { recursive: true }); mkdirSync(ICON_DIR, { recursive: true }); mkdirSync(new URL('public/data/', root), { recursive: true });

// ---- operator list: the same ROSTER the site uses ----
const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('public/js/data.js', root), 'utf8') + '\nglobalThis.__r = ROSTER', ctx);
const ROSTER = ctx.__r;
const todo = names.length ? names.map(n => ROSTER.find(r => r.name.toLowerCase() === n.toLowerCase()) || (console.error(`not in ROSTER: ${n}`), process.exit(1))) : ROSTER;

// ---- wiki access ----
async function http(url, tries = 4) {
  for (let t = 1; ; t++) {
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } }) } catch (e) { if (t >= tries) throw e; await sleep(1000 * t); continue }
    if (r.ok) return r;
    if ((r.status === 429 || r.status >= 500) && t < tries) { await sleep((+r.headers.get('retry-after') || 2 * t) * 1000); continue }
    throw new Error(`HTTP ${r.status} for ${url}${r.status === 403 ? ' (the wiki may be blocking this client: set WIKI_UA to a descriptive User-Agent)' : ''}`);
  }
}
async function pageHtml(o) {
  const file = new URL(slug(o.name) + '.html', CACHE);
  if (!flag('refresh') && existsSync(file)) return readFileSync(file, 'utf8');
  const u = `${BASE}/api.php?action=parse&page=${encodeURIComponent(o.name.replace(/ /g, '_'))}&prop=text&format=json&formatversion=2&redirects=1&maxlag=5`;
  const j = await (await http(u)).json();
  if (j.error) throw new Error(`${j.error.code}: ${j.error.info}`);
  const html = j.parse?.text; if (!html) throw new Error('empty parse result');
  writeFileSync(file, html); await sleep(DELAY);
  return html;
}

// ---- icons: collect every wiki image URL in a record, download once, rewrite to /img/wiki/<file> ----
const isImg = v => typeof v === 'string' && v.startsWith(BASE + '/images/');
const localName = u => decodeURIComponent(u.split('/').pop()).replace(/[^A-Za-z0-9._-]+/g, '_');
const collect = (v, set) => { if (isImg(v)) set.add(v); else if (Array.isArray(v)) v.forEach(x => collect(x, set)); else if (v && typeof v === 'object') Object.values(v).forEach(x => collect(x, set)) };
const rewrite = (v, map) => isImg(v) ? (map.get(v) ?? '') : Array.isArray(v) ? v.map(x => rewrite(x, map)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rewrite(x, map)])) : v;
async function downloadIcons(urls) {
  const map = new Map(), fails = [], q = [...urls]; let got = 0, had = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let u; (u = q.shift());) {
      const f = localName(u), file = new URL(f, ICON_DIR);
      if (existsSync(file)) { map.set(u, '/img/wiki/' + f); had++; continue }
      try {
        const r = await http(u, 3), type = r.headers.get('content-type') || '';
        if (!/^image\//.test(type)) throw new Error('not an image: ' + type);
        writeFileSync(file, Buffer.from(await r.arrayBuffer())); map.set(u, '/img/wiki/' + f); got++;
      } catch (e) { fails.push(`${u}  (${e.message})`) }
      await sleep(120);
    }
  }));
  return { map, got, had, fails };
}

// ---- debug view of the line stream the parser reads ----
const dump = html => tokens(parseHTML(html)).map(t => t.k === 'h' ? `\n## h${t.level} #${t.id}  ${t.text}` : t.k === 'i' ? `  [img ${t.imgs.map(i => i.alt).join(' | ')}]${t.tbl ? ' (table)' : ''}`
  : `  ${t.t.slice(0, 160)}${t.imgs.length ? '   [img ' + t.imgs.map(i => i.alt).join(' | ') + ']' : ''}${t.tbl ? ' (table)' : ''}`).join('\n');

// ---- main ----
const prev = existsSync(OUT_JSON) ? (() => { try { return JSON.parse(readFileSync(OUT_JSON, 'utf8')) } catch { return null } })() : null;
const ops = { ...(prev?.operators || {}) }, report = [], failed = [];
console.log(`Syncing ${todo.length} operator${todo.length === 1 ? '' : 's'} from ${BASE}/api.php\n`);
const raw = {};
for (const o of todo) {
  try {
    const html = await pageHtml(o);
    if (flag('debug')) writeFileSync(new URL(slug(o.name) + '.tokens.txt', CACHE), dump(html));
    const rec = parseOperator(html, { name: o.name, rarity: o.rarity, cls: o.cls, weapon: o.weapon, element: o.element });
    const { warnings, ...data } = rec;
    raw[o.name] = { slug: slug(o.name), name: o.name, page: `${BASE}/wiki/${encodeURIComponent(o.name.replace(/ /g, '_'))}`, ...data };
    report.push([o.name, rec.skills.length, rec.talents.length, rec.baseSkills.length, rec.profile.weapons.length, warnings]);
    console.log(`  ok   ${o.name.padEnd(16)} skills ${rec.skills.length}  talents ${rec.talents.length}  base ${rec.baseSkills.length}  weapons ${rec.profile.weapons.length}${warnings.length ? '   ! ' + warnings.join('; ') : ''}`);
  } catch (e) { failed.push(o.name); console.log(`  FAIL ${o.name.padEnd(16)} ${e.message}`) }
}
if (!Object.keys(raw).length) { console.error('\nNothing could be read from the wiki. Check your connection (or WIKI_UA) and try again.'); process.exit(2) }

if (flag('no-icons')) { const m = new Map(); const all = new Set(); collect(raw, all); for (const u of all) m.set(u, ''); for (const k in raw) ops[slug(k)] = rewrite(raw[k], m) }
else {
  const urls = new Set(); collect(raw, urls);
  console.log(`\nIcons: ${urls.size} referenced`);
  const { map, got, had, fails } = await downloadIcons(urls);
  console.log(`  downloaded ${got}, already present ${had}${fails.length ? `, FAILED ${fails.length}` : ''}`);
  fails.slice(0, 12).forEach(f => console.log('   - ' + f));
  for (const k in raw) ops[slug(k)] = rewrite(raw[k], map);
}

const sorted = Object.fromEntries(Object.entries(ops).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), source: `${BASE} (CC BY-SA)`, count: Object.keys(sorted).length, operators: sorted }, null, 1) + '\n');
console.log(`\nWrote public/data/operators.json (${Object.keys(sorted).length} operators).`);

const empty = report.filter(r => !r[1] || !r[2] || !r[3]);
if (empty.length) console.log(`\n${empty.length} operator(s) came back without skills, talents or base skills (${empty.map(r => r[0]).join(', ')}).\nRun again with --debug <Name> and look at scripts/.cache/<name>.tokens.txt: that is exactly what the parser sees.`);
if (failed.length) { console.log(`\nFailed pages: ${failed.join(', ')} (kept from the previous file when present)`); process.exitCode = 1 }
