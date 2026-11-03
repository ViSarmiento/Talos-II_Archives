// node scripts/selftest.js  -- runs the pure logic (no browser needed)
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'public', 'js');
const src = ['data.js', 'core.js', 'synergy.js', 'terminal.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const api = vm.runInNewContext(src + '\n({ROSTER,ID_MAP,TAGS,normalize,resolveTemplate,analyze,suggest,funComps,parseQuery,lookup,artChain,key,fitMath,artHtml,artLayer,ART_DUO})', { localStorage: { getItem() { return null }, setItem() {} } });
const assert = require('assert');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name) };

t('roster has 34 unique operators', () => { assert.equal(api.ROSTER.length, 34); assert.equal(new Set(api.ROSTER.map(r => r.name)).size, 34) });
t('every ID_MAP target exists in ROSTER', () => Object.values(api.ID_MAP).forEach(v => assert(api.lookup(v), v)));
t('every TAGS entry exists in ROSTER', () => Object.keys(api.TAGS).forEach(v => assert(api.lookup(v), v)));
t('"Si" does not match inside other names', () => { assert.equal(api.lookup('Rossi').name, 'Rossi'); assert.equal(api.resolveTemplate('xx_rossi_yy'), null) });
t('template ids resolve', () => { assert.equal(api.resolveTemplate('chr_0013_aglina').name, 'Gilberta'); assert.equal(api.resolveTemplate('chr_0099_nobody'), null) });

const real = { uid: '4225399080', region: 'Asia', ttl: 300, owner: { username: 'someone' }, playerInfo: { businessCard: { name: 'Test', shortId: 'X1', signature: 'hi', adventureLevel: 55, worldLevel: 7, createTime: 1769000000, statistic: { charNum: 14, weaponNum: 20, docNum: 3 },
  charList: [{ templateId: 'chr_0016_laevat', level: 80, potentialLevel: 1 }, { templateId: 'chr_0013_aglina', level: 70, potentialLevel: 0 }, { templateId: 'chr_0099_nobody', level: 10, potentialLevel: 0 }, { templateId: 'chr_0016_laevat', level: 80 }] }, charData: [{ templateId: 1001, level: 80 }] } };
t('normalize reads the real Enka shape', () => {
  const r = api.normalize(real, '4225399080');
  assert.equal(r.profile.name, 'Test'); assert.equal(r.profile.level, 55); assert.equal(r.profile.owned, 14); assert.equal(r.profile.region, 'Asia'); assert.equal(r.profile.ttl, 300);
  assert.equal(r.ops.length, 3); assert.equal(r.ops[0].name, 'Laevatain'); assert.equal(r.ops[0].element, 'Heat'); assert.equal(r.ops[2].known, false); assert.equal(r.ops[2].id, 'chr_0099_nobody');
});
t('normalize survives an empty showcase', () => { const r = api.normalize({ playerInfo: { businessCard: { name: 'Empty' } } }, '1'); assert.equal(r.ops.length, 0); assert.equal(r.profile.name, 'Empty') });
t('normalize falls back to charData only when charList is empty', () => { const r = api.normalize({ playerInfo: { businessCard: {}, charData: [{ templateId: 'chr_0004_pelica', level: 5 }] } }, '1'); assert.equal(r.ops[0].name, 'Perlica') });

const A = (...n) => api.analyze(n);
t('Laevatain without Heat source is flagged', () => { const a = A('Laevatain', 'Gilberta'); assert(a.checks.some(c => c.level === 'warn' && /Laevatain has no Heat/.test(c.title))) });
t('Camille feeds Laevatain', () => { const a = A('Laevatain', 'Camille'); assert(a.links.some(l => a.team[l.from].name === 'Camille' && a.team[l.to].name === 'Laevatain')) });
t('Gilberta needs two Arts elements for reactions', () => { assert(A('Gilberta', 'Ardelia').checks.some(c => c.level === 'warn' && /Arts Reactions/.test(c.title))); assert(A('Gilberta', 'Perlica').checks.some(c => /Gilberta is fed/.test(c.title))) });
t('Physical striker wants Vulnerable from a Guard', () => { const a = A('Da Pan', 'Chen Qianyu'); assert(a.links.some(l => a.team[l.to].name === 'Da Pan')) });
t('balanced team outscores a lopsided one', () => { const good = A('Laevatain', 'Camille', 'Gilberta', 'Ember'), bad = A('Lifeng', 'Rossi', 'Mi Fu', 'Chen Qianyu'); assert(good.score > bad.score, `${good.score} vs ${bad.score}`); assert(bad.checks.some(c => /4 Guards|3 Guards/.test(c.title))) });
t('score stays in 0..100', () => api.ROSTER.forEach(r => { const s = A(r.name).score; assert(s >= 0 && s <= 100) }));
t('suggest returns candidates and respects ownership', () => { const s = api.suggest(['Laevatain'], new Set(['ember'])); assert(s.length && s.every(x => x.op.name !== 'Laevatain')); assert.equal(api.suggest(['Laevatain', 'Camille', 'Ember', 'Gilberta']).length, 0) });
t('art chain falls back to icon and handles Endministrator', () => { const c = api.artChain(api.lookup('Endministrator')); assert(/Endministrator_\(Female\)_Splash_Art/.test(c[0])); assert(/_icon\.png/.test(c[1])) });

