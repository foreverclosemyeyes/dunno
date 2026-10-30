'use strict';
// =====================================================================
//  등불식당 — 게임 본체
// =====================================================================
const SAVEKEY='deungbul-diner-v1';
let S=null,MAP=null,mode='title'; // title | creator | play
const cv=$('game'),ctx=cv.getContext('2d');let VW=0,VH=0,SC=3;
const night=document.createElement('canvas'),nx=night.getContext('2d');
function resize(){const w=innerWidth,h=innerHeight;SC=Math.max(2,Math.floor(Math.min(w/320,h/220)));VW=Math.ceil(w/SC);VH=Math.ceil(h/SC);
  cv.width=VW;cv.height=VH;cv.style.width=VW*SC+'px';cv.style.height=VH*SC+'px';night.width=VW;night.height=VH;ctx.imageSmoothingEnabled=false;}
addEventListener('resize',resize);

// ---------------- 상태 ----------------
function newState(name,look){
  return{v:1,name:name||'사장님',look:look||{hair:1,hc:2,top:0,acc:1},day:1,min:360,weather:'sun',tomorrow:'sun',map:'out',px:7*T+8,py:7*T+12,dir:'down',
    gold:120,inv:{s_radish:[6,0,0],s_potato:[3,0,0],radish:[0,2,0]},seed:'s_radish',water:20,canLv:0,rodLv:0,
    tilled:{},wet:{},crops:{},weeds:{},mush:{},recipes:START_RECIPES.slice(),seedsAvail:START_SEEDS.slice(),
    spiritIdx:0,metCur:false,guests:[],guestDay:0,journal:{},dishLog:{},flags:{},todayEarn:0,stats:{fish:0,harvest:0,cook:0,earned:0}};
}
function save(){try{localStorage.setItem(SAVEKEY,JSON.stringify(S));}catch(e){}}
function loadSave(){try{const j=localStorage.getItem(SAVEKEY);return j?JSON.parse(j):null;}catch(e){return null;}}
function cnt(id){if(id==='fish_small')return FISH_SMALL.reduce((a,k)=>a+cnt(k),0);const a=S.inv[id];return a?a[0]+a[1]+a[2]:0;}
function addInv(id,q=1,n=1){(S.inv[id]||(S.inv[id]=[0,0,0]))[clamp(q,1,3)-1]+=n;hudKey='';}
function takeInv(id,n=1){const out=[];if(id==='fish_small'){for(const k of FISH_SMALL)while(n>0&&cnt(k)>0){out.push(...takeInv(k,1));n--;}return out;}
  const a=S.inv[id];if(!a)return out;for(let q=2;q>=0&&n>0;q--)while(a[q]>0&&n>0){a[q]--;n--;out.push(q+1);}if(!cnt(id))delete S.inv[id];hudKey='';return out;}
const canMax=()=>S.canLv?40:20;
const isNight=()=>S.min>=18*60;

// ---------------- 입력 ----------------
const keys={},INP={down:false,pressed:false,released:false};let joy={x:0,y:0};
function press(){initAudio();if(!INP.down){INP.down=true;INP.pressed=true;}}
function release(){if(INP.down){INP.down=false;INP.released=true;}}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
  if(mode!=='play'){if(mode==='title'&&(k==='enter'||k===' ')){($('bCont').hidden?$('bNew'):$('bCont')).click();e.preventDefault();}return;}
  if(document.activeElement&&document.activeElement.tagName==='INPUT')return;
  if(k===' '||k==='e'||k==='j'||k==='enter'){if(!e.repeat)press();e.preventDefault();return;}
  if(k==='escape'){closePanel();return;}
  if(PANEL.open){if((k==='tab'||k==='i')&&PANEL.kind==='basket'){closePanel();e.preventDefault();}return;}
  keys[k]=true;if(k.startsWith('arrow'))e.preventDefault();
  if(DLG.open||CK.on)return;
  if(k==='tab'||k==='i'){e.preventDefault();if(!F)openBasket();}
  if(k==='q')cycleSeed();
  if(k==='m'){AU.music=!AU.music;if(AU.ctx)AU.mT=AU.ctx.currentTime+.1;toast(AU.music?'음악을 켰어요':'음악을 껐어요');}
});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k===' '||k==='e'||k==='j'||k==='enter')release();});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;release();});
function cycleSeed(){const list=Object.keys(S.inv).filter(k=>ITEMS[k]&&ITEMS[k].kind==='seed'&&cnt(k)>0);if(!list.length){toast('씨앗이 없어요. 식당 안 장부에서 주문해요.');return;}
  const i=list.indexOf(S.seed);S.seed=list[(i+1)%list.length];hudKey='';toast(ITEMS[S.seed].n+' 고름',S.seed);}
const isTouch=matchMedia('(pointer:coarse)').matches;
(function(){const st=$('stick'),kn=$('knob');let id=null,cx=0,cy=0;
  st.addEventListener('pointerdown',e=>{initAudio();id=e.pointerId;const r=st.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;st.setPointerCapture(id);mv(e);e.preventDefault();});
  const mv=e=>{if(e.pointerId!==id)return;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy),m=44;if(d>m){dx*=m/d;dy*=m/d;}kn.style.transform=`translate(${dx}px,${dy}px)`;joy.x=Math.abs(dx)>8?dx/m:0;joy.y=Math.abs(dy)>8?dy/m:0;};
  st.addEventListener('pointermove',mv);const up=e=>{if(e.pointerId!==id)return;id=null;joy.x=joy.y=0;kn.style.transform='';};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  const a=$('btnA');a.addEventListener('pointerdown',e=>{e.preventDefault();a.setPointerCapture(e.pointerId);press();});a.addEventListener('pointerup',release);a.addEventListener('pointercancel',release);
  $('btnBag').addEventListener('pointerdown',e=>{e.preventDefault();if(!PANEL.open&&!DLG.open&&!CK.on&&!F)openBasket();});
  $('hseed').addEventListener('pointerdown',e=>{e.preventDefault();if(!PANEL.open&&!DLG.open&&!CK.on)cycleSeed();});
  $('hlan').addEventListener('pointerdown',e=>{e.preventDefault();if(!PANEL.open&&!DLG.open&&!CK.on&&!F)openBasket('guest');});
  $('cooktap').addEventListener('pointerdown',e=>{e.preventDefault();press();});$('cooktap').addEventListener('pointerup',release);$('cooktap').addEventListener('pointerleave',release);
})();

// ---------------- 지도/충돌 ----------------
function setMap(id){MAP=id==='in'?INN:OUT;S.map=id;}
function solidAt(x,y){if(!MAP.inb(x,y))return true;const g=MAP.ground[MAP.ix(x,y)];if(g===WA||g===WL)return true;const o=MAP.ogrid[MAP.ix(x,y)];return!!(o&&o.solid);}
function boxFree(px,py){const x0=Math.floor((px-5)/T),x1=Math.floor((px+5)/T),y0=Math.floor((py-5)/T),y1=Math.floor((py-1)/T);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(solidAt(x,y))return false;return true;}
const DIRV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function facing(){const[dx,dy]=DIRV[S.dir];return[Math.floor((S.px+dx*12)/T),Math.floor((S.py-4+dy*12)/T)];}
const objAt=(x,y)=>MAP.inb(x,y)?MAP.ogrid[MAP.ix(x,y)]:null;

// ---------------- 작물 ----------------
function cropStage(c){const d=CROPS[c.t].days;if(c.g>=d)return 3;if(c.g<=0)return 0;return c.g<d/2?1:2;}
function cropQ(c){const r=c.age?c.g/c.age:1;return r>=.95&&!c.weedy?3:r>=.66?2:1;}

