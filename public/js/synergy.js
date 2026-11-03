// ---- synergy checker ----
// Heuristic, not a damage calculator. Class rules come from the wiki's class descriptions
// (Guard: Vulnerable + Physical statuses, Caster: Arts Inflictions/Reactions, Striker: exploits what others inflict,
// Supporter: control/weaken); skill-level facts come from TAGS in data.js.
const ARTS = ['Heat', 'Cryo', 'Nature', 'Electric'];
const WANT_LABEL = { 'inf:heat': 'Heat Infliction', 'inf:cryo': 'Cryo Infliction', 'inf:nature': 'Nature Infliction', 'inf:electric': 'Electric Infliction', react: 'Arts Reactions', phys: 'Vulnerable / Physical status' };
const PARTS = { engine: ['Damage engine', 35], damage: ['Damage dealers', 15], element: ['Element plan', 15], sustain: ['Sustain', 15], sp: ['SP and ultimate', 10], amp: ['Enemy debuffs', 10] };

function kitOf(o) {
  const t = TAGS[o.name] || {}, arts = ARTS.includes(o.element);
  const applies = new Set(t.applies || []), provides = new Set(t.provides || []), wants = new Set(t.wants || []);
  if (o.cls === 'Caster' && arts) applies.add('inf:' + o.element.toLowerCase());
  if (o.cls === 'Striker') wants.add(arts ? 'inf:' + o.element.toLowerCase() : 'phys');
  if (o.cls === 'Guard') { provides.add('vuln'); provides.add('status') }
  if (o.cls === 'Supporter') provides.add('amp');
  if (o.cls === 'Vanguard') provides.add('sp');
  if (o.cls === 'Defender') provides.add('protect');
  return { applies, provides, wants, note: t.note || '', known: !!TAGS[o.name] };
}

function arts(team) { // which Arts elements the team can inflict, and who inflicts them
  const by = {};
  team.forEach((m, i) => m.k.applies.forEach(a => { if (a.startsWith('inf:') && a !== 'inf:any') (by[a.slice(4)] ||= []).push(i) }));
  const any = team.map((m, i) => m.k.applies.has('inf:any') ? i : -1).filter(i => i >= 0);
  return { by, any, count: Object.keys(by).length + (any.length ? 1 : 0) };
}

function suppliers(team, i, want) {
  if (want.startsWith('inf:')) return team.map((m, j) => j !== i && (m.k.applies.has(want) || m.k.applies.has('inf:any')) ? j : -1).filter(j => j >= 0);
  if (want === 'phys') return team.map((m, j) => j !== i && (m.k.provides.has('vuln') || m.k.provides.has('status')) ? j : -1).filter(j => j >= 0);
  if (want === 'react') { // a reaction needs two different Arts elements on the target; the other operators must supply one
    const withoutMe = arts(team.filter((_, j) => j !== i));
    return withoutMe.count >= 1 && arts(team).count >= 2 ? team.map((m, j) => j !== i && m.k.applies.size ? j : -1).filter(j => j >= 0) : [];
  }
  return [];
}

