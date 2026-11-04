// ---- operator detail page data (used by /operators/<name>) ----
// Needs data.js and core.js. OP_DETAIL is hand-written extra context (strategy, partners, stats, potentials), confirmed on the Endfield Talos Wiki
// (CC BY-SA) and kept short. The profile, skills, talents and base skills of EVERY operator come from /data/operators.json, which
// `npm run sync` (scripts/sync-operators.mjs) writes from the wiki. Nothing here calls the wiki while a visitor browses.

const WIKI_PAGE = 'https://endfield.wiki.gg/wiki';
const wikiUrl = (o, sub = '') => `${WIKI_PAGE}/${encodeURIComponent(o.name.replace(/ /g, '_'))}${sub}`;

// short role text per class (consistent with the rules in synergy.js)
const CLASS_INFO = {
  Guard: 'Front-line melee fighters. They hit hard, build Stagger and set up Physical status effects for the rest of the squad.',
  Caster: 'Ranged Arts users. They apply Arts Inflictions of their own element so other operators can trigger reactions.',
  Striker: 'Damage dealers. Most of them consume Inflictions or statuses the team has already put on the enemy, so they want a supplier next to them.',
  Supporter: 'Enhance allies and weaken enemies, with Amp, buffs and debuffs that raise the whole squad\'s damage.',
  Vanguard: 'Fast openers that generate SP so the squad can cast its skills more often.',
  Defender: 'Protect the squad with shields, protection and sustain so the damage dealers can keep working.',
};

// element facts from the wiki's Element page
const ELEMENT_INFO = {
  Physical: { dmg: 'white', text: 'No Arts Infliction. A skill with a Physical Status first applies Vulnerable; Lift and Knock Down add Vulnerable stacks (up to 4), and Crush or Breach on a Vulnerable enemy consumes them.' },
  Heat: { dmg: 'red', text: 'Heat Infliction on an enemy that has a different Arts Infliction triggers Combustion, which deals Heat DMG over time. A second Heat Infliction on the same enemy causes a Heat Burst.' },
  Cryo: { dmg: 'cyan', text: 'Cryo Infliction on a different Arts Infliction triggers Solidification, which stops the target from acting (Elite and Boss enemies are immune). A Physical Status on a Solidified enemy causes Shatter, a burst of Physical DMG.' },
  Nature: { dmg: 'green', text: 'Nature Infliction on a different Arts Infliction triggers Corrosion, which deals Nature DMG and steadily lowers the target\'s Resistance.' },
  Electric: { dmg: 'yellow', text: 'Electric Infliction on a different Arts Infliction triggers Electrification, which deals Electric DMG and makes the target take more Arts DMG for a while.' },
};

// combat skill types as the synced data names them -> the label shown on the page
const SKILL_LABEL = { Basic: 'Basic Attack', Battle: 'Battle Skill', Combo: 'Combo Skill', Ultimate: 'Ultimate' };

