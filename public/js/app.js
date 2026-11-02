// ---- page chrome: nav, footer, Talos-II background (helpers live in core.js) ----
// ---- chrome ----
document.body.insertAdjacentHTML('afterbegin',`<header><a class="logo" href="/">TALOS<i>-</i>II ARCHIVES</a><nav>${[['/','Home','home'],['/account','Account','account'],['/team','Team Builder','team']].map(([h,t,p])=>`<a href="${h}" class="${document.body.dataset.page===p?'on':''}">${t}</a>`).join('')}</nav></header>`);
const HOME=document.body.dataset.page==='home';
if(!HOME)document.body.insertAdjacentHTML('afterbegin','<canvas id="bg"></canvas><div class="hud"></div>');
document.body.insertAdjacentHTML('beforeend','<footer style="padding:24px;text-align:center;color:var(--dim);font-size:13px">Talos-II Archives is an unofficial fan project, not affiliated with Hypergryph or Gryphline. Player data via Enka.Network. Operator art and data: Hypergryph/Gryphline, shown via the Endfield Talos Wiki (CC BY-SA).</footer>');
// ---- Talos-II: dusk sky, orbital ring, parallax ridgelines, drifting originium dust ----
if(!HOME)(()=>{const c=$('#bg'),x=c.getContext('2d');let w,h,t=0,mx=0;const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const P=Array.from({length:80},()=>({x:Math.random(),y:Math.random(),s:Math.random()*1.8+.4,v:Math.random()*.0006+.0002}));
const S=Array.from({length:90},()=>[Math.random(),Math.random()*.5,Math.random()]);
const rs=()=>{w=c.width=innerWidth;h=c.height=innerHeight};rs();addEventListener('resize',rs);addEventListener('pointermove',e=>mx=e.clientX/w-.5);
const R=[[.60,.10,'#3a2325',.4,1],[.69,.13,'#241719',.7,2],[.79,.16,'#150f12',1.1,3],[.90,.18,'#0a080b',1.6,4]];
function ridge(b,a,col,sp,k){x.fillStyle=col;x.beginPath();x.moveTo(0,h);for(let i=0;i<=w+8;i+=8){const u=i/w*3+t*.0009*sp+mx*sp*.25+k*7;x.lineTo(i,h*b-a*h*(Math.sin(u*2)*.5+Math.sin(u*5.3+k)*.3+Math.sin(u*11.7+k*2)*.12))}x.lineTo(w,h);x.fill()}
function tower(px,py,s){x.fillStyle='#0a080b';x.fillRect(px-2*s,py-60*s,4*s,60*s);x.fillRect(px-14*s,py-46*s,28*s,3*s);x.fillStyle='rgba(255,210,31,.9)';x.fillRect(px-1*s,py-64*s,2*s,4*s)}
function f(){t++;let g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#06080d');g.addColorStop(.4,'#17141d');g.addColorStop(.62,'#6a3a2b');g.addColorStop(.74,'#e58c45');x.fillStyle=g;x.fillRect(0,0,w,h);
x.fillStyle='#fff';S.forEach(([a,b,m])=>{x.globalAlpha=.25+.5*Math.abs(Math.sin(t*.01+m*9))*(1-b*1.6);x.fillRect(a*w,b*h,1.3,1.3)});x.globalAlpha=1;
x.strokeStyle='rgba(255,210,31,.35)';x.lineWidth=1;const cx=w*.72,cy=h*.26;for(let i=0;i<3;i++){x.beginPath();x.ellipse(cx,cy,w*(.18+i*.025),w*(.045+i*.008),-.32,0,7);x.globalAlpha=.5-i*.15;x.stroke()}x.globalAlpha=1;
x.fillStyle='rgba(255,196,120,.9)';x.beginPath();x.arc(cx,cy,w*.012+4,0,7);x.fill();
R.forEach(([b,a,col,sp,k],i)=>{ridge(b,a,col,sp,k);if(i==2)tower(w*.18-mx*30,h*.79-6,h/700);if(i==1)tower(w*.83-mx*14,h*.70-4,h/1100);const hz=x.createLinearGradient(0,h*(b-.1),0,h*(b+.1));hz.addColorStop(0,'rgba(229,140,69,0)');hz.addColorStop(1,'rgba(229,140,69,.13)');x.fillStyle=hz;x.fillRect(0,h*(b-.1),w,h*.2)});
x.fillStyle='rgba(255,196,90,.8)';P.forEach(p=>{p.y-=p.v;p.x+=Math.sin(t*.01+p.s)*.0003;if(p.y<0){p.y=1;p.x=Math.random()}x.globalAlpha=.15+p.s/3;x.fillRect(p.x*w,p.y*h,p.s,p.s)});x.globalAlpha=1;
if(!reduce)requestAnimationFrame(f)}f()})();

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

