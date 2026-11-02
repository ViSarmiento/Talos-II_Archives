# Talos-II Archives beta 1.2 (formerly End:Tech)
Static site in `public/` + one Vercel function `api/uid.js` (Enka proxy). No build step.

Deploy: push to GitHub, import on Vercel (framework: Other). Local: `npx vercel dev` (a plain static server has no `/api`).
Tests (no network needed): `npm test`.

## What changed in 1.2
- **Account tab**: the UID box is gone. Enter the UID on the home page, press Enter, and /account opens already scanning that UID (skeleton while loading). Opening the Account tab with no UID reopens the last one; "Change UID" goes back home.
- **Landing background**: gray field, black-space circle with the Dijiang in space, operator splash art in front, and the operator loading-backdrop linework in one section. Config is at the bottom of `public/js/data.js` (`HERO_OP`, `BG_ART`, `DIJIANG_IMG`). Drop backdrop files in `public/img/bg/<name>.png` (e.g. `avywenna.png`) and the Dijiang picture at `public/img/bg/dijiang.png`; missing files fall back to drawn linework and a drawn Dijiang silhouette.

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
