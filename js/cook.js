'use strict';
// =====================================================================
//  요리 미니게임 — 썰기 / 불 조절 / 간 맞추기 / 굽기 / 담기 → 완성 공개
// =====================================================================
const CK={on:false,dish:null,steps:[],si:0,scores:[],st:null,ingQ:2,done:null,phase:'step',msgT:0,parts:[],revealT:0,stars:0};
const cookCv=$('cookcv'),cx2=cookCv.getContext('2d');const CKW=200,CKH=130;
const STEPHELP={
  chop:'칼이 점선 위에 왔을 때 눌러서 썰어요.',
  heat:'누르고 있으면 불이 세지고, 떼면 약해져요. 바늘을 초록 칸에 맞춰 두세요.',
  season:'눌러서 톡톡 뿌려요. 초록 칸에 들어오면 손을 떼고 기다리세요.',
  grill:'황금빛으로 노릇해지면 눌러서 뒤집어요. 앞뒤 두 번.',
  plate:'그릇이 가운데 올 때 눌러서 담아요.',
};
const POTCOL={doenjang:R2.miso,maeun:R2.redsoup,jorim:R2.glaze,omurice:R2.egg,soup:R2.pumpkinsoup,sotbap:R2.rice,goldfish:R2.glaze,cake:R2.cream,grill:R2.crust,ayu:R2.crust};
const VESSEL={doenjang:'ttuk',maeun:'ttuk',sotbap:'ttuk',soup:'bowl'};
const GRILLFISH={grill:'f_crucian',ayu:'f_sweet',goldfish:'f_gold'};
let CKBG=null;const vesselCache={},bigFishCache={};
function cookBg(){return CKBG||(CKBG=mk(CKW,CKH,x=>{
  for(let y=0;y<62;y++)for(let i=0;i<CKW;i++){const tile=((i>>3)+(y>>3))&1;P(x,(i%8===0||y%8===0)?'#d8c8ad':tile?'#efe3cc':'#e8dbc1',i,y);}
  P(x,'rgba(61,44,46,.15)',0,58,CKW,4);
  for(let y=62;y<CKH;y++)for(let i=0;i<CKW;i++){const row=(y-62)>>3;let k=3+(vnoise(i*.06,y*.7,row)-.5)*1.5;if((y-62)%8===7)k=1;P(x,RAMP.wood[clamp(Math.round(k),0,5)],i,y);}
  P(x,RAMP.wood[5],0,62,CKW,1);
}));}
function vessel(k){const v=VESSEL[k]||'plate';return vesselCache[v]||(vesselCache[v]=outline(mk(64,48,x=>{
  if(v==='ttuk'){dsh(x,32,40,26,6);const[a,b,c,d]=ttukbaegi(x,32,22,23,8,15);shadeEll(x,a,b,c,d,R2.pot,{flat:.2,amb:-.25});}
  else if(v==='bowl'){dsh(x,32,42,24,5);const[a,b,c,d]=whiteBowl(x,32,24,24,8,15);shadeEll(x,a,b,c,d,R2.plate,{flat:.1,amb:-.2,dither:false});}
  else{dsh(x,32,42,28,5);plate(x,32,34,28,10);}})));}
function bigFish(sp){return bigFishCache[sp]||(bigFishCache[sp]=fishArt(64,26,FISHRAMP[sp][0],FISHRAMP[sp][1]));}

