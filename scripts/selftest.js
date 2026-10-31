// node scripts/selftest.js  -- runs the pure logic (no browser needed)
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'public', 'js');
const src = ['data.js', 'core.js', 'synergy.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const api = vm.runInNewContext(src + '\n({ROSTER,ID_MAP,TAGS,normalize,resolveTemplate,analyze,suggest,lookup,artChain,key})', { localStorage: { getItem() { return null }, setItem() {} } });
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

// print a sample for eyeballing
const a = A('Laevatain', 'Camille', 'Gilberta', 'Ember'); console.log('\nsample:', a.score, a.label, a.checks.map(c => c.level + ': ' + c.title).join(' | '));
console.log('\n' + n + ' tests passed');
