// ---- page chrome: nav, footer, shared background (helpers live in core.js) ----
const HOME=document.body.dataset.page==='home';
const SU=(()=>{try{return sessionStorage.getItem('et.uid')||''}catch{return ''}})(); // UID entered on the home page this session
const PAGE=document.body.dataset.page;
const NAV=[['/','Home','home','/img/icons/home.png'],['/account'+(SU?'?uid='+SU:''),'Account','account','/img/icons/account.svg'],['/team','Team Builder','team','/img/icons/team.svg'],['/operators','Operators','operators','/img/icons/operators.svg']];
const pinned=load('et.rail',false);
document.body.insertAdjacentHTML('afterbegin',`<aside class="rail${pinned?' pin':''}" id="rail" aria-label="Site"><a class="rl-logo" href="/" aria-label="Talos-II Archives"><span class="mk">T<i>II</i></span><span class="tx">TALOS<i>-</i>II<br>ARCHIVES</span></a><nav><i class="ind" aria-hidden="true"></i>${NAV.map(([h,t,p,ic])=>`<a href="${h}" class="${PAGE===p?'on':''}"${PAGE===p?' aria-current="page"':''} title="${t}"><span class="ic" style="--m:url(${ic})" aria-hidden="true"></span><span class="tx">${t}</span></a>`).join('')}</nav><button class="rl-pin" type="button" id="rlp" aria-label="Keep sidebar open" aria-pressed="${pinned}"><span aria-hidden="true">${pinned?'‹':'›'}</span><span class="tx">Collapse</span></button></aside>`);
if(SU)document.querySelectorAll('a.card[href="/account"]').forEach(a=>a.href='/account?uid='+SU);
(()=>{ // the highlight glides to whichever tab you point at, and back to the current page
  const rail=$('#rail'),nav=$('nav',rail),ind=$('.ind',nav),cur=$('a.on',nav);
  const place=a=>{if(!a){ind.style.opacity=0;return}ind.style.opacity=1;ind.style.height=a.offsetHeight+'px';ind.style.transform=`translateY(${a.offsetTop}px)`};
  place(cur);requestAnimationFrame(()=>requestAnimationFrame(()=>ind.classList.add('go')));
  nav.querySelectorAll('a').forEach(a=>{a.addEventListener('pointerenter',()=>place(a));a.addEventListener('focus',()=>place(a))});
  nav.addEventListener('pointerleave',()=>place(cur));nav.addEventListener('focusout',e=>{if(!nav.contains(e.relatedTarget))place(cur)});
  const pin=$('#rlp');pin.onclick=()=>{const on=rail.classList.toggle('pin');pin.setAttribute('aria-pressed',on);pin.firstChild.textContent=on?'‹':'›';save('et.rail',on)};
})();
// fixed footer: sits at the bottom of the window and never scrolls
document.body.insertAdjacentHTML('beforeend','<footer>Talos-II Archives is an unofficial fan project, not affiliated with Hypergryph or Gryphline. Player data via Enka.Network. Operator art and data: Hypergryph/Gryphline, shown via the Endfield Talos Wiki (CC BY-SA).</footer>');

