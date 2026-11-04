# Changelog
Newest first. A new minor version is only used for a big change; small fixes are folded into the version they belong to.

## 1.5 (current)
- **Operator pages now read a local, synced data file.** `npm run sync` (`scripts/sync-operators.mjs`) pulls every operator from `endfield.wiki.gg/api.php`, writes `public/data/operators.json` and downloads the icons to `public/img/wiki/`. The page no longer calls the wiki while someone browses (the live skill loader and its 7-day browser cache are gone).
- Operator page: new terminal-style **Basic Info** panel (gender, authentication, date of birth, race, Oripathy status, physical exam, expertise, hobbies, recommended weapons with icons); header facts now include faction, main and sub attribute, role tags and how to obtain; **combat skills** are collapsible with their icons and an Expand all button; new **Talents** and **Base skills** sections with tier-by-tier effects. The page structure is otherwise unchanged. Laevatain's and Si's hand-written strategy, stats and potentials stay.
- New **loading screen**: a gold and dark-gray fluctlight inside an inverted pyramid (plain canvas, no libraries or audio) with flowing light, slow breathing, a simulated speech fluctuation and a progress bar tied to the real page load.
- Runs at about 74% speed. Minimum display time is 3.4s on the first page of a visit and 1.1s on later pages; `?loader=1` forces the full version; reduced-motion users get a still frame.
- Shown on **every page and tab switch**. Clicking a tab covers the old page at once, and the next page's loader continues it.
- First load ends on "Welcome Endministrator" at 100%; every other load reads "Syncing to Home / Account / Operators / Team Builder". No "Protocol-Originium" text.
- The loader waits (`FL.wait()`) for fonts, the background art and the operator art in view, capped at 7s. Team Builder computes Fun comps behind it and the one-time icon lookup also runs behind it, so nothing pops in afterwards.
- Title decrypt and sidebar slide-in wait until the loader is gone.
- Fix: the loader and the Operators/Team Builder filter bar shared `id="fl"`, so the filter chips were written into the loading screen. The loader is now `#ldr`.
- Fix: operator initials no longer flash before the art loads. They only show if every art source failed, art fades in, and the first 12 cards load first.
- Fix: the header decryption animation on Operators and Team Builder is restored. It starts as the loader clears and counts its time from the first painted frame.
- Loading screen: the inverted pyramid now rotates about 3x faster (`spin` in `CFG`, 0.3 to 1.0 rad/s). Only the rotation changed; the minimum display times, the progress timing and the waits are untouched.
- Searching a name instead of a UID (Home and Account) now shows one message in the terminal, "You need to enter a UID.", in a hazard-striped alert, instead of the PARSE QUERY / ERR lines.
- **Class, element and rarity icons now use the official ones from endfield.wiki.gg** (`Guard.png`, `Support.png`, `Heat.png`, `Star.svg` ...). Rarity stars are icons too. Your own files in `public/img/icons/` still win, the glyphs remain as a fallback, and the cache key is now `et.icoMap.v3` so old lookups are re-checked.
- **Operator pages**: a card on the Operators page opens `/operators/<name>` (for example `/operators/laevatain`) with the splash art, rarity, class, element, weapon, internal id, role overview, the four skills, team play (what it consumes, inflicts and provides, plus best fits from the squad checker), class and element notes, wiki links and previous/next operator. Laevatain and Si ship with their full data in `public/js/opdata.js` (`OP_DETAIL`); other operators load their skills live from the wiki and fall back to a link if that fails. `vercel.json` rewrites `/operators/:slug` to `operator.html`.
- Fix: clicking an operator on `/operators` returned Vercel's 404 (`/operators/<slug>`). The rewrite in `vercel.json` now targets `/operator` instead of `/operator.html` (the `.html` destination does not resolve with `cleanUrls`), and `public/404.html` forwards any missed `/operators/<slug>` to `/operator?op=<slug>`. `selftest.js` checks the rewrite for every operator.

## 1.4
- Landing circle restyle: still stars (fixed seed, no twinkle, flares or shooting stars) and the Dijiang as the only subject, about 1.5x bigger, bottom right and tilted so it looks like it is passing through. The violet backdrop art and glow are gone. `--dj-x` / `--dj-y` pin its centre; also `--dj-w`, `--dj-r`, `--dj-b`.
- Home UID search no longer routes to /account. The result opens in an Endfield-style terminal on the right (`public/js/terminal.js`).
- Account UID search uses the same terminal plus **ADD ACCOUNT**. Added accounts are stored (`et.accts`, active one in `et.acct`), with a Switch account dropdown for 2+ accounts and a Remove account action. The recent-UID chips and "Change UID" link are gone.
- Searching by name shows a clear message, since Enka only looks up numeric UIDs. "Try demo data" still works.
- Team Builder: an unlocked operator's art stays revealed after the first hover and after a reload (`et.rev`). Add mode never reveals; locking an operator again clears it.
- Team Builder with no account: no locks, silhouettes or decryption; every operator is a plain card, and the Add operators button and Owned only filter are hidden.
- A locked operator clicked onto the team stays a dark silhouette with a lock in its slot (marked "locked").
- Synergy checker: **team styles** (Inferno Squad, Rainbow Reactor, Four Corners, Glass Cannon, Underdog Union, Ultimate Spam and more) with a **flair** rating that does not change the score. Best fits are mixed across classes and elements and name the style they create.
- New **Fun comps** panel: three random high-scoring squads with different styles; "My operators only" limits it to your account (`archetype()` and `funComps()` in `synergy.js`).