// ---- 1.5: centring + Endministrator pair art ----
const subj = { nw: 1000, nh: 1500, x0: 300, x1: 700, cx: 520, y0: 50, y1: 1450 };
t('fitMath puts the operator on the horizontal centre of the card', () => { const f = api.fitMath(subj, 4 / 3), s = f.w / 100 / subj.nw; assert(Math.abs(f.l / 100 + subj.cx * s - .5) < 1e-9) });
t('fitMath keeps the operator inside the card width', () => { const f = api.fitMath(subj, 4 / 3), s = f.w / 100 / subj.nw; assert((subj.x1 - subj.x0) * s <= 1.08 + 1e-9) });
t('fitMath puts the top of the operator near the top edge, whatever the art offset', () => { [0, 200, 600].forEach(y0 => { const m = { ...subj, y0, y1: y0 + 1400 }, f = api.fitMath(m, 4 / 3), s = f.w / 100 / m.nw; assert(Math.abs((f.t / 100 * 4 / 3) + y0 * s - 4 / 3 * .04) < 1e-9) }) });
t('fitMath honours a custom centre (pair art)', () => { const f = api.fitMath(subj, 4 / 3, { cx: .3, wmax: .78 }), s = f.w / 100 / subj.nw; assert(Math.abs(f.l / 100 + subj.cx * s - .3) < 1e-9); assert((subj.x1 - subj.x0) * s <= .78 + 1e-9) });
t('a wide-armed pose does not push the operator off centre (cx is the median, not the box)', () => { const f = api.fitMath({ ...subj, x0: 100, x1: 900, cx: 500 }, 4 / 3), s = f.w / 100 / subj.nw; assert(Math.abs(f.l / 100 + 500 * s - .5) < 1e-9) });
t('Endministrator renders male and female splash in one frame', () => { const h = api.artHtml(api.lookup('Endministrator'), 360); assert(/Endministrator_\(Male\)_Splash_Art/.test(h) && /Endministrator_\(Female\)_Splash_Art/.test(h)); assert(/class="art duo"/.test(h)); assert.equal((h.match(/<img/g) || []).length, 2) });
t('other operators render a single image', () => { assert.equal((api.artHtml(api.lookup('Rossi'), 360).match(/<img/g) || []).length, 1) });
t('every roster operator produces art markup', () => api.ROSTER.forEach(r => assert(/<img/.test(api.artHtml(r, 360)), r.name)));


// ---- 1.9.1: UID query parsing, team styles, diversified suggestions, fun comps ----
t('parseQuery accepts a UID, spaces and demo, rejects names and short numbers', () => {
  assert.equal(api.parseQuery(' 4225 399080 ').uid, '4225399080'); assert.equal(api.parseQuery('DEMO').uid, 'demo');
  assert(/Name search/.test(api.parseQuery('Endmin').err)); assert(api.parseQuery('123').err); assert(api.parseQuery('').err);
});
t('team style: mono-element, rainbow, glass cannon, underdogs', () => {
  assert.equal(A('Laevatain', 'Camille', 'Ember', 'Wulfgard').arch.name, 'Inferno Squad');
  assert.equal(A('Akekuri', 'Antal', 'Catcher', 'Estella').arch.name, 'Underdog Union');
  assert(A('Laevatain', 'Wulfgard').arch === null);   // needs 3+
  const fc = A('Laevatain', 'Wulfgard', 'Da Pan', 'Akekuri'); assert.equal(fc.arch.name, 'Glass Cannon');
  assert(A('Perlica', 'Camille', 'Fluorite', 'Si').flair >= 80);
});
t('flair is 0..100 and never changes the score', () => api.ROSTER.slice(0, 12).forEach((r, i) => { const a = A(r.name, api.ROSTER[i + 5].name, api.ROSTER[i + 9].name); assert(a.flair >= 0 && a.flair <= 100) }));
t('suggest is mixed: at most 2 of one class or element, and names the style it creates', () => {
  const s = api.suggest(['Laevatain', 'Camille']); assert.equal(s.length, 6);
  const c = {}, e = {}; s.forEach(x => { c[x.op.cls] = (c[x.op.cls] || 0) + 1; e[x.op.element] = (e[x.op.element] || 0) + 1 });
  assert(Math.max(...Object.values(c)) <= 2 && Math.max(...Object.values(e)) <= 2, JSON.stringify([c, e]));
});
let sd = 3; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646 };
t('funComps returns distinct, valid, distinctive squads', () => {
  const out = api.funComps(api.ROSTER, { rnd }); assert.equal(out.length, 3);
  assert.equal(new Set(out.map(o => o.arch.name)).size, 3);
  out.forEach(o => { assert.equal(new Set(o.names).size, 4); o.names.forEach(n => assert(api.lookup(n))); assert(o.score >= 50 && o.flair >= 40) });
});
t('funComps only uses the pool it is given, and needs 4 operators', () => {
  const pool = ['Laevatain', 'Camille', 'Ember', 'Gilberta', 'Perlica', 'Rossi'];
  api.funComps(pool, { rnd }).forEach(o => o.names.forEach(n => assert(pool.includes(n))));
  assert.deepEqual(api.funComps(['Rossi', 'Si', 'Ember'], { rnd }), []);
});

// print a sample for eyeballing
const a = A('Laevatain', 'Camille', 'Gilberta', 'Ember'); console.log('\nsample:', a.score, a.label, a.checks.map(c => c.level + ': ' + c.title).join(' | '));
console.log('\n' + n + ' tests passed');