// ---- background: gray field, black-space circle, Dijiang in space, operator backdrop art in front ----
(()=>{
  const lines='<svg class="lines" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#000" stroke-width="1.2"><circle cx="360" cy="640" r="330"/><circle cx="360" cy="640" r="250" stroke-dasharray="3 9"/><circle cx="360" cy="640" r="120"/><path d="M-20 780 L760 150 M40 900 L900 220 M-20 520 L420 120"/><path d="M0 700H800M360 280V900" stroke-dasharray="2 10"/><path d="M110 560l-14 0m14 0l14 0M96 560l14 -10M610 740l18 0M619 731v18"/></svg>';
  document.body.insertAdjacentHTML('afterbegin',`<div class="scene" aria-hidden="true">${lines}<div class="orb"><img class="dij" alt="" src="${esc(DIJIANG_IMG)}" onerror="this.remove()"><i class="opart"></i><div class="osil"><div class="par"><div class="float"><div class="fig"></div></div></div><i class="scan"></i></div><i class="rim"></i></div><i class="vig"></i></div>`);
  const orb=$('.orb'),art=$('.opart'),osil=$('.osil'),fig=$('.fig',osil);let cur='';
  // the operator is a dark silhouette in their element colour that drifts, leans toward the cursor and flickers
  function setOp(name){const o=lookup(name)||lookup(BG_DEFAULT);if(!o||o.name===cur)return;const first=!cur;cur=o.name;save('et.bgop',o.name);
    orb.style.setProperty('--sc',COL[o.element]||'#ccc');orb.classList.remove('nosil');
    fig.innerHTML=`<div class="lay s${ART_DUO[o.name]?' duo':''}" data-part="1">${artLayer(o,640,'sp')}</div>`;
    osil.classList.remove('wipe');void osil.offsetWidth;osil.classList.add('wipe');
    // fallback if the splash cannot be loaded at all: the old halftone backdrop, tinted
    const use=u=>art.style.setProperty('--art','url('+u+')'),own=BG_DIR+key(o.name)+'.png',im=new Image();
    use(BG_SHARED);im.onload=()=>{if(cur===o.name)use(own)};im.src=own;
    const b=$('#pk b');if(b)b.textContent=o.name;document.querySelectorAll('#pkl [data-n]').forEach(e=>e.setAttribute('aria-selected',e.dataset.n===o.name))}
  osil.addEventListener('artlost',()=>{if(!$('.pic',fig))orb.classList.add('nosil')});
  let raf=0;addEventListener('pointermove',e=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;orb.style.setProperty('--px',(e.clientX/innerWidth*2-1).toFixed(2));orb.style.setProperty('--py',(e.clientY/innerHeight*2-1).toFixed(2))})});
  // operator picker (home page only)
  if(HOME){
    const list=[...ROSTER].sort((a,b)=>b.rarity-a.rarity||a.name.localeCompare(b.name));
    document.body.insertAdjacentHTML('beforeend',`<div class="pick"><div class="pl" id="pkl" role="listbox" aria-label="Operator art" hidden>${list.map(o=>`<button type="button" role="option" data-n="${esc(o.name)}" aria-selected="false" style="--c:${COL[o.element]}">${esc(o.name)}<small>${stars(o.rarity)}</small></button>`).join('')}</div><button type="button" id="pk" aria-expanded="false" aria-controls="pkl">Operator art<b></b> ▾</button></div>`);
    const pk=$('#pk'),pl=$('#pkl'),close=()=>{pl.hidden=true;pk.setAttribute('aria-expanded','false')};
    pk.onclick=e=>{e.stopPropagation();const open=pl.hidden;pl.hidden=!open;pk.setAttribute('aria-expanded',open);if(open)pl.querySelector('[aria-selected=true]')?.scrollIntoView({block:'center'})};
    pl.onclick=e=>{const b=e.target.closest('[data-n]');if(b){setOp(b.dataset.n);close()}};
    document.addEventListener('click',e=>{if(!e.target.closest('.pick'))close()});
    addEventListener('keydown',e=>{if(e.key==='Escape'){close();pk.focus()}});
  }
  setOp(load('et.bgop',BG_DEFAULT));
})();

// ---- decryption text effect: characters cycle through random glyphs, then lock in left to right (with some jitter) ----
const GLYPHS = 'ABCDEFGHKLNPRSTUVXYZ0123456789#$%@<>=+*?'; // medium-width glyphs only: wide ones (W, M, &) would overflow their slot
const GLYPHS_NARROW = '1I|!:;/\\-[](){}';
function decrypt(el, { delay = 0, duration = 1800, accent = '' } = {}) {
  const text = el.dataset.text || el.textContent.trim();
  el.dataset.text = text; el.setAttribute('aria-label', text);
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) { el.style.visibility = 'visible'; return }
  const chars = [];
  el.textContent = '';
  text.split('\n').forEach((line, li) => {
    if (li) el.appendChild(document.createElement('br'));
    for (const ch of line) {
      const s = document.createElement('span');
      s.className = 'dc' + (accent.includes(ch) ? ' ac' : ''); s.setAttribute('aria-hidden', 'true'); s.textContent = ch;
      el.appendChild(s); chars.push({ s, ch });
    }
  });
  chars.forEach(c => { c.w = c.s.getBoundingClientRect().width }); // lock each glyph's final width so the layout does not jump
  const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
  const rnd = c => { const p = c.w < fs * 0.5 ? GLYPHS_NARROW : GLYPHS; return p[Math.floor(Math.random() * p.length)] };
  chars.forEach(c => { if (c.ch !== ' ') { c.s.style.display = 'inline-block'; c.s.style.width = c.w + 'px'; c.s.textContent = rnd(c); c.s.classList.add('u') } });
  el.style.visibility = 'visible';
  const lock = chars.map((_, i) => (i / Math.max(chars.length - 1, 1)) * duration); // strictly left to right, one letter after another
  const t0 = performance.now() + delay; let last = 0;
  (function tick(now) {
    const t = now - t0, refresh = now - last > 70; // slower glyph refresh than a 60fps flicker, so the scramble is readable
    if (refresh) last = now;
    let left = 0;
    chars.forEach((c, i) => {
      if (c.fin || c.ch === ' ') return;
      if (t >= lock[i]) { c.s.textContent = c.ch; c.s.classList.remove('u'); c.fin = true }
      else { left++; if (refresh) c.s.textContent = rnd(c) }
    });
    if (left) requestAnimationFrame(tick);
  })(performance.now());
}
(() => {
  const els = [...document.querySelectorAll('[data-decrypt]')]; // page titles only, the nav tabs stay static
  els.forEach(e => { e.style.visibility = 'hidden' });
  const go = () => els.forEach((e, i) => decrypt(e, e.dataset.decrypt ? { delay: 200, duration: e.tagName === 'H1' ? 1500 : 900, accent: e.dataset.accent || '' } : { delay: 80 + i * 100, duration: 800 }));
  Promise.race([document.fonts?.ready, new Promise(r => setTimeout(r, 1200))]).then(go, go);
})();