## 1.3
- Landing circle: purple halftone operator backdrop (`public/img/bg/operator-art.png`) with stars and a bigger Dijiang cut-out (`dijiang.webp`) fully inside the circle. The operator picker, landing cards, circle silhouette and Endministrator are removed. Move or resize the Dijiang with `--dj-x`, `--dj-y`, `--dj-w`.
- Sidebar sections: Home and Account, DATABASE (Operators), TOOLS (Team Builder). The slide-in intro plays once per visit.
- Operators tab is a plain database: splash art for every operator, no silhouettes, locks, "owned" filter or "I own this" marking.
- Character boxes (Team Builder, Operators, team slots): four per row (two on phones), bigger, with element and class icons, showing the whole splash art with no zoom or centring.
- Team Builder locks: unowned operators are dark silhouettes in their element colour with a centred lock, and they sway, lean toward the pointer, glow and flicker on hover. The unlock animation (shackle opens, gold glow) plays only on a click in Add mode. After Done adding, hover sweeps a scan line up to reveal the art and back down when the pointer leaves; Add mode never reveals.
- **Add operators** moved to the Team Builder (right of the search row); fetched-account operators stay unlocked.
- Fix: all art vanished on unlock because the grid was rebuilt on every click. Each box is now built once and only its class changes; search and filters re-order the same boxes.
- Element and class icons: stand-in glyphs (`ICO_EL` / `ICO_CLS`), plus a daily lookup for real icons in `public/img/icons/element/` and `class/`, then wiki files named `<Name>_icon.png`.

## 1.2
- **Sidebar** replaces the top bar: an icon rail that slides open on hover or focus, can be pinned, with a highlight that glides between tabs. Icons are files in `public/img/icons/` (`home.png`, `account.svg`, `team.svg`, `operators.svg`).
- **Footer** is fixed to the bottom of the window.
- **Centred operator art**: the operator is found inside the splash (alpha cut-out) and centred. Hot-linked images are requested with CORS; if the wiki refuses, it falls back to the fixed crop (`ART_FOCUS`). `npm run art` with `ART_LOCAL = true` guarantees centring.
- **Endministrator** shows the male and female splash side by side (`ART_DUO` in `core.js`).
- Landing circle: the chosen operator is a moving silhouette in their element colour that drifts, leans toward the cursor, flickers, and decrypts upward when you pick another operator; it falls back to the halftone backdrop if the art cannot load. The Dijiang is `public/img/bg/dijiang.jpg`.
- **Operators page** (`/operators`): the same cards as the Team Builder. Click a card to mark "I own this" (`et.owned`); marked operators appear under "Added by you" on the Account tab and count as owned in the Team Builder. Operators fetched from Enka show "On your account" and cannot be toggled.
- Account tab: the "To see account information..." message is centred.

## 1.1
- **Account tab**: no UID box. Enter the UID on the home page and press Enter; /account opens already scanning it (skeleton while loading). With no UID it shows only the header and a line saying to insert the UID from Home. The UID is kept for the browser session.
- **Background (all pages)**: gray field, black-space circle with the Dijiang (`public/img/bg/dijiang.jpg`) and one operator's loading-backdrop art in front of it. An "Operator art" button on the home page picks and remembers the operator. Backdrops go at `public/img/bg/<key>.png` (lowercase name, no spaces); until a file exists, linework tinted in the operator's element colour is shown. Blend and opacity via `--art-blend` and `--art-o` on `.orb`.
- **Operator cards** (Team Builder, Account): splash art zoomed onto the operator. Defaults in `ART_FOCUS_DEFAULT`; per-operator overrides in `ART_FOCUS` as `'Name': [x%, y%, zoom]`.

## 1.0
- **Fetching player data**: the response mapping follows Enka's real Endfield shape (`playerInfo.businessCard`, `charList[].templateId`, `statistic`). Operators are resolved from internal ids like `chr_0013_aglina`. The proxy honours Enka's `ttl`, retries a second path only on a non-JSON 404, maps Enka's 400/404/424/429/500/503, and has a 9s timeout. The account page caches per UID for the ttl and gives a clear message if `/api/uid` is not running.
- **Team Builder**: 34 operators with rarity, class, weapon and element, splash art cards, filters (element, class, rarity, owned), search and a shareable link.
- **Synergy checker**: score, six breakdown bars, per-check notes, "who feeds whom" links, and best-fit suggestions for open slots.