function startCook(dk,ingQ,done){
  const d=DISHES[dk];Object.assign(CK,{on:true,dish:dk,steps:d.steps.slice(),si:0,scores:[],ingQ,done,phase:'step',parts:[],msgT:0});
  $('cook').hidden=false;$('cookrev').hidden=true;$('cookname').textContent=d.n;
  $('cooksteps').innerHTML=CK.steps.map((s,i)=>`<span class="cs" data-i="${i}">${STEPNAME[s]}</span>`).join('<i>›</i>');
  beginStep();
}
function beginStep(){
  const k=CK.steps[CK.si];CK.phase='step';$('cookhelp').textContent=STEPHELP[k];$('cookmsg').textContent='';
  $('cooksteps').querySelectorAll('.cs').forEach((el,i)=>{el.classList.toggle('on',i===CK.si);el.classList.toggle('dn',i<CK.si);});
  const st={k,t:0};
  if(k==='chop'){const n=CK.dish==='cake'?3:4+(CK.dish==='maeun'?1:0);st.lines=[];for(let i=0;i<n;i++)st.lines.push({x:16+(i+1)*(38/(n+1))+(Math.random()-.5)*3,cut:false});st.kx=0;st.kv=40;st.good=0;st.miss=0;st.down=0;}
  if(k==='heat'){st.h=.15;st.v=0;st.prog=0;st.burn=0;st.z=.48+Math.random()*.15;st.zw=.22;}
  if(k==='season'){st.m=0;st.pend=[];st.idle=0;st.lo=.58+Math.random()*.08;st.hi=st.lo+.18;st.sx=100;}
  if(k==='grill'){st.side=0;st.d=0;st.res=[];st.flip=0;st.sp=GRILLFISH[CK.dish]||'f_crucian';}
  if(k==='plate'){st.px=40;st.pv=70;st.drop=null;st.res=null;}
  CK.st=st;
}
function stepDone(score,msg){
  CK.scores.push(clamp(score,0,1));CK.phase='msg';CK.msgT=.9;
  $('cookmsg').textContent=msg||(score>.85?'완벽해요!':score>.6?'좋아요!':score>.3?'괜찮아요':'아쉬워요…');
  sfx(score>.6?'good':'pick');
}
function cookUpdate(dt,inp){
  if(!CK.on)return;
  for(const p of CK.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g||0)*dt;p.life-=dt;}CK.parts=CK.parts.filter(p=>p.life>0);
  if(CK.phase==='msg'){CK.msgT-=dt;if(CK.msgT<=0){CK.si++;if(CK.si>=CK.steps.length)toReveal();else beginStep();}return;}
  if(CK.phase==='reveal'){CK.revealT+=dt;if(inp.pressed&&CK.revealT>.6)finishCook();return;}
  const st=CK.st;st.t+=dt;
  if(st.k==='chop'){
    st.kx+=st.kv*dt;if(st.kx>58){st.kx=58;st.kv=-Math.abs(st.kv);}if(st.kx<0){st.kx=0;st.kv=Math.abs(st.kv);}if(st.down>0)st.down-=dt;
    if(inp.pressed&&st.down<=0){st.down=.14;const pos=st.kx;let best=null,bd=99;for(const l of st.lines)if(!l.cut&&Math.abs(l.x-pos)<bd){bd=Math.abs(l.x-pos);best=l;}
      if(best&&bd<=2.6){best.cut=true;st.good++;sfx('chop');st.kv*=1.12;for(let i=0;i<4;i++)CK.parts.push({x:46+pos*2,y:90,vx:(Math.random()-.5)*40,vy:-30-Math.random()*20,g:160,life:.4,c:'#fbf5ea'});}
      else{st.miss++;sfx('chopbad');$('cookmsg').textContent='삐끗!';}
      const left=st.lines.filter(l=>!l.cut).length;
      if(!left)stepDone(st.good/(st.lines.length+st.miss*.6));else if(st.miss>=3){st.lines.forEach(l=>l.cut=true);stepDone(st.good/(st.lines.length+st.miss*.6),'숭덩숭덩 썰렸어요');}}
  }else if(st.k==='heat'){
    st.v+=(inp.down?1.3:-1.1)*dt;st.v=clamp(st.v,-.55,.55);st.h=clamp(st.h+st.v*dt,0,1);if(st.h===0||st.h===1)st.v=0;
    st.z=clamp(st.z+Math.sin(st.t*.9)*dt*.05,.25,.7);
    const inZ=st.h>=st.z&&st.h<=st.z+st.zw;if(inZ){st.prog+=dt/3.2;if(Math.random()<dt*6)sfx('bubble');}
    if(st.h>st.z+st.zw+.06){st.burn+=dt;if(Math.random()<dt*8)CK.parts.push({x:100+(Math.random()-.5)*40,y:58,vx:(Math.random()-.5)*6,vy:-14,life:1.2,c:'rgba(90,80,80,.5)',r:2});}
    if(inZ&&Math.random()<dt*10)CK.parts.push({x:100+(Math.random()-.5)*34,y:62,vx:(Math.random()-.5)*4,vy:-10,life:1,c:'rgba(255,255,255,.55)',r:2});
    if(st.prog>=1||st.t>10)stepDone(Math.min(1,st.prog)*(1-Math.min(.6,st.burn*.25)),st.burn>1.5?'살짝 탔어요…':null);
  }else if(st.k==='season'){
    st.sx=100+Math.sin(st.t*2.4)*30;st.idle+=dt;
    if(inp.pressed){st.idle=0;sfx('shake');const amt=.07+Math.random()*.06;st.pend.push({a:amt,t:.35});for(let i=0;i<7;i++)CK.parts.push({x:st.sx+(Math.random()-.5)*4,y:30,vx:(Math.random()-.5)*12,vy:30+Math.random()*30,g:140,life:.5,c:'#fbf5ea'});}
    for(const p of st.pend){p.t-=dt;if(p.t<=0){st.m+=p.a;p.a=0;}}st.pend=st.pend.filter(p=>p.a>0);
    if(st.m>1.05||(!st.pend.length&&st.m>=st.lo&&st.idle>1)||(st.idle>3&&st.m>0)){const m=st.m;const sc=m>=st.lo&&m<=st.hi?1:m<st.lo?m/st.lo*.7:Math.max(0,1-(m-st.hi)*3);stepDone(sc,m>st.hi+.05?'좀 짜요…':m<st.lo?'싱거워요':null);}
  }else if(st.k==='grill'){
    if(st.flip>0)st.flip-=dt;else st.d+=dt*(.24+(st.side?.04:0));
    if(Math.random()<dt*5)sfx('sizzle');
    if(st.d>.9&&Math.random()<dt*10)CK.parts.push({x:100+(Math.random()-.5)*50,y:70,vx:0,vy:-16,life:1.1,c:'rgba(80,70,70,.45)',r:2});
    if(Math.random()<dt*14)CK.parts.push({x:100+(Math.random()-.5)*60,y:96,vx:(Math.random()-.5)*8,vy:-18,life:.5,c:'#f2a95e',r:1});
    if((inp.pressed&&st.flip<=0)||st.d>1.35){const sc=clamp(1-Math.abs(st.d-.72)/.34,0,1);st.res.push(sc);sfx('flip');st.flip=.35;st.d=0;st.side++;
      $('cookmsg').textContent=sc>.8?'노릇노릇!':sc>.4?'괜찮아요':(st.d>1?'탔어요…':'덜 익었어요');
      if(st.side>=2)stepDone((st.res[0]+st.res[1])/2);}
  }else if(st.k==='plate'){
    if(!st.drop){st.px+=st.pv*dt;if(st.px>160){st.px=160;st.pv=-Math.abs(st.pv);}if(st.px<40){st.px=40;st.pv=Math.abs(st.pv);}
      if(inp.pressed){st.drop={y:20,vy:0};sfx('drop');}}
    else{st.drop.vy+=300*dt;st.drop.y+=st.drop.vy*dt;if(st.drop.y>=78&&st.res===null){const off=Math.abs(st.px-100);st.res=clamp(1-off/26,0,1);st.landX=st.px;
      for(let i=0;i<8;i++)CK.parts.push({x:100,y:78,vx:(Math.random()-.5)*60,vy:-30-Math.random()*30,g:160,life:.5,c:'#fff6e0'});stepDone(st.res,st.res>.85?'딱 가운데!':st.res<.3?'흘렸어요…':null);}}
  }
}
function toReveal(){
  const cook=CK.scores.reduce((a,b)=>a+b,0)/CK.scores.length,ing=(CK.ingQ-1)/2;const tot=cook*.72+ing*.28;
  CK.stars=tot>=.78?3:tot>=.48?2:1;CK.phase='reveal';CK.revealT=0;sfx('reveal');
  $('cookrev').hidden=false;$('revname').textContent=DISHES[CK.dish].n;$('revstars').innerHTML=stars(CK.stars);
  $('revcom').textContent=['','먹을 만해요. 다음엔 더 잘할 수 있어요.','맛있다! 솜씨가 좋아요.','한 입 먹자마자 눈이 감기는 맛!'][CK.stars];
  $('cookhelp').textContent='';$('cookmsg').textContent='';
}
function finishCook(){CK.on=false;$('cook').hidden=true;S.stats.cook++;const k=CK.dish;S.dishLog[k]=Math.max(S.dishLog[k]||0,CK.stars);const d=CK.done;CK.done=null;if(d)d(k,CK.stars);}
// ---------------- 그리기 ----------------
function cookRender(t){
  if(!CK.on)return;const x=cx2;x.imageSmoothingEnabled=false;x.drawImage(cookBg(),0,0);const st=CK.st;
  if(CK.phase==='reveal'){drawReveal(t);return;}
  if(st.k==='chop'){
    P(x,RAMP.wood[1],30,66,140,44);P(x,'#d9b98a',31,66,138,41);P(x,'#e8cfa2',31,66,138,2);P(x,'#c49a68',31,105,138,2);
    const art=BIGINGART[DISHES[CK.dish].ing]||BIGINGART.radish;const ox=46,oy=48,Z=2;
    const cuts=st.lines.filter(l=>l.cut).map(l=>l.x).sort((a,b)=>a-b);let prev=0,shift=0;
    for(const cxp of[...cuts,54]){const w=Math.round(cxp-prev);if(w>0)x.drawImage(art,Math.round(prev),0,w,30,ox+Math.round(prev)*Z+shift,oy,w*Z,60);prev=cxp;shift+=3;}
    for(const l of st.lines)if(!l.cut)for(let y=oy+6;y<oy+54;y+=4)P(x,'rgba(61,44,46,.6)',ox+Math.round(l.x*Z),y,1,2);
    const kx=ox+Math.round(st.kx*Z),ky=st.down>0?oy+10:oy-26;
    P(x,'#3d2c2e',kx-2,ky-1,5,34);P(x,'#cfd6d8',kx-1,ky,3,32);P(x,'#f4f7f6',kx-1,ky,1,32);P(x,RAMP.wood[1],kx-2,ky-14,5,14);P(x,RAMP.wood[3],kx-1,ky-13,3,12);
  }else if(st.k==='heat'){
    P(x,'#57524f',58,96,84,12);P(x,'#6f6a66',58,96,84,2);
    const fl=st.h;for(let i=0;i<9;i++){const fx=66+i*8,fh=3+fl*12+Math.sin(t*20+i)*2;P(x,'#c4614f',fx,96-fh,5,fh);P(x,'#eaa96a',fx+1,96-fh*.75,3,fh*.75);P(x,'#f6d58a',fx+2,96-fh*.4,1,fh*.4);}
    const tt=VESSEL[CK.dish]==='ttuk';const vy=tt?54:50,sy=tt?vy+22.5:vy+12;x.drawImage(tt?vessel(CK.dish):potArt(),68,vy);
    const pc=POTCOL[CK.dish]||R2.miso;shadeEll(x,100,sy,tt?19:21,tt?5.5:4.5,pc,{flat:.15,amb:-.05});
    if(st.h>=st.z&&st.h<=st.z+st.zw)for(let i=0;i<6;i++){const bx=86+((i*11+t*30)%28),by=sy-1+Math.sin(t*9+i)*1.5;P(x,'rgba(255,248,230,.75)',bx|0,by|0,2,1);}
    gauge(x,178,14,90,st.h,st.z,st.zw,st.h>st.z+st.zw+.06?'#c4614f':'#3d2c2e');
    P(x,'#3d2c2e',18,112,104,8);P(x,'#ece0c6',19,113,102,6);P(x,'#86a35a',19,113,Math.round(102*Math.min(1,st.prog)),6);
  }else if(st.k==='season'){
    x.drawImage(VESSEL[CK.dish]==='ttuk'||VESSEL[CK.dish]==='bowl'?vessel(CK.dish):GRILLFISH[CK.dish]?vessel('plate'):vessel(CK.dish),68,56);
    if(GRILLFISH[CK.dish])x.drawImage(bigFish(GRILLFISH[CK.dish]),68,70,64,26);else if(VESSEL[CK.dish])shadeEll(x,100,78,20,5,POTCOL[CK.dish]||R2.miso,{flat:.15});
    const sx=Math.round(st.sx);P(x,'#3d2c2e',sx-6,4,13,22);P(x,'#f3e6cf',sx-5,5,11,20);P(x,'#e2cfb0',sx+2,5,3,20);P(x,'#a69e93',sx-5,5,11,4);for(const dx of[-3,0,3])P(x,'#3d2c2e',sx+dx,6,1,1);
    const bx=20,bw=160,by=114;P(x,'#3d2c2e',bx-1,by-1,bw+2,9);P(x,'#ece0c6',bx,by,bw,7);P(x,'#9fc07a',bx+bw*st.lo,by,bw*(st.hi-st.lo),7);P(x,'#cf8a6a',bx,by,Math.min(bw,bw*st.m),3);
    P(x,'#3d2c2e',bx+Math.min(bw,bw*st.m)-1,by-3,2,13);
  }else if(st.k==='grill'){
    for(let i=0;i<14;i++){const gx=40+i*9,g=.5+Math.sin(t*3+i)*.5;P(x,g>.5?'#e2873f':'#c4614f',gx,100,7,4);P(x,'#3d2c2e',gx,104,7,2);}
    P(x,'#3d2c2e',38,70,128,30);P(x,'#2b2526',40,72,124,26);for(let i=0;i<14;i++)P(x,'#5f6268',42+i*9,72,2,26);P(x,'#777a80',40,72,124,1);
    const fsp=bigFish(st.sp);const fy=72+(st.flip>0?-Math.sin((1-st.flip/.35)*Math.PI)*18:0);
    const f2=mk(64,26,c=>{c.drawImage(fsp,0,0);c.globalCompositeOperation='source-atop';const d=st.d;
      const col=d<.5?`rgba(205,200,210,${.35-d*.4})`:d<.95?`rgba(200,130,55,${(d-.5)*1})`:`rgba(55,35,28,${Math.min(.8,(d-.95)*2+.35)})`;c.fillStyle=col;c.fillRect(0,0,64,26);
      if(d>.45){c.fillStyle=`rgba(60,34,22,${Math.min(.6,(d-.45)*1.6)})`;for(let k=0;k<5;k++)c.fillRect(14+k*8,3,2,20);}});
    x.save();if(st.side%2===1){x.translate(200,0);x.scale(-1,1);}x.drawImage(f2,68,fy);x.restore();
    P(x,'#3d2c2e',18,114,164,9);const grad=[[0,'#c9c4cc'],[.55,'#d9a35a'],[.95,'#b06a2c'],[1.2,'#4a342a']];for(let i=0;i<162;i++){const v=i/162*1.3;let c='#c9c4cc';for(const[a,cc]of grad)if(v>=a)c=cc;P(x,c,19+i,115,1,7);}
    P(x,'rgba(255,255,255,.4)',19+Math.round(162*(.72/1.3))-10,115,20,7);
    P(x,'#3d2c2e',19+Math.round(162*Math.min(1.3,st.d)/1.3)-1,111,2,15);
  }else if(st.k==='plate'){
    const v=vessel(CK.dish);x.drawImage(v,Math.round(st.px-32),62);
    P(x,'rgba(61,44,46,.25)',99,40,1,70);
    if(st.drop&&st.res===null){const pc=POTCOL[CK.dish]||R2.miso;shadeEll(x,100,st.drop.y,9,6,pc,{dither:false,spec:'#fff'});}
    if(st.res!==null){x.drawImage(DISHART[CK.dish],Math.round(st.landX-32),62);}
    else{const pc=POTCOL[CK.dish]||R2.miso;P(x,RAMP.wood[1],84,6,32,6);if(!st.drop)shadeEll(x,100,18,9,6,pc,{dither:false,spec:'#fff'});}
  }
  for(const p of CK.parts){x.fillStyle=p.c;x.globalAlpha=clamp(p.life*2,0,1);x.fillRect(Math.round(p.x),Math.round(p.y),p.r||1,p.r||1);}x.globalAlpha=1;
}
let POTART=null;function potArt(){return POTART||(POTART=outline(mk(64,48,x=>{shadeCyl(x,8,12,48,26,R2.steel,.05);shadeEll(x,32,12,24,6,R2.steel,{flat:.3,dither:false});shadeEll(x,32,12,22,5,['#2b2c30','#3a3b40'],{dither:false});
  P(x,'#3a3b40',2,16,6,3);P(x,'#3a3b40',56,16,6,3);})));}
