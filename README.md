# Talos-II_Archives beta 1.0
Static site in `public/` + one Vercel function `api/uid.js` (Enka proxy). No build step.

Deploy: push to GitHub, import on Vercel (framework: Other). Local: `npx vercel dev`.

Before launch, verify two things (could not be tested offline):
1. Enka Endfield path. Default `https://enka.network/api/endfield/uid/{uid}`; override with env `ENKA_ENDFIELD_URL`.
2. Response field names. Fetch a real UID, open "Raw response" on /account, then adjust `normalize()` in `public/js/app.js`.
Roster element/class values live in `ROSTER` (same file); `null` = unconfirmed.
