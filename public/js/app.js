// ---- page chrome: nav, footer, shared background (helpers live in core.js) ----
const HOME=document.body.dataset.page==='home';
const SU=(()=>{try{return sessionStorage.getItem('et.uid')||''}catch{return ''}})(); // UID entered on the home page this session
const PAGE=document.body.dataset.page;
const NAV=[['/','Home','home','/img/icons/home.png'],['/account'+(SU?'?uid='+SU:''),'Account','account','/img/icons/account.svg'],{sec:'Database'},['/operators','Operators','operators','/img/icons/operators.svg'],{sec:'Tools'},['/team','Team Builder','team','/img/icons/team.svg']];
const pinned=load('et.rail',false);
document.body.insertAdjacentHTML('afterbegin',`<aside class="rail${pinned?' pin':''}" id="rail" aria-label="Site"><a class="rl-logo" href="/" aria-label="Talos-II Archives"><span class="mk">T<i>II</i></span><span class="tx">TALOS<i>-</i>II<br>ARCHIVES</span></a><nav><i class="ind" aria-hidden="true"></i>${NAV.map(n=>n.sec?`<div class="sec" aria-hidden="true"><span class="tx">${n.sec}</span></div>`:(([h,t,p,ic])=>`<a href="${h}" class="${PAGE===p?'on':''}"${PAGE===p?' aria-current="page"':''} title="${t}"><span class="ic" style="--m:url(${ic})" aria-hidden="true"></span><span class="tx">${t}</span></a>`)(n)).join('')}</nav><button class="rl-pin" type="button" id="rlp" aria-label="Keep sidebar open" aria-pressed="${pinned}"><span aria-hidden="true">${pinned?'‹':'›'}</span><span class="tx">Collapse</span></button></aside>`);
(()=>{const r=document.getElementById('rail');try{if(sessionStorage.getItem('et.railin'))r.style.animation='none';else sessionStorage.setItem('et.railin','1')}catch{}})(); // slide-in intro only on the first page of a visit, not on every tab change
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

// ---- background: gray field, black-space circle with stars, the purple operator backdrop, the Dijiang hovering ----
(()=>{
  const lines='<svg class="lines" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#000" stroke-width="1.2"><circle cx="360" cy="640" r="330"/><circle cx="360" cy="640" r="250" stroke-dasharray="3 9"/><circle cx="360" cy="640" r="120"/><path d="M-20 780 L760 150 M40 900 L900 220 M-20 520 L420 120"/><path d="M0 700H800M360 280V900" stroke-dasharray="2 10"/><path d="M110 560l-14 0m14 0l14 0M96 560l14 -10M610 740l18 0M619 731v18"/></svg>';
  document.body.insertAdjacentHTML('afterbegin',`<div class="scene" aria-hidden="true">${lines}<div class="orb"><canvas id="space"></canvas><div class="glow"></div><div class="oart"><i></i></div><div class="dwrap"><img class="dij" alt="" src="${esc(DIJIANG_IMG)}" onerror="this.remove()"></div><i class="rim"></i></div><i class="vig"></i></div>`);
  const orb=$('.orb'),c=$('#space'),x=c.getContext('2d');let w=0,h=0,t=0,vis=true,shoot=null;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  // three depth layers of stars: far ones are small and slow, near ones bigger and drift more; pointer shifts them by depth
  const S=Array.from({length:260},(_,i)=>{const d=i%3;return{x:Math.random(),y:Math.random(),d,r:[.5,.9,1.5][d]*(.7+Math.random()*.6),m:Math.random()*9,sp:[.004,.009,.018][d],hue:Math.random()<.18?(Math.random()<.5?'255,214,150':'170,200,255'):'255,255,255'}});
  let px=0,py=0,tx=0,ty=0;
  const rs=()=>{const r=orb.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;c.width=w*d;c.height=h*d;x.setTransform(d,0,0,d,0,0)};
  rs();addEventListener('resize',()=>{rs();draw()});
  let raf=0;addEventListener('pointermove',e=>{tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;orb.style.setProperty('--px',tx.toFixed(2));orb.style.setProperty('--py',ty.toFixed(2))})});
  new IntersectionObserver(e=>{vis=e[0].isIntersecting;if(vis&&!reduce)draw()}).observe(orb);
  function draw(){
    if(!vis)return;t++;px+=(tx-px)*.05;py+=(ty-py)*.05;x.clearRect(0,0,w,h);
    const g=x.createRadialGradient(w*.62,h*.4,0,w*.62,h*.4,w*.75);g.addColorStop(0,'#0d1220');g.addColorStop(.6,'#04060b');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,w,h);
    for(const s of S){
      const par=[6,16,34][s.d];let X=((s.x-t*s.sp*.0006*(s.d+1))%1+1)%1*w-px*par,Y=(s.y*h+Math.sin(t*.004+s.m)*2)-py*par*.6;
      const a=.25+.75*Math.abs(Math.sin(t*.015*(s.d+1)*.6+s.m));x.globalAlpha=a;x.fillStyle='rgb('+s.hue+')';
      if(s.d===2){x.beginPath();x.arc(X,Y,s.r,0,6.3);x.fill();x.globalAlpha=a*.35;x.fillRect(X-s.r*3.2,Y-.4,s.r*6.4,.8);x.fillRect(X-.4,Y-s.r*3.2,.8,s.r*6.4)} // near stars get a little cross-flare
      else x.fillRect(X,Y,s.r,s.r)}
    x.globalAlpha=1;
    // now and then a shooting star crosses the circle
    if(!shoot&&Math.random()<.0035)shoot={x:Math.random()*w*.8+w*.2,y:Math.random()*h*.35,vx:-(9+Math.random()*6),vy:4+Math.random()*3,l:0};
    if(shoot){const s=shoot,gr=x.createLinearGradient(s.x,s.y,s.x-s.vx*7,s.y-s.vy*7);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');x.strokeStyle=gr;x.lineWidth=1.4;x.beginPath();x.moveTo(s.x,s.y);x.lineTo(s.x-s.vx*7,s.y-s.vy*7);x.stroke();s.x+=s.vx;s.y+=s.vy;if(++s.l>60)shoot=null}
    if(!reduce)requestAnimationFrame(draw)}
  draw();
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