// ---------------- 행동 (상황에 따라 자동) ----------------
function contextAction(){
  const[fx,fy]=facing();const i=MAP.ix(fx,fy),o=objAt(fx,fy),g=MAP.g(fx,fy);
  if(S.map==='in'){
    if(o&&o.t==='stove')return{l:'요리하기',f:()=>stoveCook()};
    if(o&&o.t==='ledger')return{l:'주문 장부',f:openLedger};
    if(o&&o.t==='ladder')return{l:'다락방에서 자기',f:askSleep};
    const seatX=(o&&o.t==='counter'&&fy===4)?fx:(o&&o.t==='stool')?o.x:-1;const gu=S.guests.find(q=>q.seat===seatX);
    if(gu)return{l:'손님 맞이',f:()=>talkGuest(gu)};
    if(g===DR)return{l:'밖으로 나가기',f:exitDiner};
    return null;
  }
  if(o){
    if(o.t==='diner'&&fx===DINER_DOOR[0]&&fy===DINER_DOOR[1])return{l:'식당에 들어가기',f:enterDiner};
    if(o.t==='well')return{l:'물 긷기',f:()=>{S.water=canMax();sfx('fill');toast('물뿌리개를 가득 채웠어요.','can');hudKey='';}};
    if(o.t==='lantern')return{l:'등불 살펴보기',f:()=>lookLantern(o.v.i)};
    if(o.t==='sign')return{l:'읽기',f:()=>dialog([{text:'등불식당 — 해가 지면 문을 엽니다. 길 잃은 손님 환영.'}])};
    return null;
  }
  if(S.mush[i])return{l:'버섯 줍기',f:()=>{delete S.mush[i];addInv('mushroom',2+(Math.random()<.4?1:0));sfx('pick');toast('표고버섯을 주웠어요','mushroom');spark(fx*T+8,fy*T+8);}};
  const c=S.crops[i];
  if(S.weeds[i])return{l:'잡초 뽑기',f:()=>{delete S.weeds[i];sfx('weed');for(let k=0;k<6;k++)part(fx*T+8,fy*T+10,{vx:(Math.random()-.5)*40,vy:-40,g:160,life:.5,c:'#57714d'});}};
  if(c&&cropStage(c)===3)return{l:CROPS[c.t].n+' 수확',f:()=>harvest(fx,fy)};
  {const[dx,dy]=DIRV[S.dir];if(MAP===OUT&&!S.tilled[i]&&(g===WA||g===PL||g===SA)&&[14,22,30].some(d=>isWaterPx(S.px+dx*d,S.py-6+dy*d)))return{l:'낚시 (꾹 눌렀다 떼서 던지기)',hold:true};}
  if(c){if(S.wet[i])return{l:`${CROPS[c.t].n} · ${Math.max(1,CROPS[c.t].days-c.g)}일 남음`,none:true};
    return{l:'물 주기',f:()=>waterAt(fx,fy)};}
  if(S.tilled[i]){if(S.seed&&cnt(S.seed))return{l:ITEMS[S.seed].n.replace(/ 씨앗| 모종|씨/,'')+' 심기',f:()=>plant(fx,fy)};return{l:'씨앗 없음 (장부에서 주문)',none:true};}
  if(MAP.field[i]&&g===GR)return{l:'땅 갈기',f:()=>till(fx,fy)};
  return null;
}
function till(x,y){const i=MAP.ix(x,y);S.tilled[i]=1;if(S.weather==='rain')S.wet[i]=1;sfx('till');tool='hoe';toolT=.3;
  for(let k=0;k<7;k++)part(x*T+8,y*T+10,{vx:(Math.random()-.5)*44,vy:-30-Math.random()*25,g:170,life:.5,c:'#735441'});}
function plant(x,y){const i=MAP.ix(x,y);S.crops[i]={t:ITEMS[S.seed].crop,g:0,age:0};takeInv(S.seed);sfx('plant');if(!cnt(S.seed)){const n=Object.keys(S.inv).find(k=>ITEMS[k]&&ITEMS[k].kind==='seed');S.seed=n||null;}hudKey='';}
function waterAt(x,y){if(S.water<=0){toast('물뿌리개가 비었어요. 밭 옆 우물에서 채워요.');sfx('bad');return;}
  const[dx,dy]=DIRV[S.dir];const tiles=[[x,y]];if(S.canLv)tiles.push([x+dy,y+dx],[x-dy,y-dx]);
  for(const[a,b]of tiles){const i=MAP.ix(a,b);if(!MAP.inb(a,b)||!S.tilled[i]||S.water<=0)continue;if(!S.wet[i]){S.wet[i]=1;S.water--;}
    for(let k=0;k<6;k++)part(a*T+3+Math.random()*10,b*T,{vx:(Math.random()-.5)*8,vy:20+Math.random()*25,g:150,life:.45,c:'#9cc0b4'});}
  sfx('water');tool='can';toolT=.4;hudKey='';}
function harvest(x,y){const i=MAP.ix(x,y),c=S.crops[i],cd=CROPS[c.t],q=cropQ(c);const n=1+(Math.random()<.15?1:0);
  addInv(cd.item,q,n);S.stats.harvest+=n;sfx('harvest');pop(cd.item,x*T+8,y*T+4);toast(`${cd.n} ${'★'.repeat(q)}${n>1?' ×2 풍작!':''}`,cd.item);
  if(cd.regrow){c.g=cd.days-cd.regrow;c.age=c.g;c.weedy=0;}else delete S.crops[i];spark(x*T+8,y*T+8);}

// ---------------- 낚시 ----------------
let F=null;const shadows=[];
function waterRegion(px,py){const tx=Math.floor(px/T),ty=Math.floor(py/T);if(tx>=28&&ty<=15)return'river';const b=OUT.bakeT;const d=b.dist[(py|0)*b.w+(px|0)];return d>24?'deep':'lake';}
function isWaterPx(px,py){const b=OUT.bakeT;px|=0;py|=0;if(px<0||py<0||px>=b.w||py>=b.h)return false;return b.t[py*b.w+px]===WA&&b.dist[py*b.w+px]>2&&MAP.g(Math.floor(px/T),Math.floor(py/T))!==PL;}
function pickSpecies(reg){const h=S.min/60,rain=S.weather==='rain';
  const opts=FISHKEYS.filter(k=>FISH[k].where.includes(reg)||(reg==='deep'&&FISH[k].where.includes('lake')));
  const w=opts.map(k=>{const f=FISH[k];let v=f.w;if(f.am&&h>12)v*=.3;if(f.wet&&!(rain||h>=19))v*=.25;if(k==='f_gold')v*=S.recipes.includes('goldfish')?2:.6;return v;});
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<opts.length;i++){if((r-=w[i])<0)return opts[i];}return opts[0];}
function spawnShadow(){for(let n=0;n<40;n++){const px=Math.random()*OUT.bakeT.w,py=Math.random()*OUT.bakeT.h;if(!isWaterPx(px,py))continue;
  const reg=waterRegion(px,py),sp=pickSpecies(reg);shadows.push({x:px,y:py,tx:px,ty:py,sp,size:FISH[sp].size,st:'wander',t:0,a:Math.random()*6});return;}}
