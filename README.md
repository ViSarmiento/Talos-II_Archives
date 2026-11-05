# Talos-II Archives (formerly End:Tech)
Current version: **beta 1.5**. See `CHANGELOG.md` for the version history.

A fan-made Arknights: Endfield companion: an operator database, a Team Builder with a synergy checker, and an account viewer that reads a player's showcase by UID.

Static site in `public/` plus one Vercel function, `api/uid.js` (an Enka proxy). No build step.

## Setup
- **Deploy**: push to GitHub and import on Vercel (framework: Other). `vercel.json` serves `public/` with clean URLs.
- **Local**: `npx vercel dev`. A plain static server has no `/api`, so UID lookups only work through Vercel's dev server.
- **Tests** (no network needed): `npm test` runs `scripts/selftest.js` (synergy rules) and `scripts/apitest.js` (the Enka mapping).
- Requires Node 20 or newer.

## Pages
- **Home** (`/`): landing circle with the Dijiang over a still starfield, and the UID search. A search opens an Endfield-style terminal on the right (boot lines, then name, stats and showcase operators; Esc or CLOSE dismisses it). View only. Typing a name instead of a UID shows "You need to enter a UID." in the terminal.
- **Account** (`/account`): the same UID search with **ADD ACCOUNT**. Added accounts are kept in the browser; with 2 or more, a **Switch account** dropdown appears, and **Remove account** removes the active one. Searching by name is not possible (Enka only looks up numeric UIDs), so a name shows "You need to enter a UID." instead; "Try demo data" works without a UID.
- **Operators** (`/operators`): a plain database of all 34 operators with rarity, class, weapon and element, splash art, search and filters. No locks or silhouettes here. Each card links to that operator's page.
- **Operator page** (`/operators/<name>`, e.g. `/operators/laevatain`): splash art and a facts grid (rarity, class, element, weapon, faction, main and sub attribute, role tags, how to obtain, internal id), then a **terminal-style Basic Info panel** (gender, authentication, date of birth, race, Oripathy status, the four physical exam grades, expertise, hobbies, recommended weapons), an overview, **collapsible combat skills** (basic, battle, combo, ultimate, each with its icon), **talents** and **base skills** with their tier-by-tier effects, then stats, potentials, team play (what the operator consumes, inflicts and provides, plus best fits from the squad checker) and class and element notes, with links to the wiki and to the previous and next operator. All of the wiki data comes from `public/data/operators.json` (see **Operator data sync**); nothing is fetched from the wiki while someone browses. `/operators/:slug` is rewritten to `/operator` (operator.html) in `vercel.json`, and `public/404.html` forwards a missed slug to `?op=`. `?op=<name>` on `/operator` also works.
- **Team Builder** (`/team`): pick a squad of operators, filter and search the pool, share the team by link, and read the synergy analysis.
  - With **no account** added, every operator is a plain card. The Add operators button and the Owned only filter are hidden.
  - With an account added, operators you do not own are dark silhouettes in their element colour with a centred lock. **Add operators** (right of the search row) lets you click a box to unlock or remove it; the unlock animation only plays in Add mode. Operators on the fetched account stay unlocked.
  - After Done adding, hovering an unlocked operator sweeps a scan line up to reveal the art. It stays revealed afterwards, and after a reload. Locking an operator clears that. A locked operator on the team stays a silhouette with a lock in its slot.
- **Sidebar**: a slim icon rail that slides open on hover or focus (pin it with the arrow at the bottom). Sections: Home and Account, DATABASE (Operators), TOOLS (Team Builder). The footer is fixed to the bottom of the window.

## Synergy checker
Score, six breakdown bars, per-check notes, and "who feeds whom" links. **Best fits** for open slots are mixed across classes and elements and say which style a pick creates. Squads get a **team style** (Inferno Squad, Rainbow Reactor, Four Corners, Glass Cannon, Underdog Union, Ultimate Spam and more) and a **flair** rating for how unusual they are; flair does not change the score. The **Fun comps** panel rolls three random high-scoring squads with different styles ("My operators only" limits it to your account). Rules live in `public/js/synergy.js` (`archetype()`, `funComps()`).

## Loading screen
`public/js/loader.js` is loaded first in every page's `<head>`: a gold and dark-gray fluctlight inside an inverted pyramid, drawn on a plain canvas with no libraries or audio.
- It covers every page load and every tab switch. The first load of a visit ends on "Welcome Endministrator" at 100%; all other loads read "Syncing to <page>".
- It stays up until fonts, the background art and the operator art in view are ready (capped at 7s), so content never renders bare or pops in. Pages hold it with `FL.wait(promise)`.
- The pyramid turns at `CFG.spin` (1.0 rad/s). Minimum time is 3.4s on the first page of a visit and 1.1s after. Add `?loader=1` to force the full version. Reduced-motion users get a still frame.
- Colours, speed and timings are in `CFG` at the top of `loader.js`. The loader's element id is `#ldr`; keep it distinct from page ids such as the filter bar's `#fl`.

