// ---- page chrome: nav, footer, Talos-II background (helpers live in core.js) ----
// ---- chrome ----
document.body.insertAdjacentHTML('afterbegin',`<header><a class="logo" href="/">END<i>:</i>TECH</a><nav>${[['/','Home','home'],['/account','Account','account'],['/team','Team builder','team']].map(([h,t,p])=>`<a href="${h}" class="${document.body.dataset.page===p?'on':''}">${t}</a>`).join('')}</nav></header>`);
document.body.insertAdjacentHTML('afterbegin','<canvas id="bg"></canvas><div class="hud"></div>');
document.body.insertAdjacentHTML('beforeend','<footer style="padding:24px;text-align:center;color:var(--dim);font-size:13px">End:Tech is an unofficial fan project, not affiliated with Hypergryph or Gryphline. Player data via Enka.Network. Operator art and data: Hypergryph/Gryphline, shown via the Endfield Talos Wiki (CC BY-SA).</footer>');
// ---- Talos-II: dusk sky, orbital ring, parallax ridgelines, drifting originium dust ----
(()=>{const c=$('#bg'),x=c.getContext('2d');let w,h,t=0,mx=0;const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
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