// ---- landing scene: gray field, black-space circle, Dijiang in space, operator art in front, loading-backdrop linework ----
if(HOME)(()=>{
  const op=lookup(HERO_OP), bgName=BG_ART.length?BG_ART[Math.floor(Math.random()*BG_ART.length)]:null;
  const lines='<svg class="lines" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="#000" stroke-width="1.2"><circle cx="360" cy="640" r="330"/><circle cx="360" cy="640" r="250" stroke-dasharray="3 9"/><circle cx="360" cy="640" r="120"/><path d="M-20 780 L760 150 M40 900 L900 220 M-20 520 L420 120"/><path d="M0 700H800M360 280V900" stroke-dasharray="2 10"/><path d="M110 560l-14 0m14 0l14 0M96 560l14 -10M610 740l18 0M619 731v18"/></svg>';
  const orbArt=op?`<img class="opart" alt="" decoding="async" referrerpolicy="no-referrer" src="${esc(artChain(op,960)[0])}" data-i="0" data-c="${esc(JSON.stringify(artChain(op,960)))}" onerror="artErr(this)">`:'';
  document.body.insertAdjacentHTML('afterbegin',`<div class="scene" aria-hidden="true">${lines}${bgName?`<div class="bgart"><img alt="" src="/img/bg/${esc(bgName)}.png" onerror="this.parentNode.remove()"></div>`:''}<div class="orb"><canvas id="space"></canvas><img class="dij" alt="" src="${esc(DIJIANG_IMG)}" hidden>${orbArt}<i class="rim"></i></div><i class="vig"></i></div>`);
  const orb=$('.orb'),c=$('#space'),x=c.getContext('2d'),dij=$('.dij');let w,h,t=0,img=false,mx=0;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  dij.onload=()=>{img=true;dij.hidden=false};dij.onerror=()=>{img=false};
  const S=Array.from({length:220},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.3+.3,m:Math.random()*9}));
  const rs=()=>{const r=orb.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=c.width=r.width*d;h=c.height=r.height*d;x.setTransform(d,0,0,d,0,0);w/=d;h/=d};rs();addEventListener('resize',()=>{rs();draw()});
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5});
  // procedural Dijiang silhouette: long spine, docking ring, solar vanes, a few lit windows
  function station(cx,cy,u,a){x.save();x.translate(cx,cy);x.rotate(a);
    const g=x.createLinearGradient(0,-u*3,0,u*3);g.addColorStop(0,'#3a3d46');g.addColorStop(.5,'#15161b');g.addColorStop(1,'#07070a');
    x.fillStyle=g;x.strokeStyle='rgba(190,205,230,.35)';x.lineWidth=1;
    x.beginPath();x.rect(-u*9,-u*.55,u*18,u*1.1);x.fill();x.stroke();           // spine
    for(let i=-8;i<=8;i+=2){x.fillRect(i*u-u*.35,-u*1.3,u*.7,u*2.6);x.strokeRect(i*u-u*.35,-u*1.3,u*.7,u*2.6)} // trusses
    x.beginPath();x.ellipse(-u*2.5,0,u*1.2,u*3.6,0,0,7);x.stroke();             // docking ring
    x.beginPath();x.ellipse(-u*2.5,0,u*.6,u*3.6,0,0,7);x.stroke();
    x.fillRect(u*3,-u*4.6,u*4.5,u*.35);x.fillRect(u*3,u*4.25,u*4.5,u*.35);x.strokeRect(u*3,-u*4.6,u*4.5,u*.35);x.strokeRect(u*3,u*4.25,u*4.5,u*.35); // vanes
    x.fillRect(u*3.2,-u*4.25,u*.18,u*3.7);x.fillRect(u*3.2,u*.55,u*.18,u*3.7);
    x.beginPath();x.moveTo(u*9,-u*.55);x.lineTo(u*11.5,0);x.lineTo(u*9,u*.55);x.fill();x.stroke(); // nose
    x.fillStyle='rgba(255,210,31,.9)';for(let i=-7;i<=7;i+=2)if((i*7+t/40|0)%3)x.fillRect(i*u,-u*.1,u*.28,u*.2);
    x.restore()}
  function draw(){t++;x.clearRect(0,0,w,h);
    const sg=x.createRadialGradient(w*.7,h*.35,0,w*.7,h*.35,w*.7);sg.addColorStop(0,'#10131c');sg.addColorStop(1,'#000');x.fillStyle=sg;x.fillRect(0,0,w,h);
    x.fillStyle='#fff';S.forEach(s=>{x.globalAlpha=.2+.6*Math.abs(Math.sin(t*.012+s.m));x.fillRect((s.x+mx*.01*s.r)*w,s.y*h,s.r,s.r)});x.globalAlpha=1;
    if(!img)station(w*(.5+mx*.015)+Math.sin(t*.004)*6,h*.42+Math.cos(t*.003)*4,w*.017,-.22);
    if(!reduce)requestAnimationFrame(draw)}
  draw();
})();