function analyze(names) {
  const team = names.map(lookup).filter(Boolean).map(o => ({ ...o, k: kitOf(o) }));
  const n = team.length, links = [], checks = [], got = {};
  const add = (level, title, text) => checks.push({ level, title, text });
  if (!n) return { n, score: 0, label: 'Empty', parts: {}, checks, links, team };

  // 1. damage engine: does everyone who needs something get it from a teammate?
  const needs = [];
  team.forEach((m, i) => m.k.wants.forEach(w => needs.push({ i, w })));
  let met = 0;
  needs.forEach(({ i, w }) => {
    const src = suppliers(team, i, w), me = team[i].name;
    if (src.length) {
      met++;
      src.slice(0, 2).forEach(j => links.push({ from: j, to: i, label: WANT_LABEL[w] }));
      const who = src.map(j => team[j].name).join(' and ');
      add('good', `${me} is fed`, w === 'react' ? `${who} bring${src.length === 1 ? 's' : ''} a second Arts element, so ${me}'s Arts Reaction trigger can fire.`
        : `${who} provide${src.length === 1 ? 's' : ''} ${WANT_LABEL[w]} for ${me}.`);
    } else if (n > 1 || w !== 'react') {
      add('warn', `${me} has no ${WANT_LABEL[w]}`, w === 'react'
        ? `${me}'s kit wants Arts Reactions, which need two different Arts elements on the enemy. Add an Arts operator of a different element.`
        : `Nobody else on this team supplies ${WANT_LABEL[w]}, so ${me} loses much of its damage.`);
    }
  });
  got.engine = needs.length ? met / needs.length : 1;

  // 2. damage dealers
  const dealers = team.filter(m => ['Striker', 'Caster', 'Guard'].includes(m.cls));
  got.damage = dealers.length ? 1 : 0;
  if (!dealers.length) add('warn', 'No damage dealer', 'A Striker, Caster or Guard should carry the damage.');
  else if (dealers.length >= 3 && n === 4) add('info', 'Damage heavy', 'Three dealers leaves little room for sustain and debuffs.');

  // 3. element plan
  const arts_ = team.filter(m => ARTS.includes(m.element)), phys = team.filter(m => m.element === 'Physical');
  const dist = new Set(arts_.map(m => m.element)), inf = arts(team);
  if (n < 2) got.element = 0;
  else if (dist.size >= 2 || inf.count >= 2) { got.element = 1; add('good', 'Arts Reactions available', `${[...dist].join(' + ') || 'Mixed'} inflictions on the same enemy trigger Arts Reactions.`) }
  else if (arts_.length >= 2) { got.element = 0.8; add('info', `Mono-${[...dist][0]}`, `Stacking one element builds Bursts quickly, but enemies that resist ${[...dist][0]} will hurt.`) }
  else if (phys.length >= 2 && !arts_.length) { got.element = 1; add('good', 'Physical core', 'Vulnerable stacks and Physical statuses all feed the same damage type.') }
  else if (phys.length && arts_.length) { got.element = 0.6; add('info', 'Physical and Arts mix', 'Physical operators and Arts operators use different enablers. Make sure each side has its own.') }
  else got.element = 0.5;
  if (phys.length && arts_.length && dist.size >= 2 && n === 4) add('info', 'Off-element operator', `${phys.map(m => m.name).join(', ')} deals Physical, so it will not use your Arts Inflictions.`);

  // 4. sustain
  const sust = team.filter(m => ['heal', 'shield', 'protect'].some(p => m.k.provides.has(p)));
  got.sustain = sust.length ? 1 : 0.35;
  if (sust.length) add('good', 'Sustain covered', `${sust.map(m => m.name).join(' and ')} keep${sust.length === 1 ? 's' : ''} the team alive.`);
  else if (n === 4) add('warn', 'No sustain', 'No Defender, healing, shield or Protection on this team. You will rely on dodging.');

  // 5. SP and ultimate economy
  const sp = team.filter(m => m.k.provides.has('sp')), ug = team.filter(m => m.k.provides.has('ultgain'));
  const ugTargets = ug.length ? team.filter(m => ['Guard', 'Caster', 'Supporter'].includes(m.cls) && !ug.includes(m)) : [];
  got.sp = sp.length ? 1 : ugTargets.length ? 0.7 : 0.3;
  if (sp.length) add('good', 'SP supply', `${sp.map(m => m.name).join(' and ')} help${sp.length === 1 ? 's' : ''} you keep skills rolling.`);
  if (ugTargets.length) {
    add('good', 'Faster ultimates', `Gilberta's talent speeds up ultimates for ${ugTargets.map(m => m.name).join(', ')}.`);
    ug.forEach(g => ugTargets.slice(0, 3).forEach(t => links.push({ from: team.indexOf(g), to: team.indexOf(t), label: 'Ultimate gain' })));
  }
  if (!sp.length && !ugTargets.length && n === 4) add('info', 'No SP or ultimate support', 'A Vanguard or Gilberta would smooth skill and ultimate uptime.');

  // 6. debuffs / amplifiers
  const amp = team.filter(m => m.k.provides.has('amp'));
  got.amp = amp.length ? 1 : 0.3;
  if (amp.length) add('good', 'Enemy debuffs', `${amp.map(m => m.name).join(' and ')} weaken${amp.length === 1 ? 's' : ''} or control enemies.`);
  else if (n === 4) add('info', 'No debuffer', 'Add a Supporter to weaken or control enemies.');

  // 7. overlap
  CLASSES.forEach(c => { const k = team.filter(m => m.cls === c); if (k.length >= 3) add('warn', `${k.length} ${c}s`, `Three ${c}s overlap heavily and leave other roles empty.`) });

  const score = Math.round(Object.entries(PARTS).reduce((s, [p, [, max]]) => s + (got[p] ?? 0) * max, 0));
  const label = n < 4 ? 'Provisional' : score >= 85 ? 'Excellent' : score >= 70 ? 'Solid' : score >= 50 ? 'Workable' : 'Needs work';
  const order = { warn: 0, info: 1, good: 2 };
  checks.sort((a, b) => order[a.level] - order[b.level]);
  const arch = archetype({ team, links, score, n, sust, ugTargets, dealers });
  if (arch && arch.flair >= 60) add('good', `Team style: ${arch.name}`, arch.text);
  return { n, score, label, parts: got, checks, links, team, known: team.filter(m => m.k.known).length, arch, flair: arch ? arch.flair : 0 };
}

