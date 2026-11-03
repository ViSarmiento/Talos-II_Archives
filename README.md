# Talos-II Archives beta 1.9.4 (formerly End:Tech)
Static site in `public/` + one Vercel function `api/uid.js` (Enka proxy). No build step.

Deploy: push to GitHub, import on Vercel (framework: Other). Local: `npx vercel dev` (a plain static server has no `/api`).
Tests (no network needed): `npm test`.

## What changed in 1.9.4 (bug fixes)
- **Root cause of the loader bugs**: the loader and the Operators/Team Builder filter bar both used `id=\"fl\"`, so the filter chips were written into the loading screen. The loader is now `#ldr`.
- **Loading screen**: animation slowed (`CFG.speed`, `spin`, `breathSec`; first page min 3.4s, later pages 1.1s). Clicking any tab covers the old page at once with \"Syncing to <page>\"; the next page's loader continues it. First load of a visit ends on \"Welcome Endministrator\" at 100%; all other loads say \"Syncing to Home / Account / Operators / Team Builder\". The \"Protocol-Originium\" text is removed.
- **Loader gate**: pages call `FL.wait(promise)` (in `loader.js`) to keep the loader up until content is ready. Operators and Team Builder wait for fonts, the background art, and the operator art in view (`artReady()` in `core.js`), capped at 7s. Team Builder also computes Fun comps behind the loader, and the one-time icon lookup runs behind it too.
- **No fallback flash**: operator initials are hidden unless every art source failed (`.art.lost`). Art fades in (`.pic.on`). The first 12 cards load eagerly with high priority (`artEager()`), the rest lazily.
- **Decryption animation restored** on the Operators and Team Builder headers: it starts as the loader clears and its clock starts on the first painted frame, so a busy page can no longer swallow it.