## Operator art and icons
- Cards hot-link the Endfield Talos Wiki and show the **whole splash art**. Endministrator shows the male and female splash side by side (`ART_DUO` in `public/js/core.js`).
- Art fades in, and the initials fallback only appears if every art source has failed. The first 12 cards load first, the rest lazily.
- To self-host the art: `npm run art`, then set `ART_LOCAL = true` in `public/js/data.js`.
- **Class, element and rarity icons** come from the official Endfield Talos Wiki: `Guard.png`, `Caster.png`, `Striker.png`, `Support.png`, `Vanguard.png`, `Defender.png`, `Heat.png` (and `Cryo`, `Nature`, `Electric`, `Physical` by the same naming) and `Star.svg`. The site checks once a day in the browser (`icoCandidates()` in `core.js`) and falls back to the stand-in glyphs in `ICO_EL` / `ICO_CLS` / `STAR_SVG` if a file cannot be loaded. To use your own, put files in `public/img/icons/element/`, `class/` and `rarity/` (file names in `public/img/icons/README.txt`); they take priority. Clear the `et.icoMap.v3` localStorage key to re-check at once.
- **Sidebar icons** are in `public/img/icons/` (white shape on transparent, tinted by CSS): `home.png`, `account.svg`, `team.svg`, `operators.svg`. Account and team are stand-ins; replace them with the in-game icons using the same names.
- **Landing circle**: the Dijiang is `public/img/bg/dijiang.webp`. Tune it with `--dj-x` / `--dj-y` (its centre), `--dj-w` (size), `--dj-r` (tilt) and `--dj-b` (brightness) on `.orb` in `public/css/style.css`.

## Data you maintain
`public/js/data.js`: `ROSTER` (new operators go here), `ID_MAP` (internal id to operator name), `TAGS` (skill-level synergy facts; only confirmed ones are listed). `public/js/opdata.js`: `OP_DETAIL` (hand-written extras for the operator pages: strategy, partners, stats and potentials; Laevatain and Si so far; its skills and talents are only used when the synced file has none for that operator), `CLASS_INFO` and `ELEMENT_INFO`. `public/js/synergy.js` holds the rules.

## Operator data sync
`npm run sync` (`scripts/sync-operators.mjs`, Node 20+, no packages) reads each operator in `ROSTER` from `https://endfield.wiki.gg/api.php` (`action=parse`), and writes:
- `public/data/operators.json`: one record per operator with the header (name, rarity, class, weapon, element, faction, tags, main and sub attribute, how to obtain), the profile (gender, authentication, date of birth, race, Oripathy status, physical exam, expertise, hobbies, recommended weapons), combat skills (type, name, icon, description, and `scaling`: the per-rank level table as `levels` plus `rows` of `{ label, values }`), talents and base skills (icon and tier-by-tier effects).
- `public/img/wiki/`: every icon those records use, downloaded once and referenced as `/img/wiki/<file>`.
Commit both. Run it again when the wiki changes or a new operator is added to `ROSTER`.
- `npm run sync -- Laevatain Si` syncs only those and keeps the rest of the file. `--refresh` ignores the saved wiki HTML in `scripts/.cache/` (git-ignored) and fetches again. `--no-icons` skips downloads. `--offline` never uses the network: it reads `scripts/.cache` and keeps only icons already in `public/img/wiki/`. `--delay=<ms>` sets the pause between requests (500 by default). Set `WIKI_UA` to your own User-Agent if the wiki answers 403.
- The parser (`scripts/lib/parse-operator.mjs`) reads the page by its visible labels and heading ids, not by CSS classes. An operator that comes back without skills, talents or base skills is listed at the end of the run. `npm run sync -- --debug Laevatain` also writes `scripts/.cache/laevatain.tokens.txt`, the exact line-by-line view the parser reads, which is what to look at (or send over) when a section is wrong.
- `npm test` runs the parser against `scripts/fixtures/laevatain.html`.

## Data stored in the browser
`et.accts` and `et.acct` (added accounts and the active one), `et.owned` (operators added by hand), `et.rev` (revealed operators), `et.icoMap.v3` (icon lookup cache), and `et.fl` (session flag for the loading screen).

## Before launch, verify
Not testable against live Enka from the build environment.
1. **Endpoint path**. Default `https://enka.network/api/endfield/uid/{uid}`; override with env `ENKA_ENDFIELD_URL`. Open `/api/uid?uid=<real uid>&debug=1` to see which URL answered.
2. **Unmapped ids**. An operator whose id is not in `ID_MAP` shows as "Unmapped" on /account with its raw id. Add `chr_xxxx_name: 'Operator Name'`.
3. **Operator data**. Run `npm run sync` once and commit `public/data/operators.json` and `public/img/wiki/`. Until then the operator pages show "NO SYNCED FILE" in the Basic Info panel. Open `/operators/rossi` afterwards: the profile, four skills, talents and base skills should all be there. Check the end of the sync log for operators that came back without talents or base skills (see **Operator data sync**).
4. **Art**. Hot-linked wiki images depend on the wiki staying up; self-host with `npm run art` if needed.