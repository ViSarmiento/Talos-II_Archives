// node scripts/check-icons.mjs  -- lists every icon in public/data/operators.json that is empty or points at a file that is not in public/.
// Empty = the sync could not download it; missing = the file was never saved or was deleted. Fix both with `npm run sync` (online).
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../public/', import.meta.url);
const db = JSON.parse(readFileSync(new URL('data/operators.json', root), 'utf8'));
const bad = []; let total = 0;
const check = (op, where, icon) => { total++; if (!icon) bad.push(`${op}  ${where}  (empty)`); else if (icon.startsWith('/') && !existsSync(new URL('.' + icon, root))) bad.push(`${op}  ${where}  ${icon}  (file missing)`) };
for (const [slug, o] of Object.entries(db.operators || {})) {
  (o.skills || []).forEach(s => check(slug, `skill "${s.name}"`, s.icon));
  (o.talents || []).forEach(t => check(slug, `talent "${t.name}"`, t.icon));
  (o.baseSkills || []).forEach(b => check(slug, `base skill "${b.name}"`, b.icon));
}
// the Mastery icons on the level slider (levels 10-12) come from the wiki's Rank 10 / 11 / 12 files
[10, 11, 12].forEach(n => check('(slider)', `Mastery rank ${n}`, `/img/wiki/Rank_${n}.png`));
console.log(`${total} skill / talent / base skill icons checked, ${bad.length} problem(s)`);
bad.forEach(b => console.log('  ' + b));
if (bad.length) { console.log('\nRun `npm run sync` with a network connection; icons already on disk are kept. If a talent icon stays empty, run `npm run sync -- --debug <Name>` and look at scripts/.cache/<name>.tokens.txt for that talent.'); process.exitCode = 1 }