function gauge(x,gx,gy,gh,v,z,zw,nc){P(x,'#3d2c2e',gx-1,gy-1,10,gh+2);P(x,'#ece0c6',gx,gy,8,gh);P(x,'#f1bbb1',gx,gy,8,Math.round(gh*.15));
  P(x,'#9fc07a',gx,gy+Math.round(gh*(1-z-zw)),8,Math.round(gh*zw));const ny=gy+Math.round(gh*(1-v));P(x,nc,gx-4,ny-1,16,3);P(x,'#fbf5ea',gx-3,ny,14,1);}
function drawReveal(t){
  const x=cx2;x.fillStyle='rgba(61,44,46,.55)';x.fillRect(0,0,CKW,CKH);
  const g=x.createRadialGradient(100,62,4,100,62,80);g.addColorStop(0,'rgba(255,226,170,.55)');g.addColorStop(1,'rgba(255,226,170,0)');x.fillStyle=g;x.fillRect(0,0,CKW,CKH);
  const k=Math.min(1,CK.revealT*3),s=2;x.save();x.translate(100,66);x.scale(s*(.8+.2*k),s*(.8+.2*k));x.drawImage(DISHART[CK.dish],-32,-24);x.restore();
  for(let i=0;i<5;i++){const sx=74+i*12,ph=t*1.6+i*1.3;for(let j=0;j<16;j++){const yy=40-j*2.2-((t*14+i*7)%8),xx=sx+Math.sin(ph+j*.35)*3;x.fillStyle=`rgba(255,255,255,${.28*(1-j/16)})`;x.fillRect(Math.round(xx),Math.round(yy),2,2);}}
  if(CK.stars===3)for(let i=0;i<6;i++){const a=t*1.5+i;const r=48+Math.sin(t*3+i)*4;const X=100+Math.cos(a)*r*1.3,Y=62+Math.sin(a)*r*.7;P(x,'#fff6c8',Math.round(X),Math.round(Y)-1,1,3);P(x,'#fff6c8',Math.round(X)-1,Math.round(Y),3,1);}
}
