// node scripts/fetch-art.mjs  -> downloads operator art into public/img/ops/<key>.png for self-hosting.
// Then set `const ART_LOCAL = true;` in public/js/data.js. Art belongs to Hypergryph/Gryphline (via Endfield Talos Wiki, CC BY-SA).
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../public/js/', import.meta.url), out = new URL('../public/img/ops/', import.meta.url);
const ctx = vm.createContext({ localStorage: { getItem() { return null }, setItem() {} } });
vm.runInContext(readFileSync(new URL('data.js', dir), 'utf8') + '\n' + readFileSync(new URL('core.js', dir), 'utf8') + '\nglobalThis.__a={ROSTER,artChain,key}', ctx);
const { ROSTER, artChain, key } = ctx.__a;
mkdirSync(out, { recursive: true });
let ok = 0, miss = [];
for (const o of ROSTER) {
  const file = new URL(key(o.name) + '.png', out);
  if (existsSync(file)) { ok++; continue }
  let done = false;
  for (const url of artChain(o, 640)) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Talos-II Archives art fetch (fan site)' } });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) { writeFileSync(file, Buffer.from(await r.arrayBuffer())); done = true; ok++; console.log('saved', o.name); break }
    } catch {}
  }
  if (!done) miss.push(o.name);
  await new Promise(r => setTimeout(r, 400));
}
console.log(`\n${ok}/${ROSTER.length} saved.` + (miss.length ? ' Missing: ' + miss.join(', ') : ''));