// ---- shipped operator data ----
// skills: [type, name, description]; stats: max-level (Elite max) values; keep descriptions short, the wiki has the full numbers.
const OP_DETAIL = {
  Laevatain: {
    faction: 'Rhodes Island', race: 'Sarkaz', tags: ['Damage Dealer', 'Combust'], attrs: 'Main: Intellect · Sub: Strength', obtain: 'Chartered Headhunting',
    quote: 'Haven\'t we met already? Hmph. Doesn\'t matter. You\'ll remember me by this sword and flame.',
    stats: [['HP', 5495], ['ATK', 318], ['STR', 121], ['AGL', 99], ['INT', 177], ['WIL', 89]],
    strategy: 'Wants another operator to apply Heat Infliction so she can absorb it with Final Strikes. At 4 absorbed stacks her battle skill forces Combustion on every enemy in a large area and refunds a lot of ultimate energy, which also fires her combo skill. During her ultimate she applies Heat Infliction herself, so the cycle keeps going without help. Operators that inflict Combustion or Corrosion directly also trigger her combo skill.',
    consumes: ['Heat Infliction'], inflicts: ['Combustion'],
    partners: [['Wulfgard', 'Her combo skill gives free Heat Inflictions, her battle skill can spend Laevatain\'s Combustion for extra damage, and her ultimate applies Combustion in a large area, which triggers Laevatain\'s combo skill.'],
      ['Ardelia', 'Final Strikes make Laevatain absorb Heat Infliction and then trigger Ardelia\'s combo skill as long as no Inflictions remain, which makes it easy to chain into Laevatain\'s combo skill.']],
    skills: [
      ['Basic Attack', 'Flaming Cinders', 'A five-hit sequence of Heat DMG. As the controlled operator the Final Strike also deals 18 Stagger. A mid-air basic attack becomes a dive attack, and near a Staggered enemy it becomes a finisher that deals massive Heat DMG and recovers some SP.'],
      ['Battle Skill', 'Smouldering Fire', 'Costs 100 SP. Summons a Magma Fragment that keeps attacking for Heat DMG; each hit grants a Melting Flame stack. With 4 stacks it consumes them for an extra attack that forces Combustion on all enemies in a large area and restores extra ultimate energy. Stronger while the ultimate is active.'],
      ['Combo Skill', 'Seethe', 'Triggers when an enemy suffers Combustion or Corrosion. Fire erupts under every such enemy for Heat DMG, grants a Melting Flame stack and gives ultimate energy per enemy hit (25 / 30 / 35 for one, two or three enemies). Cooldown 10s (9s at rank 12).'],
      ['Ultimate', 'Twilight', 'Costs 300 ultimate energy and lasts 15s. Summons her Sviga Lævi and makes her the controlled operator. Her basic attacks are enhanced and the Sviga Lævi strikes with her; sequence 3 applies Heat Infliction. Casting the battle or combo skill does not shorten the duration.'],
    ],
    talents: [['Scorching Heart', 'Absorbs Heat Infliction from enemies hit by a Final Strike, before the hit is counted.']],
    potentials: [
      ['Heart of Melting Flame', 'Smouldering Fire\'s extra attack multiplier is 1.2x, and a hit returns 20 SP.'],
      ['Pursuit of Memories', 'Intellect +20, Basic Attack DMG +15%.'],
      ['Fragments from the Past', 'Combustion from her battle skill lasts 50% longer and deals 1.5x DMG.'],
      ['Ice Cream Furnace', 'Ultimate energy cost -15%.'],
      ['Proof of Existence', 'Enhanced basic attack multiplier 1.2x; each enemy defeated during the ultimate adds 1s (max +7s).'],
    ],
    weapons: ['Forgeborn Scathe', 'Umbral Torch', 'White Night Nova', 'Fortmaker'],
  },
  Si: {
    faction: '', race: '', tags: [], attrs: '', obtain: 'Rejuvenation banner',
    strategy: 'A Cryo Supporter whose Artful Intent records damage taken and converts part of it into Fixed DMG when it expires. If the operator in the first team slot is Heat, her battle skill deals Heat DMG instead of Cryo. Her ultimate gives the whole team Cryo and Heat Amp.',
    skills: [
      ['Basic Attack', 'Standard sequence', 'A five-hit sequence that deals heavy Cryo DMG and restores SP.'],
      ['Battle Skill', 'Brushwork Realm', 'Applies Artful Intent to the target while dealing Cryo DMG (Heat DMG if the first-slot operator is Heat). Artful Intent records part of the DMG the target takes and, when it expires, deals a set amount of AOE damage based on what was recorded; this ignores DEF, RES and DMG reduction. The skill then becomes Initial Stroke, which pulls an Inksoul from the marked target (damage and effects on it are shared with the host), and then Final Stroke, which costs no DP and sends the Inksoul back early for the same explosion.'],
      ['Combo Skill', 'Fully Envisioned', 'Triggers when an enemy\'s Cryo DMG or Heat Inflictions are consumed or absorbed. Summons an Ink Lung that deals massive DMG, scaling with the target\'s elemental stacks.'],
      ['Ultimate', 'No One Spoils the Fun', 'Summons a Giant Ink Lung that deals Cryo DMG, gives the whole team Cryo and Heat Amp for a while and shortens the combo skill cooldown of the operator in the first slot.'],
    ],
  },
};

// ---- synced data: public/data/operators.json (written by `npm run sync`) ----
// One static file, fetched once per page view and kept in memory. Resolves null when the file is missing or unreadable, so the
// page can say "run the sync" instead of breaking. Shape: { generatedAt, source, count, operators: { <slug>: record } }; see scripts/lib/parse-operator.mjs.
let _opdb;
function loadOperatorDb() {
  return _opdb ||= fetch('/data/operators.json').then(r => r.ok ? r.json() : null).then(j => j && j.operators ? j : null).catch(() => null);
}
const opRecord = (db, o) => (db && db.operators && db.operators[opSlug(o.name)]) || null;
