// ---- operator data: edit here when new operators ship ----
// Source: Endfield Talos Wiki operator list (rarity, class, weapon, element) as edited 25 Sep 2026.
// [name, rarity, class, weapon, element]
const ROSTER = [
  ['Endministrator',6,'Guard','Sword','Physical'],
  ['Arcane',6,'Caster','Arts Unit','Nature'],
  ['Ardelia',6,'Supporter','Arts Unit','Nature'],
  ['Argent Flow',6,'Guard','Sword','Electric'],
  ['Camille',6,'Vanguard','Polearm','Heat'],
  ['Ember',6,'Defender','Great Sword','Heat'],
  ['Gilberta',6,'Supporter','Arts Unit','Nature'],
  ['Laevatain',6,'Striker','Sword','Heat'],
  ['Last Rite',6,'Striker','Great Sword','Cryo'],
  ['Lifeng',6,'Guard','Polearm','Physical'],
  ['Liino',6,'Supporter','Polearm','Electric'],
  ['Mi Fu',6,'Guard','Great Sword','Physical'],
  ['Pogranichnik',6,'Vanguard','Sword','Physical'],
  ['Rossi',6,'Guard','Sword','Physical'],
  ['Si',6,'Supporter','Great Sword','Cryo'],
  ['Tangtang',6,'Caster','Handcannon','Cryo'],
  ['Typhoeus',6,'Striker','Arts Unit','Nature'],
  ['Yvonne',6,'Striker','Handcannon','Cryo'],
  ['Zhuang Fangyi',6,'Striker','Arts Unit','Electric'],
  ['Alesh',5,'Vanguard','Sword','Cryo'],
  ['Arclight',5,'Vanguard','Sword','Electric'],
  ['Avywenna',5,'Striker','Polearm','Electric'],
  ['Chen Qianyu',5,'Guard','Sword','Physical'],
  ['Da Pan',5,'Striker','Great Sword','Physical'],
  ['Perlica',5,'Caster','Arts Unit','Electric'],
  ['Purrchena',5,'Defender','Sword','Physical'],
  ['Snowshine',5,'Defender','Great Sword','Cryo'],
  ['Wulfgard',5,'Caster','Handcannon','Heat'],
  ['Xaihi',5,'Supporter','Arts Unit','Cryo'],
  ['Akekuri',4,'Vanguard','Sword','Heat'],
  ['Antal',4,'Supporter','Arts Unit','Electric'],
  ['Catcher',4,'Defender','Great Sword','Physical'],
  ['Estella',4,'Guard','Polearm','Cryo'],
  ['Fluorite',4,'Caster','Handcannon','Nature'],
].map(([name, rarity, cls, weapon, element]) => ({ name, rarity, cls, weapon, element }));

// Enka sends operators as internal template ids (e.g. "chr_0013_aglina"), not names.
// Confirmed ids only. An id missing here still shows on /account as "unmapped" with its raw id,
// so you can add a line here once you know whose it is.
const ID_MAP = {
  chr_0002_endminm: 'Endministrator', chr_0003_endminf: 'Endministrator', chr_9000_endmin: 'Endministrator',
  chr_0004_pelica: 'Perlica', chr_0005_chen: 'Chen Qianyu', chr_0006_wolfgd: 'Wulfgard',
  chr_0007_ikut: 'Arclight', chr_0009_azrila: 'Ember', chr_0011_seraph: 'Xaihi',
  chr_0012_avywen: 'Avywenna', chr_0013_aglina: 'Gilberta', chr_0015_lifeng: 'Lifeng',
  chr_0016_laevat: 'Laevatain', chr_0017_yvonne: 'Yvonne', chr_0018_dapan: 'Da Pan',
  chr_0020_meurs: 'Catcher', chr_0032_lizhiyan: 'Arcane', chr_0033_camille: 'Camille',
  chr_0036_jsspsi: 'Si', chr_0038_purrche: 'Purrchena',
};

// ---- art ----
// Art is hot-linked from the Endfield Talos Wiki (splash art, then icon, then a monogram).
// To self-host instead: run `node scripts/fetch-art.mjs`, then set ART_LOCAL = true.
const ART_LOCAL = false;
const ART_SPLASH_FILE = { Endministrator: 'Endministrator_(Female)' }; // names whose wiki file differs

// ---- skill-level synergy tags ----
// Only what is confirmed from the wiki is listed. Everything else falls back to class rules (see synergy.js).
// applies: Arts Infliction it puts on enemies ('inf:any' = any element) | provides: vuln, status, amp, heal, shield,
// protect, sp, ultgain | wants: what its kit consumes ('inf:<El>', 'react', 'phys')
const TAGS = {
  Gilberta: { applies: ['inf:nature'], provides: ['amp', 'ultgain'], wants: ['react'],
    note: 'Combo triggers when an Arts Reaction lands. Ultimate adds Arts Susceptibility, stronger per Vulnerable stack. Talent raises ultimate gain for allied Guards, Casters and Supporters.' },
  Laevatain: { note: 'Final Strikes absorb Heat Infliction from nearby enemies to power her skills.' },
  Perlica: { applies: ['inf:electric'], note: 'Applies Electric Infliction and Electrification for the rest of the team.' },
  Camille: { applies: ['inf:heat'], provides: ['amp', 'sp'], note: 'Heat Infliction, Weakness and Heat Susceptibility, and restores a lot of SP.' },
  Arcane: { applies: ['inf:nature', 'inf:any'], note: 'Long-lasting Corrosion. Her combo skill can apply an Arts Infliction of any element.' },
  'Chen Qianyu': { provides: ['vuln'], note: 'Builds Vulnerable stacks quickly and deals heavy single-target Stagger.' },
  Ember: { provides: ['heal', 'shield', 'protect'], note: 'Heals the controlled operator and shields every teammate with her ultimate.' },
  Catcher: { provides: ['protect', 'amp'], note: 'Grants Protection to allies and Weakens enemies.' },
  Liino: { applies: ['inf:electric'], provides: ['heal', 'amp'], note: 'Treatment, ATK boost and Electrification.' },
  Typhoeus: { note: 'Consumes Nature Infliction for Burst damage.' },
  Si: { provides: ['amp'], note: 'Artful Intent records damage taken and converts it into Fixed DMG.' },
  Endministrator: { note: 'Crowd control with a combo skill that caters to other operators.' },
};