function updateShadows(dt){
  while(shadows.length<7)spawnShadow();
  for(const s of shadows){s.t+=dt;s.a+=dt*4;
    if(s.st==='wander'){if(Math.hypot(s.tx-s.x,s.ty-s.y)<2||s.t>6){for(let n=0;n<10;n++){const a=Math.random()*6.28,r=10+Math.random()*40;const nx2=s.x+Math.cos(a)*r,ny2=s.y+Math.sin(a)*r;if(isWaterPx(nx2,ny2)){s.tx=nx2;s.ty=ny2;break;}}s.t=0;}
      if(F&&F.st==='wait'&&!F.fish&&Math.hypot(F.bx-s.x,F.by-s.y)<64){s.st='approach';F.fish=s;}}
    const sp=s.st==='approach'?16:s.st==='flee'?60:7;const tx=s.st==='approach'?F.bx:s.tx,ty=s.st==='approach'?F.by:s.ty;
    if(s.st==='flee'){s.x+=s.fx*dt*sp;s.y+=s.fy*dt*sp;s.t+=dt;if(s.t>1.5)s.dead=1;}
    else if(s.st!=='hooked'&&s.st!=='nibble'){const d=Math.hypot(tx-s.x,ty-s.y);if(d>1){const nx2=s.x+(tx-s.x)/d*sp*dt,ny2=s.y+(ty-s.y)/d*sp*dt;if(isWaterPx(nx2,ny2)||s.st==='approach'){s.x=nx2;s.y=ny2;}else s.t=99;}
      if(s.st==='approach'&&d<5){s.st='nibble';F.nib=1+Math.floor(Math.random()*3);F.nt=.9+Math.random()*.9;}}
  }
  for(let i=shadows.length-1;i>=0;i--)if(shadows[i].dead)shadows.splice(i,1);
}
function scare(s,msg){if(!s)return;s.st='flee';s.t=0;const d=Math.hypot(s.x-S.px,s.y-S.py)||1;s.fx=(s.x-S.px)/d;s.fy=(s.y-S.py)/d;if(F)F.fish=null;if(msg)toast(msg);}
function fishUpdate(dt){
  if(!F)return;F.t+=dt;
  if(F.st==='charge'){F.p+=F.pd*dt*1.1;if(F.p>1){F.p=1;F.pd=-1;}if(F.p<0){F.p=0;F.pd=1;}if(Math.random()<dt*14)sfx('charge',F.p);
    if(INP.released){const[dx,dy]=DIRV[S.dir];let dist=(1.4+F.p*4.2+S.rodLv*.6)*T;let bx,by,ok=false;
      for(;dist>=T*.8;dist-=4){bx=S.px+dx*dist;by=S.py-6+dy*dist;if(isWaterPx(bx,by)){ok=true;break;}}
      if(!ok){F=null;toast('물까지 닿지 않았어요.');return;}
      F.st='fly';F.t=0;F.sx=S.px;F.sy=S.py-20;F.bx=bx;F.by=by;F.fish=null;sfx('cast');}
    return;}
  if(F.st==='fly'){if(F.t>.45){F.st='wait';F.t=0;sfx('plop');ripple(F.bx,F.by);}return;}
  if(F.st==='wait'){
    if(INP.pressed){if(F.fish)scare(F.fish);F=null;toast('낚싯줄을 감았어요.');return;}
    if(F.t>14&&!F.fish&&Math.random()<dt){spawnShadow();}
    if(F.fish&&F.fish.st==='nibble'){F.nt-=dt;if(F.nt<=0){if(F.nib>0){F.nib--;F.nt=.7+Math.random()*1.1;F.dip=.25;sfx('nibble');ripple(F.bx,F.by);}else{F.st='bite';F.t=0;F.dip=1;sfx('bite');ripple(F.bx,F.by);ripple(F.bx,F.by);}}}
    if(F.dip>0)F.dip-=dt;
    return;}
  if(F.st==='bite'){
    if(INP.pressed){startFight();return;}
    if(F.t>.6+S.rodLv*.12){scare(F.fish,'찌가 다시 떠올랐어요. 놓쳤다!');F=null;}return;}
  if(F.st==='fight'){const fd=FISH[F.sp];F.phT-=dt;
    if(F.phT<=0){F.run=!F.run&&F.stam>0;F.phT=F.run?.8+Math.random()*1.2:1+Math.random()*1.6;F.lat=(Math.random()<.5?-1:1);if(F.run){sfx('bite');ripple(F.bx,F.by);}}
    const reel=INP.down;
    if(reel){F.dist-=(F.run?7:30+S.rodLv*6)*dt;F.ten+=(F.run?fd.pull*.95:.12)*dt*(S.rodLv?.8:1);F.slack=0;if(F.run)F.stam-=dt*1.3;if(Math.random()<dt*12)sfx('reel');}
    else{F.ten-=.7*dt;F.dist+=(F.run?16*fd.pull:3)*dt;F.slack+=F.run?0:dt;}
    F.ten=clamp(F.ten,0,1.2);if(F.run)F.off=clamp(F.off+F.lat*dt*18,-30,30);else F.off*=1-dt*.8;
    const[dx,dy]=DIRV[S.dir];F.bx=S.px+dx*F.dist-dy*F.off;F.by=S.py-6+dy*F.dist+dx*F.off;
    if(F.run&&Math.random()<dt*8)part(F.bx,F.by,{vx:(Math.random()-.5)*30,vy:-30,g:120,life:.4,c:'#e3eee8'});
    if(F.ten>=1){sfx('snap');toast('줄이 끊어졌어요! 물고기가 날뛸 땐 손을 떼요.');scare(F.fish);F=null;return;}
    if(F.dist>F.maxD){toast('너무 멀리 도망갔어요…');scare(F.fish);F=null;return;}
    if(F.slack>3.2){toast('줄이 느슨해서 바늘이 빠졌어요.');scare(F.fish);F=null;return;}
    if(F.dist<12){landFish();}
    return;}
  if(F.st==='show'&&F.t>1.4)F=null;
}
function startFight(){const s=F.fish,fd=FISH[s.sp];s.st='hooked';const d0=Math.hypot(F.bx-S.px,F.by-S.py+6);
  Object.assign(F,{st:'fight',t:0,sp:s.sp,dist:d0,maxD:d0+5*T,ten:.2,run:true,phT:.8,stam:fd.stam,off:0,lat:1,slack:0});sfx('bite');}
function landFish(){const sp=F.sp,fd=FISH[sp];const s=F.fish;const k=shadows.indexOf(s);if(k>=0)shadows.splice(k,1);
  const len=Math.round(fd.len[0]+(fd.len[1]-fd.len[0])*Math.pow(Math.random(),1.3));const rel=(len-fd.len[0])/(fd.len[1]-fd.len[0]);const q=rel>.75?3:rel>.4?2:1;
  addInv(sp,q);S.stats.fish++;const j=S.journal[sp]||(S.journal[sp]={n:0,best:0});const first=!j.n;j.n++;const rec=len>j.best;j.best=Math.max(j.best,len);
  sfx('catch');toast(`${ITEMS[sp].n} ${len}cm ${'★'.repeat(q)}${first?' · 도감 등록!':rec&&j.n>1?' · 최고 기록!':''}`,sp);
  F={st:'show',t:0,sp};for(let i=0;i<12;i++)part(S.px,S.py-34,{vx:(Math.random()-.5)*60,vy:-30-Math.random()*30,g:80,life:.8,c:'#f6dc8a',spark:1});}

// ---------------- 식당 / 손님 ----------------
function enterDiner(){sfx('door');fade(()=>{setMap('in');S.px=5*T+8;S.py=7*T+12;S.dir='up';});}
function exitDiner(){sfx('door');fade(()=>{setMap('out');S.px=DINER_DOOR[0]*T+8;S.py=(DINER_DOOR[1]+1)*T+12;S.dir='down';});}
function spawnGuests(){
  if(S.guestDay===S.day)return;S.guestDay=S.day;S.guests=[];
  if(S.spiritIdx<SPIRITS.length)S.guests.push({kind:'story',seat:3,i:S.spiritIdx});
  const n=1+(S.spiritIdx>=3?1:0);const seats=[1,5];
  for(let k=0;k<n;k++){const h=WISP_HUES[(S.day+k)%WISP_HUES.length];S.guests.push({kind:'wisp',seat:seats[k],hue:h,name:WISP_NAMES[(S.day*3+k)%WISP_NAMES.length],want:S.recipes[(S.day*7+k*3)%S.recipes.length]});}
  if(S.map==='out')toast('해가 졌어요. 식당에 손님이 찾아왔어요!');else sfx('chime');
}
function guestSprite(g){return g.kind==='story'?spiritSprite(SPIRITS[g.i].kind):spiritSprite('wisp',g.hue);}
function talkGuest(g){
  if(g.kind==='story'){const sp=SPIRITS[g.i];const pic=guestSprite(g);
    const lines=g.met?[{who:sp.n,pic,text:sp.hint}]:[...sp.intro.map(t=>({who:sp.n,pic,text:t})),{who:sp.n,pic,text:sp.hint}];
    g.met=true;S.metCur=true;
    dialog(lines,()=>openCookPick(`${sp.n}에게 낼 요리`,`“${sp.hint}”`,(k,how)=>prepare(k,how,stars=>serve(g,k,stars)),true));}
  else{const pic=guestSprite(g),d=DISHES[g.want];
    dialog([{who:g.name,pic,text:`${d.n} 한 그릇 주세요!`}],()=>openCookPick(`${g.name}의 주문`,`${d.n}을(를) 원해요.`,(k,how)=>prepare(k,how,stars=>serve(g,k,stars)),true));}
}
function avgQ(qs){return qs.length?qs.reduce((a,b)=>a+b,0)/qs.length:2;}
function prepare(k,how,done){
  if(how==='serve'){const q=takeInv('d_'+k,1)[0]||2;done(q);return;}
  const qs=[];for(const[i,n]of Object.entries(DISHES[k].need))qs.push(...takeInv(i,n));
  startCook(k,avgQ(qs),(kk,stars)=>done(stars));
}
function stoveCook(){openCookPick('요리하기','미리 만들어 두면 손님이 왔을 때 바로 낼 수 있어요.',(k,how)=>prepare(k,'cook',stars=>{addInv('d_'+k,stars);toast(`${DISHES[k].n} ${'★'.repeat(stars)} 완성! 바구니에 넣었어요.`,'d_'+k);}),false);}
function pay(n){S.gold+=n;S.todayEarn+=n;S.stats.earned+=n;hudKey='';sfx('coin');}
function serve(g,k,stars){
  const d=DISHES[k],pic=guestSprite(g);S.guests=S.guests.filter(q=>q!==g);
  if(g.kind==='wisp'){const ok=k===g.want;const v=Math.round(d.val*(ok?.7+.2*stars:.45));
    dialog([{who:g.name,pic,text:ok?(stars===3?'우와… 이렇게 맛있는 건 처음이에요!':'맛있어요! 잘 먹었습니다.'):'제가 시킨 건 아니지만… 이것도 맛있네요.'}],()=>{pay(v);toast(`${v}냥 받았어요`,'coin');});return;}
  const sp=SPIRITS[g.i];
  if(k!==sp.dish){const v=Math.round(d.val*.5);dialog([{who:sp.n,pic,text:sp.wrong},{who:sp.n,pic,text:'…내일 밤에 또 올게.'}],()=>pay(v));return;}
  const v=Math.round(d.val*(1.2+.25*stars));
  dialog(sp.ok.map(t=>({who:sp.n,pic,text:t})),()=>{pay(v);lanternCeremony(sp);});
}
function lanternCeremony(sp){
  const idx=S.spiritIdx;S.spiritIdx++;S.metCur=false;applyReward(sp.reward);sfx('lantern');
  CERE={t:0,kind:sp.kind,x:3*T+8,y:5*T};
  setTimeout(()=>{dialog([{text:`${sp.n}의 몸이 따스한 빛으로 풀어지더니, 창밖 호숫가 쪽으로 날아갔다.`},{text:`호숫가의 ${idx+1}번째 등불이 켜졌어요. (${S.spiritIdx}/8)`},{text:sp.reward.text}],()=>{save();if(S.spiritIdx>=SPIRITS.length)festival();});},1600);
}
let CERE=null;
function applyReward(r){if(r.seeds)for(const s of r.seeds)if(!S.seedsAvail.includes(s))S.seedsAvail.push(s);if(r.recipes)for(const k of r.recipes)if(!S.recipes.includes(k))S.recipes.push(k);
  if(r.rod)S.rodLv=1;if(r.can){S.canLv=1;S.water=canMax();}if(r.rain)S.flags.rainy=1;if(!r.seeds&&!r.recipes&&!r.rod&&!r.can&&!r.rain&&S.spiritIdx===7)S.flags.chime=1;hudKey='';}
