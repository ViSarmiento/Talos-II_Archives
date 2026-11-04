// node scripts/synctest.mjs  -- tests the wiki parser against scripts/fixtures/laevatain.html (no network).
// The fixture's header, Basic Info, weapons and Combat Skills mirror the real page; its Talents / Base Skills blocks are an assumed shape
// (see the comment at the top of the fixture). When you have the real HTML from `npm run sync -- --refresh Laevatain`, copy
// scripts/.cache/laevatain.html over the fixture and adjust the expectations below if the real page differs.
import assert from 'node:assert'; import { readFileSync, existsSync } from 'node:fs'; import vm from 'node:vm';
import { parseHTML, tokens } from './lib/wiki-dom.mjs';
import { parseOperator, fullSize } from './lib/parse-operator.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name) };
const html = readFileSync(new URL('./fixtures/laevatain.html', import.meta.url), 'utf8');
const o = parseOperator(html, { name: 'Laevatain', rarity: 6, cls: 'Striker', weapon: 'Sword', element: 'Heat' });

t('html reader: entities, implicit closers, void tags', () => {
  const r = parseHTML('<ul><li>a &amp; b<li>c &#8212; d</ul><table><tr><td>1<td>2<tr><td>3</table><p>x<br>y<img src="/i.png">');
  assert.deepEqual(tokens(r).filter(k => k.k === 't').map(k => k.t), ['a & b', 'c — d', '1', '2', '3', 'x', 'y']);
});
t('thumbnail URLs become full-size file URLs', () => {
  assert.equal(fullSize('/images/thumb/Attack-Sword.png/64px-Attack-Sword.png?ec5671'), 'https://endfield.wiki.gg/images/Attack-Sword.png');
  assert.equal(fullSize('/images/Star.svg?9e1020'), 'https://endfield.wiki.gg/images/Star.svg');
  assert.equal(fullSize('/images/thumb/Valley_Protocol%27s_Choice_icon.png/15px-Valley_Protocol%27s_Choice_icon.png?27b16d'), "https://endfield.wiki.gg/images/Valley_Protocol%27s_Choice_icon.png");
});
t('header: rarity, class, weapon, element, faction, tags, attributes, how to obtain', () => {
  assert.equal(o.rarity, 6); assert.equal(o.class, 'Striker'); assert.equal(o.weapon, 'Sword'); assert.equal(o.element, 'Heat'); assert.equal(o.faction, 'Rhodes Island');
  assert.deepEqual(o.tags, ['Damage Dealer', 'Combust']); assert.equal(o.mainAttr, 'Intellect'); assert.equal(o.subAttr, 'Strength'); assert.equal(o.obtain, 'Chartered Headhunting');
  assert(/^Haven't we met already/.test(o.quote)); assert.equal(o.internalId, 'chr_0016_laevat'); assert(o.classIcon.endsWith('/images/Striker.png'));
});
t('basic info: gender, authentication, date of birth, race, oripathy, physical exam', () => {
  const p = o.profile;
  assert.equal(p.gender, 'Female'); assert.equal(p.authentication, 'Rhodes Island'); assert.equal(p.dob, "Same as the Endmin's"); assert.equal(p.race, 'Sarkaz');
  assert(/^Oripathy negative/.test(p.oripathy));
  assert.deepEqual(p.exam, { physiologicalStrength: 'Excellent', combatSkill: 'Standard', tacticalAcumen: 'Standard', originiumArtsAssimilation: 'Excellent' });
});
t('expertise and hobbies keep category, name and description', () => {
  assert.equal(o.profile.expertise.length, 2); assert.equal(o.profile.hobbies.length, 2);
  assert.deepEqual(o.profile.expertise[0], { n: 1, category: 'Originium Arts', name: 'Sviga Laevi', desc: o.profile.expertise[0].desc });
  assert(/^Burn the nemesis/.test(o.profile.expertise[0].desc)); assert.equal(o.profile.hobbies[1].name, 'Traveling Vacation');
});
t('recommended weapons are grouped and have icons', () => {
  assert.deepEqual(o.profile.weapons.map(w => [w.name, w.match]), [['Forgeborn Scathe', 'Skills'], ['Umbral Torch', 'Skills'], ['White Night Nova', 'Skills'], ['Fortmaker', 'Stats']]);
  assert(o.profile.weapons.every(w => w.icon.endsWith('_icon.png')));
});
t('combat skills: four, typed, with icons, rank tables left out, inline icons dropped', () => {
  assert.deepEqual(o.skills.map(s => [s.type, s.name]), [['Basic', 'Flaming Cinders'], ['Battle', 'Smouldering Fire'], ['Combo', 'Seethe'], ['Ultimate', 'Twilight']]);
  assert.deepEqual(o.skills.map(s => s.icon.split('/').pop()), ['Attack-Sword.png', 'Skill-Laevatain.png', 'Combo-Laevatain.png', 'Ult-Laevatain.png']);
  const all = o.skills.flatMap(s => s.desc).join(' '); assert(!/Multiplier|SP Cost|Cooldown/.test(all)); assert(/trigger temporary Combustion to all enemies/.test(all));
  assert(o.skills[0].desc[0].startsWith('BASIC ATTACK: ')); assert(o.skills[1].desc[0].startsWith('Summons a Magma Fragment'));   // "SKILL DESCRIPTION:" is dropped
  assert(!o.skills[0].desc.join(' ').includes('Flaming Cinders') && !o.skills[1].desc.join(' ').includes('Combo'));     // names/types of the next skill do not leak in
});
t('talents (assumed layout): name, icon, tier-by-tier effects', () => {
  assert.deepEqual(o.talents.map(x => x.name), ['Scorching Heart', 'Re-Ignition']);
  assert.deepEqual(o.talents[0].tiers.map(x => x.label), ['Elite 1', 'Elite 3']); assert(o.talents[0].icon.endsWith('Talent-Scorching_Heart.png'));
});
t('base skills (assumed layout): "Name β" and "Name γ" merge into one entry with two tiers', () => {
  assert.deepEqual(o.baseSkills.map(x => x.name), ['Memory Crucible', 'Undying Flames']);
  assert.deepEqual(o.baseSkills[0].tiers.map(x => x.label), ['β', 'γ']); assert(/\+30%/.test(o.baseSkills[0].tiers[1].text));
});
t('upgrade-cost tables and the changelog are not read as talents', () => { assert(!JSON.stringify([o.talents, o.baseSkills]).match(/Protoprism|1\.0 release/)) });
t('a page with nothing recognisable gives empty fields and warnings, not an exception', () => {
  const e = parseOperator('<div>nothing here</div>', { name: 'X', rarity: 4, cls: 'Guard', weapon: 'Sword', element: 'Physical' });
  assert.equal(e.class, 'Guard'); assert.equal(e.skills.length, 0); assert(e.warnings.length >= 3);
});

// the generated file, when present: every key is a roster slug and has the arrays the page reads
const f = new URL('../public/data/operators.json', import.meta.url);
if (existsSync(f)) {
  const db = JSON.parse(readFileSync(f, 'utf8')), ctx = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../public/js/data.js', import.meta.url), 'utf8') + '\nglobalThis.__r=ROSTER', ctx);
  const slugs = new Set(ctx.__r.map(r => r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
  t(`public/data/operators.json: ${Object.keys(db.operators).length} operator(s) are well-formed`, () => {
    for (const [k, v] of Object.entries(db.operators)) { assert(slugs.has(k), 'unknown slug ' + k); for (const a of ['skills', 'talents', 'baseSkills']) assert(Array.isArray(v[a]), `${k}.${a}`); assert(v.profile && Array.isArray(v.profile.weapons), k + '.profile') }
  });
}
console.log(`\n${n} passed`);