## Loading screen (1.9.3)
- `public/js/loader.js` (loaded first in every page's `<head>`): a gold-and-dark-gray **fluctlight inside an inverted pyramid**, modelled on the Protocol-Originium core. Plain canvas, no libraries, no audio.
- Features: flowing light that swirls down to the point, a slow **breathing** (scale + glow, `breathSec`), a simulated **speech fluctuation** (edges ripple, light surges, a ripple spreads under the apex), nested core pyramid, progress bar tied to the real page `load` event.
- First page of a visit shows it for at least `firstMs` (2.8s); later pages only `nextMs`. Add `?loader=1` to the URL to force the full version. Reduced-motion users get a still frame.
- Title decrypt and sidebar slide-in now wait until the loader is gone. Colours and timings are in `CFG` at the top of `loader.js`.

## What changed in 1.9.1
- **Landing circle**: the violet backdrop art and glow are gone; the Dijiang is the only subject, about 1.5x bigger. `--dj-x` / `--dj-y` now pin its **centre**, so `--dj-w` (size) can be changed without it drifting.
- **UID search (Home)**: no longer routes to /account. The result opens in an Endfield-style terminal on the right of the page (boot lines, "awaiting response", then name, stats and showcase operators; Esc or CLOSE dismisses it). View only. Code: `public/js/terminal.js`.
- **UID search (Account)**: same terminal, plus **ADD ACCOUNT**. Added accounts are stored (`et.accts`, active one in `et.acct`). With 2+ accounts a **Switch account** dropdown appears; **Remove account** removes the active one. The old recent-UID chips and "Change UID" link are gone.
- **Name search**: Enka only looks accounts up by numeric UID, so typing a name shows a clear message instead of a lookup. "Try demo data" still works.
- **Team Builder, account vs no account**: with at least one account added it works as before (locks, unlock animation, reveal). With **no account** there are no locks, silhouettes or decryption: every operator is a plain card, and the Add operators button and Owned only filter are hidden.
- **Locked operator in a team slot**: a locked operator you click onto the team now stays a dark silhouette with a lock in its slot (marked "locked") instead of showing its splash art.
- **Synergy checker**: new **team styles** (Inferno Squad, Rainbow Reactor, Four Corners, Glass Cannon, Underdog Union, Ultimate Spam and more) with a **flair** rating for how unusual the squad is (it does not change the synergy score). **Best fits** are now mixed across classes and elements and say which style a pick creates. New **Fun comps** panel rolls three random squads that score well and have different, distinctive styles; "My operators only" limits it to your account. Rules live in `archetype()` and `funComps()` in `public/js/synergy.js`.

## What changed in 1.9
- **Landing circle**: restyled to match the beta 1.5 look. The dark purple halftone backdrop (with its grid) fills the left half, no warm glow. Stars are **still** (no twinkle, no cross-flares, no shooting stars; a fixed seed, drawn once). The Dijiang sits in the **bottom right** of the circle, tilted so it looks like it is passing through, with the rim hiding only a sliver of its tail. Tune it with `--dj-x`, `--dj-y`, `--dj-w`, `--dj-r` (tilt) and `--dj-b` (brightness) on `.orb` in `style.css`.
- **Team Builder**: the first time you hover an unlocked operator its art is revealed, and it **stays revealed** after the pointer leaves (and after a reload; stored as `et.rev`). Add mode never reveals. Locking an operator again clears it, so it is a silhouette until hovered again after re-unlocking.

## What changed in 1.8
- **Landing circle**: the Endministrator is gone. The circle uses the purple halftone operator backdrop again (`public/img/bg/operator-art.png`, filled purple by `.orb .oart i`) with the stars, and the Dijiang is bigger and sits fully inside the circle. Move or resize it with `--dj-x`, `--dj-y`, `--dj-w` on `.orb` in `style.css`.
- **Operators tab is a database**: plain splash art for every operator. No silhouettes, no locks, no "owned" filter. Those only exist in the Team Builder.
- **Character boxes show the whole splash art** (no zoom or centring) in the Team Builder, Operators and team slots.
- **Team Builder locks**: the lock is centred in the box, just the lock with no box behind it. The unlock animation (shackle opens, gold glow) only plays when you click a box in Add mode. Unlocked operators stay silhouettes; once you press Done adding, hovering one sweeps a scan line up from the bottom to reveal the art, and leaving sweeps it back down (the reference video). Hover does not reveal while Add mode is on.
- **Bug fix, all art vanishing on unlock**: the whole grid used to be re-created on every click, so every image reloaded and fell back to the monogram for a moment. Each box is now built once and only its class changes; searching and filtering re-order the same boxes.
- **Element and class icons**: the site looks once per day for real icons in `public/img/icons/element/` and `public/img/icons/class/` (see the README there), then for wiki files named `<Name>_icon.png`, and keeps the stand-in glyphs for any it cannot find.

## What changed in 1.5
- **Sidebar** replaces the top bar: a slim icon rail on the left that slides open on hover/focus (or pin it with the arrow at the bottom). A highlight glides between tabs. Icons are files in `public/img/icons/` (white shape on transparent, tinted by CSS): `home.png` (mini Dijiang, made from the background cut-out), `account.svg`, `team.svg`, `operators.svg`. The account and team icons are stand-ins; drop the in-game icons over those files (same names, white on transparent) and they are picked up automatically.
- **Footer** is fixed to the bottom of the window and no longer scrolls.
- **Centred operator art**: cards and team slots now find the operator inside the splash (alpha cut-out) and centre it, instead of a fixed crop. This needs the image to be readable by the page: hot-linked wiki images are asked for with CORS; if the wiki does not allow it the page falls back to the old fixed crop (`ART_FOCUS` still works). For guaranteed centring run `npm run art` and set `ART_LOCAL = true` (same-origin files can always be measured).
- **Endministrator** shows the male and female splash side by side in one frame (`ART_DUO` in `core.js`; file names `Endministrator_(Male)` / `Endministrator_(Female)`).
- **Landing circle**: the chosen operator is now a moving silhouette (dark, glowing in their element colour) that drifts, leans toward the cursor, flickers, and decrypts upward when you pick another operator. It uses the operator's splash art; if that cannot load it falls back to the old halftone backdrop. The Dijiang in the circle is now `public/img/bg/dijiang.jpg`.
- **Operators page** (`/operators`): the same cards as the team builder (Endministrator shows male and female together). Click a card to mark "I own this". Marked operators are stored in the browser (`et.owned`); on the Account tab, any that Enka did not return appear under "Added by you". The team builder also counts them as owned. Operators fetched from Enka show "On your account" and cannot be toggled.
- **Account tab**: the "To see account information..." message is centred.

## What changed in 1.7
- **Landing circle**: back to black space. Twinkling stars in three depth layers (pointer parallax, now and then a shooting star), the new Dijiang cut-out (`public/img/bg/dijiang.webp`) hovering and drifting, and the Endministrator (`endmin.webp`, checkerboard removed) blended in on the left, looking toward the ship. The operator picker, the landing cards and the silhouette in the circle are gone.
- **Sidebar**: sections like the reference: Home and Account on top, DATABASE (Operators), TOOLS (Team Builder). The slide-in intro now plays once per visit instead of on every tab change.
- **Character boxes** (Team Builder, Operators): four per row (two on phones), bigger, with element and class icons (stand-in glyphs in `ICO_EL` / `ICO_CLS` in `core.js`; swap for the real icons there).
- **Locked / unlocked**: operators you do not own are dark silhouettes in their element colour with a small lock on the side of the box. They still sway, lean toward the pointer, glow and flicker on hover, but never show the art. Owned operators (fetched on the Account tab or added by hand) play the lock-opens animation, then decrypt from silhouette to art with the name scrambling in. That plays once per operator (`et.unl` in the browser); after that the art simply shows.
- **Add operators**: moved from the Operators tab to the Team Builder. The button sits at the right of the search row; while it is on, clicking a box unlocks or removes it. The "I own this" / "On your account" labels and tick boxes are gone. Operators on the fetched account stay unlocked.

## What changed in 1.2
- **Account tab**: no UID box. Enter the UID on the home page and press Enter; /account opens already scanning it (skeleton while loading). With no UID it shows only the header and a line saying to insert the UID from the Home tab. The UID is kept for the browser session so the Account tab keeps working after you visit other tabs.
- **Background (all pages)**: gray field, black-space circle with the Dijiang (picture at `public/img/bg/dijiang.jpg`, fills the circle), and one operator's loading-backdrop art in front of the Dijiang. The "Operator art" button on the home page picks the operator and remembers it. Put each backdrop at `public/img/bg/<key>.png` (key = lowercase name, no spaces: `avywenna.png`, `chenqianyu.png`). Until a file exists, drawn linework tinted in the operator's element color is shown. Config at the bottom of `public/js/data.js`; blend/opacity via `--art-blend` and `--art-o` on `.orb`.
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