// ---- team archetypes: names the *style* of a squad and rates how unusual it is (flair 0..100, not part of the score) ----
// A squad can match several; the one with the highest flair wins. Needs 3+ operators.
const MONO = {
  Heat: ['Inferno Squad', 'Heat on heat on heat. Bursts come fast and everything smells like smoke.'],
  Cryo: ['Deep Freeze', 'Stack Cryo until the whole arena turns to glass.'],
  Nature: ['Overgrowth', 'Nature Inflictions snowball and the enemy never gets to recover.'],
  Electric: ['Stormfront', 'Electric on everything. Electrification keeps the whole enemy line buzzing.'],
  Physical: ['Iron Fist', 'Pure Physical. Vulnerable stacks and Physical statuses all feed one damage type.'],
};
function archetype({ team, links, score, n, sust, ugTargets, dealers }) {
  if (n < 3) return null;
  const el = {}, cl = {}; team.forEach(m => { el[m.element] = (el[m.element] || 0) + 1; cl[m.cls] = (cl[m.cls] || 0) + 1 });
  const maxEl = Math.max(...Object.values(el)), topEl = Object.keys(el).find(k => el[k] === maxEl);
  const maxCl = Math.max(...Object.values(cl)), topCl = Object.keys(cl).find(k => cl[k] === maxCl);
  const arts = Object.keys(el).filter(e => ARTS.includes(e)).length, full = n === 4;
  const rar = team.map(m => m.rarity), phys = team.filter(m => m.element === 'Physical').length, artsN = team.filter(m => ARTS.includes(m.element)).length;
  const c = [];
  if (maxEl >= 3) c.push({ name: MONO[topEl][0], text: MONO[topEl][1], flair: 78 + (maxEl === 4 ? 14 : 0) });
  if (arts >= 3) c.push({ name: 'Rainbow Reactor', text: 'Three different Arts elements: Arts Reactions will never run dry.', flair: 88 });
  if (full && Object.keys(el).length === 4 && Object.keys(cl).length === 4) c.push({ name: 'Four Corners', text: 'Four elements, four classes, zero overlap. Every slot does something nobody else on the team does.', flair: 94 });
  else if (full && Object.keys(el).length === 4) c.push({ name: 'Element Sampler', text: 'One of every kind of damage in a single squad.', flair: 74 });
  if (full && dealers.length >= 3 && !sust.length) c.push({ name: 'Glass Cannon', text: 'All offence, no safety net. Spectacular when it works, over in one mistake when it does not.', flair: 80 });
  if (full && (team.filter(m => m.cls === 'Defender').length >= 2 || sust.length >= 3)) c.push({ name: 'Iron Fortress', text: 'Nothing gets through. The fight takes a while, but you will still be standing at the end.', flair: 72 });
  if (ugTargets.length >= 2) c.push({ name: 'Ultimate Spam', text: 'Faster ultimate gain across the squad: expect cut-ins back to back.', flair: 82 });
  if (full && rar.every(r => r === 4)) c.push({ name: 'Underdog Union', text: 'Four 4★ operators. Nobody expects this squad to work, which is half the fun.', flair: 96 });
  else if (full && !rar.includes(6)) c.push({ name: 'No 6★ Needed', text: 'Not one 6★ in the squad and it still holds together.', flair: 62 });
  else if (full && rar.every(r => r === 6)) c.push({ name: 'Full Roster Flex', text: 'Four 6★ operators. Expensive, loud and very flashy.', flair: 32 });
  if (full && dealers.length === 1) c.push({ name: 'Spotlight Squad', text: 'Three enablers hand one star the whole stage.', flair: 52 });
  if (maxCl >= 3 && maxEl < 3) c.push({ name: 'Class Reunion', text: `${maxCl} ${topCl}s on one team. Unconventional, and the other roles have to be covered by sheer attitude.`, flair: 70 });
  if (phys >= 2 && artsN >= 2) c.push({ name: 'Odd Couple', text: 'Physical and Arts side by side: two separate damage plans in one squad.', flair: 62 });
  if (links.length >= 3) c.push({ name: 'Clockwork', text: 'Almost everyone feeds someone else. A tight little engine.', flair: 55 });
  if (team.some(m => m.name === 'Camille') && team.some(m => m.name === 'Laevatain')) c.push({ name: 'Heat Engine', text: 'Camille loads the Heat Infliction and SP, Laevatain cashes it in.', flair: 66 });
  c.sort((x, y) => y.flair - x.flair);
  return c[0] || (score >= 70 ? { name: 'Balanced Strike', text: 'A sensible, well-rounded squad. Safe, even if not surprising.', flair: 20 } : { name: 'Work in Progress', text: 'No clear style yet. Fill the gaps or lean into one idea.', flair: 10 });
}