function lookLantern(i){if(i<S.spiritIdx){const sp=SPIRITS[i];dialog([{who:sp.n+'의 등불',pic:spiritSprite(sp.kind),text:`따뜻한 빛이 흔들린다. ${DISHES[sp.dish].n}의 냄새가 아주 희미하게 난다.`}]);}
  else dialog([{text:'꺼진 석등. 누군가 돌아오기를 기다리는 것 같다.'}]);}
let FEST=null;
function festival(){S.flags.ended=1;fade(()=>{setMap('out');S.px=17*T+8;S.py=18*T+12;S.dir='down';S.min=Math.max(S.min,21*60);FEST={t:0,lan:[]};});
  setTimeout(()=>dialog([{text:'호숫가의 등불 여덟 개가 한꺼번에 밝아졌다.'},{text:'콩이, 도토, 비비, 몽실, 할매냥, 반디, 개굴스님, 하루… 등불 하나하나가 하늘로 떠오른다.'},
    {who:'할머니의 편지',text:`${S.name}, 해냈구나. 이 식당은 이제 네 거란다. 배고픈 손님이 있는 한, 등불은 꺼지지 않을 거야.`},{text:'— 등불 축제 —  고마워요! 식당은 계속 열려 있어요. 황금잉어도 찾아보세요.'}],()=>{FEST=null;save();}),1400);}

// ---------------- 하루 ----------------
let sleepFx=null;
function askSleep(){openPanel('sleep','다락방에서 잘까요?',S.min<18*60?'아직 해가 떠 있어요.':S.guests.length?'아직 기다리는 손님이 있어요.':'오늘도 수고했어요.','',
  `<span class="ds">내일 날씨: ${S.tomorrow==='rain'?'비':'맑음'}</span><span class="row"><button type="button" class="ghost" id="bNo">조금 더</button><button type="button" id="bYes">잘래요</button></span>`);
  $('bNo').onclick=closePanel;$('bYes').onclick=()=>{closePanel();goSleep(false);};}
function goSleep(passOut){if(sleepFx)return;F=null;sleepFx={t:0,passOut};}
function newDay(passOut){
  const earned=S.todayEarn;S.todayEarn=0;
  for(const k in S.crops){const c=S.crops[k];c.age++;if(S.wet[k])c.g++;if(S.weeds[k])c.weedy=1;}
  for(const k in S.tilled){if(!S.weeds[k]&&Math.random()<.07)S.weeds[k]=1;if(!S.crops[k]&&!S.weeds[k]&&Math.random()<.06)delete S.tilled[k];}
  S.wet={};S.day++;S.weather=S.tomorrow;S.tomorrow=Math.random()<(S.flags.rainy?.35:.22)?'rain':'sun';
  if(S.weather==='rain')for(const k in S.tilled)S.wet[k]=1;
  S.mush={};const spots=OUT.mushSpots.slice().sort(()=>Math.random()-.5);let m=0;for(const[x,y]of spots){if(m>=3)break;if(OUT.ogrid[OUT.ix(x,y)])continue;S.mush[OUT.ix(x,y)]=1;m++;}
  S.guests=[];S.min=360;
  let lost=0;if(passOut){lost=Math.round(S.gold*.08);S.gold-=lost;}
  setMap('in');S.px=9*T+8;S.py=3*T+12;S.dir='down';shadows.length=0;
  save();return{earned,lost};
}
function showSummary(r){openPanel('sum',`${S.day-1}일째 밤이 지나갔어요`,'',`<div class="sumb"><div>오늘 번 돈</div><div class="big">${r.earned.toLocaleString()}냥</div>
  ${r.lost?`<p class="warn">새벽까지 돌아다니다 쓰러졌어요. 까치가 데려다주고 ${r.lost}냥을 받아 갔어요.</p>`:''}
  <p>${S.day}일째 아침 · ${S.weather==='rain'?'비가 와요. 밭에 물을 안 줘도 돼요.':'맑아요. 밭에 물 주는 걸 잊지 마세요.'}</p><p class="ds">자동으로 저장했어요.</p></div>`,
  `<span></span><button type="button" id="bMorn">좋은 아침!</button>`,()=>{sleepFx={t:1.5,wake:1};});$('bMorn').onclick=closePanel;}
let fadeFx=null;function fade(mid){fadeFx={t:0,mid,done:false};}

// ---------------- 파티클 ----------------
const parts=[],ripples=[],pops=[];
function part(x,y,o){parts.push(Object.assign({x,y,vx:0,vy:0,g:0,life:1,max:o.life||1},o));}
function spark(x,y){for(let k=0;k<6;k++)part(x,y,{vx:(Math.random()-.5)*36,vy:-26-Math.random()*20,g:50,life:.6,c:'#f6dc8a',spark:1});}
function ripple(x,y){ripples.push({x,y,t:0});}
function pop(id,x,y){pops.push({id,x,y,t:0});}
const bugs=[];for(let i=0;i<12;i++)bugs.push({x:(3+Math.random()*28)*T,y:(3+Math.random()*20)*T,a:Math.random()*6,c:['#fbf5ea','#f1bbb1','#f2d58d'][i%3]});
const drops=[];for(let i=0;i<120;i++)drops.push({x:Math.random(),y:Math.random(),s:.7+Math.random()*.6});
let tool=null,toolT=0,stepT=0,walkT=0,moving=false;

