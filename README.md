# Talos-II Archives beta 1.2 (formerly End:Tech)
Static site in `public/` + one Vercel function `api/uid.js` (Enka proxy). No build step.

Deploy: push to GitHub, import on Vercel (framework: Other). Local: `npx vercel dev` (a plain static server has no `/api`).
Tests (no network needed): `npm test`.

## What changed in 1.2
- **Account tab**: no UID box. Enter the UID on the home page and press Enter; /account opens already scanning it (skeleton while loading). With no UID it shows only the header and a line saying to insert the UID from the Home tab. The UID is kept for the browser session so the Account tab keeps working after you visit other tabs.
- **Background (all pages)**: gray field, black-space circle with the Dijiang (cut-out at `public/img/bg/dijiang.png`) in front of the stars, and one operator's loading-backdrop art in front of the Dijiang. The "Operator art" button on the home page picks the operator and remembers it. Put each backdrop at `public/img/bg/<key>.png` (key = lowercase name, no spaces: `avywenna.png`, `chenqianyu.png`). Until a file exists, drawn linework tinted in the operator's element color is shown. Config at the bottom of `public/js/data.js`; blend/opacity via `--art-blend` and `--art-o` on `.orb`.
- **Operator cards (team builder, account)**: splash art is zoomed onto the operator. Defaults in `ART_FOCUS_DEFAULT`; override per operator in `ART_FOCUS` as `'Name': [x%, y%, zoom]`.

## What changed in 1.1
- **Fetching player data**: the response mapping now follows Enka's real Endfield shape (`playerInfo.businessCard`, `charList[].templateId`, `statistic`), operators are resolved from internal ids like `chr_0013_aglina`, the proxy honours Enka's `ttl`, retries a second path only on a non-JSON 404, maps Enka's 400/404/424/429/500/503, and has a 9s timeout. The account page caches per UID for the ttl and gives a clear message if `/api/uid` is not running.
- **Team builder**: 34 operators with rarity/class/weapon/element, splash art cards, filters (element, class, rarity, owned), search, shareable link.
- **Synergy checker**: score, six breakdown bars, per-check notes, "who feeds whom" links, and best-fit suggestions for open slots.

## Before launch, verify (could not be tested against live Enka from the build environment)
1. Endpoint path. Default `https://enka.network/api/endfield/uid/{uid}`; override with env `ENKA_ENDFIELD_URL`. Open `/api/uid?uid=<real uid>&debug=1` to see which URL answered.
2. Unmapped ids. Any operator whose id is not in `ID_MAP` (`public/js/data.js`) shows as "Unmapped" on /account with its raw id. Add `chr_xxxx_name: 'Operator Name'`.
3. Art. Cards hot-link the Endfield Talos Wiki. To self-host: `npm run art`, then set `ART_LOCAL = true` in `public/js/data.js`.

## Data you maintain
`public/js/data.js`: `ROSTER` (new operators go here), `ID_MAP`, `TAGS` (skill-level synergy facts; only confirmed ones listed). `public/js/synergy.js` holds the rules.