// Which operators would improve this team most? ownedKeys (optional) nudges owned operators up the list.
// Ranked by synergy score plus a little for the team style it creates, then diversified so the list is not six of the same class or element.
function suggest(names, ownedKeys = new Set(), limit = 6) {
  if (names.length >= 4 || !names.length) return [];
  const base = analyze(names);
  const all = ROSTER.filter(r => !names.includes(r.name)).map(r => {
    const a = analyze([...names, r.name]);
    let best = null, gain = 0;
    Object.keys(PARTS).forEach(p => { const d = ((a.parts[p] || 0) - (base.parts[p] || 0)) * PARTS[p][1]; if (d > gain) { gain = d; best = p } });
    const owned = ownedKeys.has(key(r.name)), newStyle = a.arch && a.arch.flair >= 60 && (!base.arch || a.arch.name !== base.arch.name);
    return { op: r, score: a.score, owned, why: best ? PARTS[best][0].toLowerCase() : 'role fit', style: newStyle ? a.arch.name : '', rank: a.score + (a.arch ? a.arch.flair * .06 : 0) + (owned ? 0.5 : 0) + r.rarity / 100 };
  }).sort((x, y) => y.rank - x.rank);
  const out = [], cap = { cls: {}, el: {} };
  for (const s of all) {
    if (out.length >= limit) break;
    if ((cap.cls[s.op.cls] || 0) >= 2 || (cap.el[s.op.element] || 0) >= 2) continue;
    out.push(s); cap.cls[s.op.cls] = (cap.cls[s.op.cls] || 0) + 1; cap.el[s.op.element] = (cap.el[s.op.element] || 0) + 1;
  }
  for (const s of all) if (out.length < limit && !out.includes(s)) out.push(s);
  return out;
}

// Fun, unusual comps. Builds squads from `pool` (operator names) by picking at random among the best few fits for each slot,
// so every roll is different, then keeps the ones that score well AND have a distinctive style (one per style).
// rnd is injectable so it can be tested.
function funComps(pool, { count = 3, tries = 48, rnd = Math.random, minScore = 62, minFlair = 55 } = {}) {
  const P = [...new Set(pool.map(o => o.name ?? o))].filter(lookup);
  if (P.length < 4) return [];
  const seen = new Set(), cand = [];
  for (let t = 0; t < tries; t++) {
    const team = [P[Math.floor(rnd() * P.length)]];
    while (team.length < 4) {
      const opts = P.filter(n => !team.includes(n)).map(n => { const a = analyze([...team, n]); return { n, s: a.score + (a.arch ? a.arch.flair * .08 : 0) + rnd() * 10 } }).sort((x, y) => y.s - x.s).slice(0, 5);
      team.push(opts[Math.floor(rnd() * opts.length)].n);
    }
    const k = [...team].sort().join('|'); if (seen.has(k)) continue; seen.add(k);
    const a = analyze(team);
    cand.push({ names: team, score: a.score, arch: a.arch, flair: a.flair, links: a.links.length, rank: a.score * .6 + a.flair * .4 });
  }
  const strict = cand.filter(c => c.score >= minScore && c.flair >= minFlair), loose = cand.filter(c => c.score >= 50 && c.flair >= 40);
  const src = (strict.length >= count ? strict : loose.length >= count ? loose : cand).sort((x, y) => y.rank - x.rank);
  // one candidate per style, then pick styles at random so repeated rolls show different ideas instead of always the highest flair
  const bag = [], styles = new Set(); for (const c of src) if (!styles.has(c.arch.name)) { styles.add(c.arch.name); bag.push(c) }
  const out = []; while (out.length < count && bag.length) out.push(bag.splice(Math.floor(rnd() * bag.length), 1)[0]);
  for (const c of src) if (out.length < count && !out.includes(c)) out.push(c);
  return out;
}