// ---------------- 업데이트 ----------------
let time=0,minAcc=0;
function update(dt){
  time+=dt;dialogTick(dt);
  if(AU.ctx){musicTick(S&&S.min>=19*60);if(AU.rain)AU.rain.gain.value=S&&S.weather==='rain'&&S.map==='out'&&mode==='play'?.06:S&&S.weather==='rain'&&mode==='play'?.02:0;}
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.life-=dt;}for(let i=parts.length-1;i>=0;i--)if(parts[i].life<=0)parts.splice(i,1);
  for(const r of ripples)r.t+=dt;while(ripples.length&&ripples[0].t>1.3)ripples.shift();for(const p of pops)p.t+=dt;while(pops.length&&pops[0].t>.8)pops.shift();
  for(const b of bugs){b.a+=dt*(1+Math.sin(time+b.x)*.6);b.x+=Math.cos(b.a)*dt*13;b.y+=Math.sin(b.a*1.3)*dt*9;}
  if(mode!=='play'){if(S&&MAP===OUT)updateShadows(dt);return;}
  if(fadeFx){fadeFx.t+=dt;if(fadeFx.t>=.35&&!fadeFx.done){fadeFx.done=true;fadeFx.mid();}if(fadeFx.t>=.7)fadeFx=null;}
  if(sleepFx){sleepFx.t+=dt*(sleepFx.wake?-1:1);if(!sleepFx.wake&&sleepFx.t>=1.5&&!sleepFx.done){sleepFx.done=1;const r=newDay(sleepFx.passOut);hudKey='';refreshHud();showSummary(r);}
    if(sleepFx&&sleepFx.wake&&sleepFx.t<=0)sleepFx=null;finishInput();return;}
  if(FEST){FEST.t+=dt;if(Math.random()<dt*6)FEST.lan.push({x:(8+Math.random()*24)*T,y:(14+Math.random()*10)*T,vy:-(8+Math.random()*10),ph:Math.random()*6});for(const l of FEST.lan){l.y+=l.vy*dt;l.x+=Math.sin(time+l.ph)*dt*4;}}
  if(CERE){CERE.t+=dt;if(CERE.t>2.4)CERE=null;}
  if(DLG.open){if(INP.pressed)dialogPress();finishInput();return;}
  if(CK.on){cookUpdate(dt,INP);finishInput();return;}
  if(PANEL.open||fadeFx){moving=false;finishInput();return;}
  if(MAP===OUT)updateShadows(dt);
  // 시간
  minAcc+=dt/.6;while(minAcc>=1){minAcc--;S.min++;}
  if(S.min>=18*60&&S.guestDay!==S.day)spawnGuests();
  if(S.min>=24*60&&S.guests.length){S.guests=[];toast('손님들이 돌아갔어요. 내일 밤 다시 올 거예요.');}
  if(S.min>=26*60){toast('너무 늦었어요… 눈이 감겨요.');goSleep(true);finishInput();return;}
  // 이동
  let mx=joy.x,my=joy.y;if(keys.arrowleft||keys.a)mx--;if(keys.arrowright||keys.d)mx++;if(keys.arrowup||keys.w)my--;if(keys.arrowdown||keys.s)my++;
  const len=Math.hypot(mx,my);
  if(F&&(F.st==='wait'||F.st==='bite')&&len>.3){if(F.fish)scare(F.fish);F=null;}
  if(len>.2&&!F){mx/=Math.max(1,len);my/=Math.max(1,len);
    if(Math.abs(mx)>Math.abs(my))S.dir=mx<0?'left':'right';else S.dir=my<0?'up':'down';
    const sp=74;const nx2=S.px+mx*sp*dt,ny2=S.py+my*sp*dt;
    if(boxFree(nx2,S.py))S.px=nx2;if(boxFree(S.px,ny2))S.py=ny2;moving=true;walkT+=dt;stepT+=dt;if(stepT>.28){stepT=0;sfx('step');}
    if(S.map==='in'&&MAP.g(Math.floor(S.px/T),Math.floor((S.py-1)/T))===DR&&my>0)exitDiner();
  }else{moving=false;walkT=0;}
  if(toolT>0)toolT-=dt;
  // 행동
  const ca=F?null:contextAction();
  if(F)setHint(F.st==='charge'?'떼면 던져요':F.st==='wait'?(F.fish?'기다려요… 톡톡은 무시!':'입질을 기다려요 (누르면 감기)'):F.st==='bite'?'지금!':F.st==='fight'?(F.run?'날뛴다! 손을 떼요':'꾹 눌러 감아요'):'');
  else setHint(ca?ca.l:'');
  if(F)fishUpdate(dt);
  else if(INP.pressed&&ca&&!ca.none){if(ca.hold){F={st:'charge',p:0,pd:1,t:0};}else ca.f();}
  if(S.flags.chime&&S.map==='out'&&Math.random()<dt*.04)sfx('chime');
  refreshHud();finishInput();
}
function finishInput(){INP.pressed=false;INP.released=false;}

// ---------------- 그리기 ----------------
let camX=0,camY=0;
const SPR={};
function initSprites(){
  SPR.diner=makeDiner();SPR.lanOn=makeLantern(1);SPR.lanOff=makeLantern(0);SPR.well=makeWell();SPR.bench=makeBench();SPR.sign=makeSign();SPR.crates=makeCrates();
  SPR.walls=[0,1,2,3].map(makeStoneWall);SPR.rocks=[0,1,2,3].map(makeRock);SPR.bushes={};SPR.mush=makeMushrooms();
  SPR.stove=makeStove();SPR.stool=makeStool();SPR.ladder=makeLadder();SPR.ledger=makeLedger();SPR.table=makeTable();SPR.plants=[1,2,3].map(makePlant);
}
const treeCache={};function treeSpr(v){const k=v.kind+v.seed;return treeCache[k]||(treeCache[k]=makeTree(v.kind,v.seed+1));}
function bushSpr(v){const k=(v.seed||0)+(v.flower||'');return SPR.bushes[k]||(SPR.bushes[k]=makeBush(v.seed||0,v.flower));}
function darkness(){if(S.map==='in')return 0;const m=S.min;if(m<17.5*60)return 0;if(m<19.5*60)return(m-17.5*60)/120*.45;if(m<21*60)return .45+(m-19.5*60)/90*.15;return .6;}
function golden(){const m=S.min;if(m<15.5*60||m>19.8*60)return 0;return Math.sin((m-15.5*60)/(4.3*60)*Math.PI)*.18;}
function render(){
  if(!S||!MAP)return;
  const mw=MAP.w*T,mh=MAP.h*T;let tx=S.px-VW/2,ty=S.py-14-VH/2;
  if(mode!=='play'){tx=15*T+Math.sin(time*.07)*6*T-VW/2;ty=13*T+Math.cos(time*.05)*3*T-VH/2;}
  camX=Math.round(VW>=mw?-(VW-mw)/2:clamp(tx,0,mw-VW));camY=Math.round(VH>=mh?-(VH-mh)/2:clamp(ty,0,mh-VH));
  ctx.fillStyle=S.map==='in'?'#1f1a1c':'#3a4c34';ctx.fillRect(0,0,VW,VH);
  ctx.drawImage(MAP.bake,-camX,-camY);
  const x0=Math.max(0,Math.floor(camX/T)),y0=Math.max(0,Math.floor(camY/T)),x1=Math.min(MAP.w-1,Math.floor((camX+VW)/T)),y1=Math.min(MAP.h-1,Math.floor((camY+VH)/T));
  if(MAP===OUT){
    // 물결
    const sh=MAP.shore;for(let k=0;k<sh.length;k+=2){const X=sh[k]-camX,Y=sh[k+1]-camY;if(X<0||Y<0||X>=VW||Y>=VH)continue;const v=Math.sin(time*2.2+(sh[k]+sh[k+1])*.21);if(v>.2)ctx.fillStyle=v>.7?'rgba(244,240,226,.85)':'rgba(220,234,222,.5)',ctx.fillRect(X,Y,1,1);}
    const sp=MAP.sparkles;for(let k=0;k<sp.length;k+=2){const X=sp[k]-camX,Y=sp[k+1]-camY;if(X<-4||Y<0||X>=VW||Y>=VH)continue;const v=Math.sin(time*1.3+sp[k]*.7+sp[k+1]);if(v>.55){ctx.fillStyle=`rgba(225,240,232,${(v-.55)*1.4})`;ctx.fillRect(X+Math.round(Math.sin(time+sp[k])*2),Y,v>.85?3:2,1);}}
    for(const s of shadows){const X=Math.round(s.x-camX),Y=Math.round(s.y-camY);if(X<-20||Y<-20||X>VW+20||Y>VH+20)continue;const r=[0,4,6,9][s.size];
      ctx.fillStyle=`rgba(32,52,56,${S.min>19*60?.22:.34})`;ctx.beginPath();const ang=s.st==='approach'&&F?Math.atan2(F.by-s.y,F.bx-s.x):Math.atan2(s.ty-s.y,s.tx-s.x);ctx.ellipse(X,Y,r,r*.42,ang,0,7);ctx.fill();
      const tl=r+2+Math.sin(s.a)*1.2;ctx.fillRect(Math.round(X-Math.cos(ang)*tl),Math.round(Y-Math.sin(ang)*tl),2,2);}
  }
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=MAP.ix(x,y),X=x*T-camX,Y=y*T-camY;
    if(MAP===OUT){if(MAP.ground[i]===PL)ctx.drawImage(PLANK,X,Y);
      if(S.tilled[i])ctx.drawImage(SOIL[S.wet[i]?1:0],X,Y);if(S.weeds[i])ctx.drawImage(WEED,X+1,Y+3);if(S.mush[i])ctx.drawImage(SPR.mush,X,Y+1);}}
  for(const r of ripples){const a=1-r.t/1.3;ctx.strokeStyle=`rgba(232,242,236,${a*.8})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(Math.round(r.x-camX)+.5,Math.round(r.y-camY)+.5,2+r.t*8,1+r.t*3.2,0,0,7);ctx.stroke();}
  // 바라보는 칸
  if(mode==='play'&&!F&&!PANEL.open&&!DLG.open&&!CK.on){const[fx,fy]=facing();const X=fx*T-camX,Y=fy*T-camY,a=.5+Math.sin(time*5)*.25;ctx.fillStyle=`rgba(251,245,234,${a})`;
    for(const[cx,cy]of[[0,0],[13,0],[0,13],[13,13]]){ctx.fillRect(X+cx,Y+cy+(cy?2:0),3,1);ctx.fillRect(X+cx+(cx?2:0),Y+cy,1,3);}}
  // y 정렬
  const L=[];const lit=darkness()>.12||S.min>=18*60;
  for(const o of MAP.objs){const ox=o.x*T,oy=(o.y+o.h)*T;if(ox+o.w*T+60<camX||ox-60>camX+VW||oy-120>camY+VH||oy+10<camY)continue;L.push([oy-(o.t==='wall'?6:0),o]);}
  if(MAP===OUT)for(const k in S.crops){const i=+k,x=i%MAP.w,y=(i/MAP.w)|0;if(x<x0-1||x>x1+1||y<y0-1||y>y1+1)continue;L.push([y*T+13,{t:'crop',x,y,c:S.crops[k]}]);}
  if(S.map==='in')for(const g of S.guests)L.push([5*T+14,{t:'guest',g}]);
  if(mode==='play')L.push([S.py,{t:'player'}]);
  L.sort((a,b)=>a[0]-b[0]);for(const[,o]of L)drawObj(o,lit);
  drawFishing();
  for(const p of parts){const a=clamp(p.life/p.max,0,1);ctx.globalAlpha=a;const X=Math.round(p.x-camX),Y=Math.round(p.y-camY);ctx.fillStyle=p.c||'#fff';
    if(p.spark){ctx.fillRect(X,Y-1,1,3);ctx.fillRect(X-1,Y,3,1);}else if(p.heart){ctx.fillRect(X-2,Y-1,2,2);ctx.fillRect(X+1,Y-1,2,2);ctx.fillRect(X-2,Y,5,1);ctx.fillRect(X-1,Y+1,3,1);ctx.fillRect(X,Y+2,1,1);}else ctx.fillRect(X,Y,p.r||1,p.r||1);}
  ctx.globalAlpha=1;
  for(const p of pops){const q=p.t/.8,X=Math.round(p.x-camX+(S.px-p.x)*q*q-9),Y=Math.round(p.y-camY+((S.py-24)-p.y)*q-Math.sin(q*Math.PI)*16-9);ctx.globalAlpha=1-q*q*.6;ctx.drawImage(iconOf(p.id),X,Y);}ctx.globalAlpha=1;
  // 환경
  const dk=darkness();
  if(MAP===OUT){for(const b of bugs){const X=Math.round(b.x-camX),Y=Math.round(b.y-camY);if(X<-4||Y<-4||X>VW+4||Y>VH+4)continue;
      if(dk>.2){const a=.5+Math.sin(time*3+b.a*5)*.5;ctx.fillStyle=`rgba(236,248,170,${a})`;ctx.fillRect(X,Y,1,1);}
      else if(S.weather!=='rain'){const f=Math.floor(time*8+b.x)%2;ctx.fillStyle=b.c;ctx.fillRect(X-1,Y,f?1:2,1);ctx.fillRect(X+1,Y,f?1:2,1);ctx.fillStyle='#3d2c2e';ctx.fillRect(X,Y,1,1);}}
    if(S.weather==='rain'){ctx.fillStyle='rgba(50,60,80,.16)';ctx.fillRect(0,0,VW,VH);ctx.fillStyle='rgba(220,232,236,.5)';
      for(const d of drops){d.y+=.014*d.s;d.x-=.003*d.s;if(d.y>1){d.y-=1;d.x=Math.random()+.1;}if(d.x<0)d.x+=1.1;const X=Math.round(d.x*VW),Y=Math.round(d.y*VH);ctx.fillRect(X,Y,1,3);ctx.fillRect(X-1,Y+3,1,2);}}
    else{ctx.fillStyle='rgba(255,220,180,.05)';ctx.fillRect(0,0,VW,VH);}
    const gd=golden();if(gd>0){ctx.fillStyle=`rgba(255,160,90,${gd})`;ctx.fillRect(0,0,VW,VH);}
    if(dk>0)drawNight(dk);
    if(FEST)for(const l of FEST.lan){const X=Math.round(l.x-camX),Y=Math.round(l.y-camY);ctx.fillStyle='#3d2c2e';ctx.fillRect(X-2,Y-3,5,7);ctx.fillStyle='#f6c27a';ctx.fillRect(X-1,Y-2,3,5);ctx.fillStyle='#fff1c8';ctx.fillRect(X,Y-1,1,2);
      const g=ctx.createRadialGradient(X,Y,0,X,Y,10);g.addColorStop(0,'rgba(255,190,110,.35)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(X-10,Y-10,20,20);}
  }else{
    const dkIn=S.min>=18*60?.22:0;if(dkIn){ctx.fillStyle=`rgba(40,30,50,${dkIn})`;ctx.fillRect(0,0,VW,VH);}
    for(const lx of[2,4,6]){const X=lx*T+8-camX,Y=50-camY;const g=ctx.createRadialGradient(X,Y,0,X,Y,46);g.addColorStop(0,'rgba(255,200,130,.28)');g.addColorStop(1,'rgba(255,200,130,0)');ctx.fillStyle=g;ctx.fillRect(X-46,Y-46,92,92);}
    if(CERE){const a=Math.min(1,CERE.t)*(1-Math.max(0,CERE.t-1.8)/.6);const X=3*T+8-camX,Y=5*T-camY-CERE.t*20;const g=ctx.createRadialGradient(X,Y,0,X,Y,40);g.addColorStop(0,`rgba(255,220,150,${a*.8})`);g.addColorStop(1,'rgba(255,220,150,0)');ctx.fillStyle=g;ctx.fillRect(X-40,Y-40,80,80);
      for(let k=0;k<6;k++){const an=time*3+k;P(ctx,`rgba(255,240,200,${a})`,Math.round(X+Math.cos(an)*14),Math.round(Y+Math.sin(an)*8),1,1);}}
  }
  if(fadeFx){const a=fadeFx.t<.35?fadeFx.t/.35:1-(fadeFx.t-.35)/.35;ctx.fillStyle=`rgba(20,16,22,${clamp(a,0,1)})`;ctx.fillRect(0,0,VW,VH);}
  if(sleepFx){ctx.fillStyle=`rgba(20,16,22,${clamp(sleepFx.t/1.1,0,1)})`;ctx.fillRect(0,0,VW,VH);}
}
function drawNight(dk){
  nx.globalCompositeOperation='source-over';nx.clearRect(0,0,VW,VH);nx.fillStyle=`rgba(22,20,52,${dk})`;nx.fillRect(0,0,VW,VH);nx.globalCompositeOperation='destination-out';
  const light=(x,y,r,s=1)=>{const g=nx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${s})`);g.addColorStop(1,'rgba(0,0,0,0)');nx.fillStyle=g;nx.fillRect(x-r,y-r,r*2,r*2);};
  const glows=[];
  for(const o of OUT.objs){const X=o.x*T-camX,Y=o.y*T-camY;if(X<-90||Y<-90||X>VW+90||Y>VH+90)continue;
    if(o.t==='lantern'&&o.v.i<S.spiritIdx){light(X+8,Y-6,46);glows.push([X+8,Y-6,26]);}
    if(o.t==='diner'){light(X+30,Y+40,40);light(X+80,Y+40,30);light(X+56,Y+48,34);glows.push([X+52,Y+42,30]);}}
  light(S.px-camX,S.py-camY-12,22,.6);for(const b of bugs)light(b.x-camX,b.y-camY,5,.8);
  ctx.drawImage(night,0,0);ctx.globalCompositeOperation='lighter';
  for(const[X,Y,r]of glows){const g=ctx.createRadialGradient(X,Y,0,X,Y,r);g.addColorStop(0,`rgba(255,170,80,${dk*.45})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(X-r,Y-r,r*2,r*2);}
  ctx.globalCompositeOperation='source-over';
}
function shadow(cx,cy,rx,ry){ctx.fillStyle='rgba(40,30,34,.22)';ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,7);ctx.fill();}
function drawObj(o,lit){
  const X=o.x*T-camX,Y=o.y*T-camY;
  switch(o.t){
    case'player':drawPlayer();break;
    case'crop':{const st=cropStage(o.c);const s=CROPART[o.c.t][st];const sway=st>1&&Math.sin(time*1.6+o.x*.9+o.y)>.75?1:0;ctx.drawImage(s,X-1+sway,Y-5);
      if(st===3&&Math.sin(time*2+o.x*1.7+o.y)>.94){P(ctx,'#fffbe6',X+13,Y,1,3);P(ctx,'#fffbe6',X+12,Y+1,3,1);}break;}
    case'tree':{const s=treeSpr(o.v);shadow(X+8,Y+14,12,4);const behind=mode==='play'&&S.py<o.y*T+12&&S.py>o.y*T-36&&Math.abs(S.px-(o.x*T+8))<20;if(behind)ctx.globalAlpha=.55;ctx.drawImage(s,X+8-s.width/2,Y+16-s.height+2);ctx.globalAlpha=1;
      if(o.v.kind==='blossom'&&Math.random()<.02)part(o.x*T+8+(Math.random()-.5)*28,o.y*T-26,{vx:8+Math.random()*6,vy:8,g:2,life:3,c:'#efc6c0'});break;}
    case'bush':shadow(X+8,Y+14,8,2.5);ctx.drawImage(bushSpr(o.v),X-2,Y);break;
    case'rock':shadow(X+8,Y+13,7,2);ctx.drawImage(SPR.rocks[o.v.seed||0],X-1,Y+2);break;
    case'wall':ctx.drawImage(SPR.walls[(o.x*3+o.y)%4],X-1,Y-3);break;
    case'well':shadow(X+10,Y+14,9,3);ctx.drawImage(SPR.well,X-2,Y+16-30);break;
    case'bench':shadow(X+16,Y+14,14,2);ctx.drawImage(SPR.bench,X+1,Y);break;
    case'sign':shadow(X+8,Y+14,5,2);ctx.drawImage(SPR.sign,X,Y-6);break;
    case'crates':shadow(X+14,Y+14,14,3);ctx.drawImage(SPR.crates,X+2,Y-6);break;
    case'lantern':{const on=o.v.i<S.spiritIdx;shadow(X+8,Y+14,7,2);ctx.drawImage(on?SPR.lanOn:SPR.lanOff,X-1,Y+16-34);
      if(on){const sp=SPIRITS[o.v.i];for(let k=0;k<5;k++){const fx=X+[-4,18,-2,16,7][k],fy=Y+[12,13,15,9,16][k];P(ctx,['#f1bbb1','#f2d58d','#efe3cf','#c9b6d6','#f1bbb1'][k],fx,fy);}
        const a=time*1.4+o.v.i;const wx=X+8+Math.cos(a)*9,wy=Y-14+Math.sin(a*2)*3;P(ctx,'#ffe7b0',Math.round(wx),Math.round(wy),2,2);P(ctx,'rgba(255,231,176,.4)',Math.round(wx)-1,Math.round(wy)-1,4,4);}
      break;}
    case'diner':{const dx=X-4,dy=Y+o.h*T-DINER_H+4;ctx.drawImage(SPR.diner,dx,dy);dinerWindows(ctx,dx,dy,lit,time);choRong(ctx,dx+40,dy+60,lit,time);choRong(ctx,dx+72,dy+60,lit,time);
      if(S.flags.chime){const sw=Math.round(Math.sin(time*2)*1);P(ctx,'#3d2c2e',dx+92,dy+52,1,6);P(ctx,'#86a35a',dx+90+sw,dy+58,5,4);P(ctx,'#f3e6cf',dx+92+sw,dy+62,1,5);}
      if(S.guests.length&&S.min>=18*60&&S.min<24*60)for(let k=0;k<S.guests.length;k++){const a=time*1.2+k*2.1;const gx=dx+58+Math.cos(a)*22,gy=dy+70+Math.sin(a*1.6)*6;P(ctx,'rgba(200,230,225,.5)',Math.round(gx)-1,Math.round(gy)-1,4,4);P(ctx,'#e6f4ee',Math.round(gx),Math.round(gy),2,2);}
      break;}
    case'counter':{for(let i=0;i<o.w;i++){const cx=X+i*T;P(ctx,RAMP.wood[1],cx,Y-4,T,20);for(let k=0;k<T;k+=4)P(ctx,RAMP.wood[2],cx+k,Y+4,3,12);P(ctx,COUNTER_TOP[2],cx,Y-6,T,7);P(ctx,COUNTER_TOP[3],cx,Y-6,T,1);P(ctx,COUNTER_TOP[0],cx,Y+1,T,1);}
      P(ctx,'#3d2c2e',X,Y-7,o.w*T,1);shadeEll(ctx,X+40,Y-4,3,2,RAMP.white,{dither:false});P(ctx,'#86a35a',X+90,Y-10,2,5);shadeEll(ctx,X+91,Y-3,3,2,RAMP.teal,{dither:false});break;}
    case'stool':ctx.drawImage(SPR.stool,X,Y-2);break;
    case'stove':{ctx.drawImage(SPR.stove,X-1,Y+16-30);const f=Math.floor(time*8)%3;ctx.drawImage(FIRE[f],X+5,Y+16-30+19);ctx.drawImage(FIRE[(f+1)%3],X+19,Y+16-30+19);
      if(Math.random()<.1)part(o.x*T+9+Math.random()*4,o.y*T-12,{vy:-12,vx:(Math.random()-.5)*3,life:1.2,c:'rgba(255,255,255,.55)',r:2});break;}
    case'ledger':ctx.drawImage(SPR.ledger,X-1,Y-4);break;
    case'ladder':ctx.drawImage(SPR.ladder,X,Y+16-40);break;
    case'table':ctx.drawImage(SPR.table,X,Y-4);break;
    case'plant':ctx.drawImage(SPR.plants[(o.v.seed||1)-1],X,Y-8);break;
    case'guest':{const g=o.g,s=guestSprite(g),sx=g.seat*T+8-camX,sy=5*T-camY;const b=Math.round(Math.sin(time*2+g.seat)*1);
      ctx.drawImage(s,sx-12,sy-14+b);if(!g.met||g.kind==='wisp'){const bx=sx+6,by=sy-20+b;P(ctx,'#3d2c2e',bx-1,by-1,12,10);P(ctx,'#fbf5ea',bx,by,10,8);P(ctx,'#3d2c2e',bx+2,by+8,2,2);
        if(g.kind==='wisp')ctx.drawImage(DISHICON[g.want],bx-1,by-3,12,10);else{P(ctx,'#cc8248',bx+4,by+1,2,4);P(ctx,'#cc8248',bx+4,by+6,2,1);}}break;}
  }
}
function drawPlayer(){
  const px=Math.round(S.px-camX),py=Math.round(S.py-camY);shadow(px,py-1,6,2.2);
  const fr=moving?['idle','A','idle','B'][Math.floor(walkT*8)%4]:(Math.floor(time*1.3)%5===0&&(time*1.3%1)<.18?'blink':'idle');
  const fr2=S.dir==='up'&&fr==='blink'?'idle':fr;const s=charSprite(S.look,S.dir,fr2);const bob=moving&&(fr==='A'||fr==='B')?-1:0;
  const rodBehind=S.dir==='up';
  if(F&&rodBehind)drawRod();
  if(toolT>0&&tool&&S.dir==='up')drawTool(px,py);
  ctx.drawImage(s,px-13,py-31+bob);
  if(F&&!rodBehind)drawRod();
  if(toolT>0&&tool&&S.dir!=='up')drawTool(px,py);
  if(F&&F.st==='show'){const fi=IC[F.sp];ctx.drawImage(fi,px-9,py-44-Math.min(1,F.t*4)*3);}
}
function drawTool(px,py){const[dx,dy]=DIRV[S.dir];const ph=toolT>.15?0:1;const ic=IC[tool];ctx.save();ctx.translate(px+dx*(9+ph*2),py-16+dy*3+ph*4);if(dx<0)ctx.scale(-1,1);ctx.drawImage(ic,-9,-9);ctx.restore();}
function rodGeom(){const[dx,dy]=DIRV[S.dir];const hx=S.px+(dy?(dy>0?5:-5):dx*4),hy=S.py-12;let tx=hx+dx*12+(dy?(dy>0?4:-4):0),ty=hy-12+(dy>0?6:0);
  if(F.st==='charge'){tx=hx-dx*5;ty=hy-17;}if(F.st==='fight'){const pull=F.ten*5;tx+=(F.bx-tx)/Math.max(1,Math.hypot(F.bx-tx,F.by-ty))*pull;ty+=4*F.ten;}return[hx,hy,tx,ty];}
function drawRod(){if(!F||F.st==='show')return;const[hx,hy,tx,ty]=rodGeom();line(ctx,hx-camX,hy-camY,tx-camX,ty-camY,'#5f4334');line(ctx,hx-camX+1,hy-camY,tx-camX+1,ty-camY,'#a07a56');}
function drawFishing(){
  if(!F||F.st==='show')return;const[hx,hy,tx,ty]=rodGeom();
  if(F.st==='charge'){const X=Math.round(S.px-camX)-12,Y=Math.round(S.py-camY)-44;P(ctx,'#3d2c2e',X-1,Y-1,26,6);P(ctx,'#efe3cf',X,Y,24,4);P(ctx,F.p>.85?'#e2887a':'#86a35a',X,Y,Math.round(24*F.p),4);return;}
  let bx=F.bx,by=F.by;const p=F.st==='fly'?Math.min(1,F.t/.45):1;
  if(F.st==='fly'){bx=tx+(F.bx-tx)*p;by=ty+(F.by-ty)*p-Math.sin(p*Math.PI)*22;}
  const dip=F.st==='bite'?2+Math.sin(time*40)*.8:F.dip>0?1:F.st==='fight'?0:Math.sin(time*2.6)*.6;
  const sag=F.st==='fight'?(1-F.ten)*8:p<1?0:10;const tens=F.st==='fight'?F.ten:0;
  ctx.fillStyle=tens>.75?'#e2887a':'rgba(251,245,234,.85)';const n=28;
  for(let k=0;k<=n;k++){const q=k/n;const lx=tx+(bx-tx)*q,ly=ty+(by+dip-ty)*q+Math.sin(q*Math.PI)*sag*(1-q*.3);ctx.fillRect(Math.round(lx-camX),Math.round(ly-camY),1,1);}
  const BX=Math.round(bx-camX),BY=Math.round(by+dip-camY);
  if(F.st==='fight'){P(ctx,'rgba(32,52,56,.45)',BX-5,BY-1,10,3);if(F.run){P(ctx,'#e3eee8',BX-3,BY-3,2,1);P(ctx,'#e3eee8',BX+2,BY-4,1,1);}}
  else if(F.st!=='bite'||Math.sin(time*30)>0){P(ctx,'#3d2c2e',BX-2,BY-3,4,5);P(ctx,'#e2887a',BX-1,BY-2,2,2);P(ctx,'#fbf5ea',BX-1,BY,2,1);}
  if(F.st==='bite')bubble(S.px-camX,S.py-camY-38,'!');
  if(F.st==='fight'){const X=Math.round(S.px-camX)+12,Y=Math.round(S.py-camY)-36;P(ctx,'#3d2c2e',X-1,Y-1,6,30);P(ctx,'#efe3cf',X,Y,4,28);const h=Math.round(28*Math.min(1,F.ten));
    P(ctx,F.ten>.75?'#c4614f':F.ten>.45?'#d9ae5f':'#86a35a',X,Y+28-h,4,h);if(F.run)bubble(S.px-camX,S.py-camY-38,'!!');
    const dd=Math.max(0,Math.min(1,(F.dist-12)/(F.maxD-12)));P(ctx,'#3d2c2e',X-28,Y+31,24,3);P(ctx,'#9cc0b4',X-27,Y+32,Math.round(22*(1-dd)),1);}
}
function bubble(x,y,s){x=Math.round(x);y=Math.round(y)-(Math.sin(time*12)>0?1:0);const w=s.length>1?11:7;P(ctx,'#3d2c2e',x-w/2-1|0,y-6,w+2,11);P(ctx,'#fbf5ea',x-w/2|0,y-5,w,9);P(ctx,'#3d2c2e',x-1,y+5,3,2);
  for(let i=0;i<s.length;i++){const cx=x-(s.length-1)*2+i*4;P(ctx,'#c4614f',cx,y-4,1,5);P(ctx,'#c4614f',cx,y+2,1,1);}}

// ---------------- 시작 흐름 ----------------
function startPlay(st){
  S=st;mode='play';setMap(S.map||'out');$('title').hidden=true;$('creator').hidden=true;
  for(const id of['hud','hudr','hint','hbtns'])$(id).hidden=false;if(isTouch)$('touch').hidden=false;
  hudKey='';refreshHud();shadows.length=0;
}
function newGame(name,look){
  const st=newState(name,look);
  st.mush={};const sp=OUT.mushSpots.slice(0,3);for(const[x,y]of sp)st.mush[OUT.ix(x,y)]=1;
  startPlay(st);save();
  const L=[{who:'할머니의 편지',text:`${name}에게. 이 편지를 읽을 즈음이면 나는 먼 길을 떠났겠구나.`},
    {who:'할머니의 편지',text:'호숫가 이 작은 식당, 등불식당을 너한테 맡긴다. 낮에는 밭을 일구고 호수에서 물고기를 낚으렴.'},
    {who:'할머니의 편지',text:'해가 지면 길 잃은 작은 혼령들이 배고파서 찾아온단다. 다들 뭘 먹고 싶은지 잘 기억을 못 해.'},
    {who:'할머니의 편지',text:'그 아이들이 기억하는 맛을 찾아주면, 마음이 풀려서 호숫가 석등에 불이 켜질 거야. 여덟 개 전부 켜 주렴.'},
    {who:'할머니의 편지',text:'부엌에 무 두 개 남겨 뒀다. 첫 손님은 아마 오늘 밤 올 거야. — 할머니가'}];
  dialog(L,()=>{toast('밭에서 땅을 갈고 씨앗을 심어 보세요. 행동은 스페이스/A 하나로 다 돼요.');setTimeout(()=>toast('호숫가에서 물고기 그림자를 찾아 낚시도 해 봐요.'),2800);});
}
$('bNew').onclick=()=>{initAudio();mode='creator';openCreator((n,l)=>newGame(n,l));};
$('bCont').onclick=()=>{initAudio();const s=loadSave();if(s)startPlay(Object.assign(newState(),s));};
if(loadSave())$('bCont').hidden=false;
addEventListener('visibilitychange',()=>{if(document.hidden&&S&&mode==='play'&&!sleepFx)save();});

// ---------------- 루프 ----------------
OUT=genOutside();INN=genInside();buildDishArt();buildBigIng();initSprites();resize();
S=newState();S.min=18*60+40;S.spiritIdx=3;setMap('out');
for(let x=14;x<=21;x++)for(let y=5;y<=7;y++){const i=OUT.ix(x,y);S.tilled[i]=1;S.wet[i]=(x+y)%2;S.crops[i]={t:CROP_KINDS[(x+y)%6],g:(x*3+y)%7,age:7};}
let last=performance.now();
function frame(ts){const dt=Math.min(.05,(ts-last)/1000);last=ts;update(dt);render();cookRender(time);drawCreatorPreview(time);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
