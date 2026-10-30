'use strict';
// =====================================================================
//  요리 — 실제 조리 순서대로. 냄비 상태(물 높이, 국물 색, 온도, 건더기)가 단계를 넘어 이어진다
// =====================================================================
const CK={on:false,dish:null,steps:[],si:0,scores:[],st:null,ingQ:2,done:null,phase:'step',msgT:0,parts:[],revealT:0,stars:0,K:null};
const cookCv=$('cookcv'),cx2=cookCv.getContext('2d');const CKW=220,CKH=130;
const LIQ={water:'#a9c9c8',miso:'#b07a45',red:'#b2452f',soy:'#6a3a22',milk:'#efe8da',pumpkin:'#e0a24a',ricewater:'#e3ddcd',egg:'#f0cc5a',cream:'#fbf6ec'};
const SKINC={radish:'#d9d0b0',potato:'#9a7356',pumpkin:'#3b5534',carrot:'#c4804a'};
// ---------------- 작은 그림 ----------------
const PIECE={};
function buildPieces(){const pc=(fn)=>outline(mk(9,9,fn));
  PIECE.radish=pc(x=>{P(x,'#d9d2bd',2,3,5,5);P(x,'#f6f1e3',2,2,5,4);P(x,'#fff',2,2,1,1);});
  PIECE.potato=pc(x=>{P(x,'#d2a85e',2,3,5,5);P(x,'#ecc77d',2,2,5,4);P(x,'#fbe2a8',2,2,1,1);});
  PIECE.carrot=pc(x=>{P(x,'#c4804a',3,3,3,3);P(x,'#e7a160',3,3,3,2);});
  PIECE.onion=pc(x=>{fe(x,4.5,4.5,2.6,2.6,'#77a052');fe(x,4.5,4.5,1.3,1.3,'#d7e8b8');});
  PIECE.mushroom=pc(x=>{fe(x,4.5,4,3.4,2.2,'#7f5d47');P(x,'#e6d2b2',4,5,2,3);P(x,'#a07a5c',3,3,2,1);});
  PIECE.f_catfish=pc(x=>{P(x,'#e9e2d4',1,3,7,5);P(x,'#5a504a',1,2,7,2);P(x,'#fff',2,4,1,1);});
  PIECE.pumpkin=pc(x=>{P(x,'#e7a54a',2,3,5,5);P(x,'#f3c46e',2,3,5,3);P(x,'#3b5534',2,7,5,1);});
  PIECE.strawberry=pc(x=>{fe(x,4.5,4.8,3,3.2,'#c4503f');fe(x,4.5,4.8,1.4,1.8,'#f4d6c8');});
  PIECE.rice=pc(x=>{fe(x,4.5,4.5,3,2.4,'#f7f3e9');P(x,'#e0d8c6',3,6,3,1);});
  PIECE.yolk=pc(x=>{fe(x,4.5,4.5,3.4,3,'#f7f0de');fe(x,4.5,4.5,1.8,1.8,'#f2b632');P(x,'#fde7a6',4,4,1,1);});
}
let CKBG=null;const VCACHE={};
function cookBg(){return CKBG||(CKBG=mk(CKW,CKH,x=>{
  for(let y=0;y<58;y++)for(let i=0;i<CKW;i++){P(x,(i%10===0||y%10===0)?'#d8c8ad':((i/10|0)+(y/10|0))%2?'#efe3cc':'#e9dcc3',i,y);}
  P(x,'rgba(61,44,46,.12)',0,55,CKW,3);
  for(let y=58;y<CKH;y++)for(let i=0;i<CKW;i++){const row=(y-58)>>3;let k=3+(vnoise(i*.05,y*.6,row)-.5)*1.2;if((y-58)%8===7)k=1.6;P(x,RAMP.wood[clamp(Math.round(k),0,5)],i,y);}
  P(x,RAMP.wood[5],0,58,CKW,1);}));}
// 그릇: 100×64 캔버스에 그리고 (60,40)에 놓는다. 안쪽 타원 좌표는 캔버스 좌표로 저장
const VX=60,VY=40;
function vesselArt(t){if(VCACHE[t])return VCACHE[t];let inner;const img=outline(mk(100,64,x=>{
  if(t==='ttuk'){inner=ttukbaegi(x,50,22,38,12,24);shadeEll(x,inner[0],inner[1],inner[2],inner[3],R2.pot,{flat:.2,amb:-.3});inner.push(9);}
  else if(t==='pot'){shadeCyl(x,13,22,74,30,R2.steel,.05);P(x,'#3a3b40',4,28,10,4);P(x,'#3a3b40',86,28,10,4);shadeEll(x,50,22,37,10,R2.steel,{flat:.3});inner=[50,22,34,8.5,11];fe(x,50,22,34,8.5,'#2e2f34');}
  else if(t==='pan'){fe(x,46,34,36,15,'#2b2526');fe(x,46,33,34,13.5,'#3b3334');inner=[46,33,31,11.5,3];fe(x,46,33,31,11.5,'#4a4042');P(x,'#5a4033',80,30,19,5);P(x,'#7a5a44',80,30,19,1);}
  else if(t==='ricepot'){shadeEll(x,50,34,36,20,R2.pot,{amb:.05});fe(x,50,30,44,8,'#3d302c');fe(x,50,29,43,7,'#4f3e37');shadeEll(x,50,22,32,9,R2.pot,{flat:.3});inner=[50,22,29,7.5,7];fe(x,50,22,29,7.5,'#231c1b');}
  else if(t==='bowl'){for(let y=0;y<26;y++){const w=40*Math.sqrt(1-Math.pow(y/26,2)*.8);for(let i=Math.round(50-w);i<=Math.round(50+w);i++){const nx=(i-50)/w;P(x,R2.steel[clamp(Math.floor((.6-nx*.4-y/60)*5),0,4)],i,22+y);}}
    shadeEll(x,50,22,40,11,R2.steel,{flat:.3});inner=[50,22,37,9.5,8];fe(x,50,22,37,9.5,'#5f6268');}
  else if(t==='steamer'){shadeCyl(x,16,14,68,34,['#8a6a3c','#a8854c','#c4a263','#dabd80'],.05);for(const y of[18,30,42])P(x,'#7a5c34',16,y,68,2);fe(x,50,14,34,9,'#c4a263');fe(x,50,14,30,7,'#dabd80');P(x,'#7a5c34',46,4,8,4);inner=[50,14,30,7,4];}
  else if(t==='plate'){dsh(x,50,44,40,8);plate(x,50,34,40,14);inner=[50,34,30,9,1];}
  else if(t==='bowlw'){dsh(x,50,52,32,6);inner=whiteBowl(x,50,26,32,10,22);inner.push(8);}
})),r={img,ix:VX+inner[0],iy:VY+inner[1],irx:inner[2],iry:inner[3],dep:inner[4]};return VCACHE[t]=r;}
function surf(v,level){const L=clamp(level,0,1);return{x:v.ix,y:v.iy+(1-L)*v.dep,rx:v.irx*(.78+.22*L),ry:v.iry*(.78+.22*L)};}
function drawLiquid(x,v,level,colr,t,bub=0){if(level<=.01)return;const s=surf(v,level);fe(x,s.x,s.y,s.rx,s.ry,mix(colr,'#3d2c2e',.18));fe(x,s.x,s.y+.5,s.rx-1,s.ry-.8,colr);
  P(x,mix(colr,'#ffffff',.45),Math.round(s.x-s.rx*.5),Math.round(s.y-s.ry*.4),Math.round(s.rx*.3),1);
  if(bub>0)for(let i=0;i<Math.round(bub*12);i++){const a=i*2.4+t*(2+bub*5),r=((i*37)%10)/10;const bx=s.x+Math.cos(a)*s.rx*.75*r,by=s.y+Math.sin(a)*s.ry*.7*r;const sz=bub>.7&&i%3===0?2:1;
    P(x,'rgba(255,250,240,.75)',Math.round(bx),Math.round(by),sz,sz);}}
function drawPieces(x,v,level,t,bub){const K=CK.K;const s=surf(v,Math.max(level,.15));K.pieces.forEach((p,i)=>{const bob=bub>.5?Math.sin(t*8+i)*bub:0;
  x.drawImage(PIECE[p.k],Math.round(s.x+p.u*s.rx*.75-4),Math.round(s.y+p.v*s.ry*.65-5+bob));});}
function drawFlame(x,f,t){P(x,'#4a4644',78,104,64,6);P(x,'#615b58',78,104,64,1);if(f<=.02)return;
  for(let i=0;i<9;i++){const fx=82+i*6.5,fh=2+f*10+Math.sin(t*22+i*1.7)*1.5;P(x,'#5f84c4',fx,104-fh,4,fh);P(x,'#9cc0e8',fx+1,104-fh*.6,2,fh*.6);if(f>.7)P(x,'#eaa96a',fx+1,104-fh-2,2,2);}}
function steam(x,cx,cy,amt,t){for(let i=0;i<Math.round(amt*6);i++){const ph=t*1.4+i*1.7;for(let j=0;j<10;j++){const yy=cy-j*2.5-((t*12+i*9)%7),xx=cx-16+i*7+Math.sin(ph+j*.4)*2.5;x.fillStyle=`rgba(255,255,255,${.3*amt*(1-j/10)})`;x.fillRect(Math.round(xx),Math.round(yy),2,2);}}}
function big(ing){if(ing==='fish')return bigFishBig();return BIGINGART[ing]||BIGINGART.radish;}
const fbCache={};function bigFishBig(){const sp={grill:'f_crucian',ayu:'f_sweet',goldfish:'f_gold'}[CK.dish]||'f_crucian';return fbCache[sp]||(fbCache[sp]=outline(mk(54,30,x=>x.drawImage(fishArt(50,22,FISHRAMP[sp][0],FISHRAMP[sp][1]),2,4))));}
function opaqueSpots(img,n,seed){const d=img.getContext('2d').getImageData(0,0,img.width,img.height).data;const out=[];const r=rng(seed);
  for(let k=0;k<400&&out.length<n;k++){const a=r()*img.width|0,b=r()*img.height|0;if(d[(b*img.width+a)*4+3]>200)out.push({x:a,y:b,on:true});}return out;}
function addPieces(k,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,r=Math.sqrt(Math.random());CK.K.pieces.push({k,u:Math.cos(a)*r,v:Math.sin(a)*r});}}
function knife(x,kx,ky,ang=0,cleaver){x.save();x.translate(kx,ky);x.rotate(ang);const w=cleaver?7:3;P(x,'#3d2c2e',-1-w/2|0,-1,w+2,30);P(x,'#cfd6d8',-w/2|0,0,w,28);P(x,'#f4f7f6',-w/2|0,0,1,28);P(x,RAMP.wood[1],-2,-14,5,14);P(x,RAMP.wood[3],-1,-13,3,12);x.restore();}

// ---------------- 단계 ----------------
const STEP={
  wash:{help:c=>c.kind==='scale'?'칼등이 비늘 위를 지날 때 눌러서 긁어내요.':c.kind==='slime'?'미끈한 점액이 있는 곳을 문질러 씻어요.':'솔이 흙 묻은 곳을 지날 때 눌러서 문질러요.',
    init(s,c){s.img=big(c.ing);s.spots=opaqueSpots(s.img,c.kind==='scale'?10:8,s.seed);s.press=0;},
    update(s,dt,I){s.sx=56+54+Math.sin(s.t*1.7)*48;s.sy=50+30+Math.sin(s.t*2.9+1)*20;
      if(I.pressed){s.press++;sfx(s.c.kind==='scale'?'chop':'water');let hit=false;for(const p of s.spots)if(p.on&&Math.hypot(56+p.x*2-s.sx,50+p.y*2-s.sy)<12){p.on=false;hit=true;for(let i=0;i<3;i++)part2(s.sx,s.sy,s.c.kind==='scale'?'#e8eef0':'#b8d4d0');}if(hit)sfx('pick');}
      const left=s.spots.filter(p=>p.on).length;if(!left)return clamp(1.5-s.press/(s.spots.length*2.2),.5,1);if(s.t>12)return 1-left/s.spots.length;},
    draw(x,s,t){if(s.c.kind!=='scale'&&s.c.kind!=='slime'){P(x,'#7a868b',30,66,160,48);P(x,'#9fb7b6',32,68,156,44);for(let i=0;i<6;i++)P(x,'#c2d6d2',40+((i*29+t*12)%140)|0,72+i*6,8,1);}
      else{P(x,RAMP.wood[1],30,66,160,46);P(x,'#d9b98a',31,66,158,43);}
      x.drawImage(s.img,56,50,108,60);
      for(const p of s.spots)if(p.on){const X=56+p.x*2,Y=50+p.y*2;if(s.c.kind==='scale'){P(x,'#e8eef0',X,Y,2,1);P(x,'#c3ccd0',X+1,Y+1,2,1);}else if(s.c.kind==='slime'){P(x,'rgba(200,215,200,.8)',X-2,Y,5,2);}else{fe(x,X,Y,3,2,'#6b4e3d');P(x,'#8e6a52',X-1,Y-1,2,1);}}
      const X=Math.round(s.sx),Y=Math.round(s.sy);if(s.c.kind==='scale')knife(x,X,Y-14,.6);else{P(x,'#3d2c2e',X-6,Y-4,13,8);P(x,'#e8c66a',X-5,Y-3,11,3);P(x,'#86a35a',X-5,Y,11,3);}}},
  peel:{help:()=>'필러가 아직 껍질 있는 곳을 지날 때 눌러서 깎아요. 깎은 데 또 깎으면 살이 줄어요.',
    init(s,c){s.img=big(c.ing);const d=s.img.getContext('2d').getImageData(0,0,54,30).data;s.cols=[];for(let i=0;i<9;i++){const a=Math.round(4+i*5.2);let any=false;for(let y=0;y<30;y++)if(d[(y*54+a+2)*4+3]>150)any=true;if(any)s.cols.push({x:a,w:5,on:true});}
      s.skin=mk(54,30,x=>{x.drawImage(s.img,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=SKINC[c.ing]||'#9a7356';x.globalAlpha=.85;x.fillRect(0,0,54,30);
        x.globalAlpha=1;x.fillStyle='rgba(61,44,46,.25)';for(let k=0;k<40;k++)x.fillRect(Math.random()*54|0,Math.random()*30|0,1,1);});s.px=0;s.pv=34;s.waste=0;},
    update(s,dt,I){s.px+=s.pv*dt;if(s.px>50){s.px=50;s.pv=-Math.abs(s.pv);}if(s.px<2){s.px=2;s.pv=Math.abs(s.pv);}
      if(I.pressed){const c=s.cols.find(c=>s.px>=c.x-1&&s.px<=c.x+c.w);if(c&&c.on){c.on=false;sfx('chop');for(let i=0;i<4;i++)part2(56+s.px*2,60,SKINC[s.c.ing]||'#9a7356',1);}else{s.waste++;sfx('chopbad');msg('살을 깎았어요');}}
      if(!s.cols.some(c=>c.on))return clamp(1-s.waste*.15,.2,1);if(s.t>16)return .4;},
    draw(x,s,t){P(x,RAMP.wood[1],30,66,160,46);P(x,'#d9b98a',31,66,158,43);x.drawImage(s.img,56,50,108,60);for(const c of s.cols)if(c.on)x.drawImage(s.skin,c.x,0,c.w,30,56+c.x*2,50,c.w*2,60);
      const X=56+Math.round(s.px*2);P(x,'#3d2c2e',X-2,38,5,28);P(x,'#cdd3d4',X-1,44,3,20);P(x,'#c4614f',X-2,30,5,10);}},
  chop:{help:c=>({mince:'계속 톡톡톡 눌러서 잘게 다져요.',score:'꾹 눌러 칼을 넣고, 칼집이 적당히 들어갔을 때 떼요. 너무 깊으면 잘려요.',half:'칼이 딸기 한가운데 올 때 눌러요.'}[c.style]||'칼이 점선 위에 왔을 때 눌러서 썰어요.'),
    init(s,c){s.img=big(c.ing);s.pass=0;s.good=0;s.miss=0;s.kx=0;s.kv=34;s.down=0;s.m=0;s.depth=0;s.marks=[];
      const n={cube:4,slice:5,diag:5,chunk:4,half:3}[c.style]||4;s.lines=[];
      if(c.style==='half')for(const a of[12,26,40])s.lines.push({x:a,cut:false});else if(c.style!=='mince'&&c.style!=='score')for(let i=0;i<n;i++)s.lines.push({x:12+(i+1)*(36/(n+1))+(Math.random()-.5)*2,cut:false});
      if(c.style==='score')s.marks=[{x:20,d:-1},{x:28,d:-1},{x:36,d:-1}];},
    update(s,dt,I){const c=s.c;
      if(c.style==='mince'){if(I.pressed){s.m+=.075;sfx('chop');s.down=.08;for(let i=0;i<2;i++)part2(110+(Math.random()-.5)*50,84,'#fbf5ea',1);}if(s.down>0)s.down-=dt;if(s.m>=1)return clamp(1.7-s.t/5,.4,1);return;}
      if(c.style==='score'){const m=s.marks.find(m=>m.d<0);if(!m)return clamp(s.good/3,0,1);
        if(I.down){s.depth+=dt*.9;if(s.depth>1){s.depth=0;m.d=1;s.miss++;sfx('chopbad');msg('잘려 버렸어요');}}
        if(I.released&&s.depth>0){const d=s.depth;m.d=d;s.depth=0;if(d>=.4&&d<=.72){s.good++;sfx('chop');msg('좋아요');}else{sfx('chopbad');msg(d<.4?'너무 얕아요':'너무 깊어요');}}return;}
      s.kx+=s.kv*dt;if(s.kx>52){s.kx=52;s.kv=-Math.abs(s.kv);}if(s.kx<2){s.kx=2;s.kv=Math.abs(s.kv);}if(s.down>0)s.down-=dt;
      if(I.pressed&&s.down<=0){s.down=.14;let best=null,bd=99;for(const l of s.lines)if(!l.cut&&Math.abs(l.x-s.kx)<bd){bd=Math.abs(l.x-s.kx);best=l;}
        if(best&&bd<=2.6){best.cut=true;s.good++;sfx('chop');s.kv*=1.1;for(let i=0;i<3;i++)part2(56+s.kx*2,90,'#fbf5ea',1);}else{s.miss++;sfx('chopbad');msg('삐끗!');}
        if(!s.lines.some(l=>!l.cut)){if(c.style==='cube'&&s.pass===0){s.pass=1;msg('돌려서 한 번 더');s.lines=[];for(let i=0;i<3;i++)s.lines.push({x:18+(i+1)*7+(Math.random()-.5)*2,cut:false});s.kx=0;}
          else return clamp(s.good/(s.good+s.miss*.7),0,1);}
        if(s.miss>=4){s.lines.forEach(l=>l.cut=true);return .35;}}},
    draw(x,s,t){const c=s.c;P(x,RAMP.wood[1],30,66,160,46);P(x,'#d9b98a',31,66,158,43);P(x,'#e8cfa2',31,66,158,2);
      if(c.style==='mince'){const n=4+Math.floor(s.m*28),sz=Math.max(2,6-s.m*4);for(let i=0;i<n;i++){const a=hash(i,3)*6.28,r=hash(i,4)*22*(.5+s.m*.6);x.drawImage(PIECE[c.ing]||PIECE.carrot,Math.round(110+Math.cos(a)*r*1.6-sz/2),Math.round(86+Math.sin(a)*r*.5-sz/2),sz+2,sz+2);}
        knife(x,110+Math.sin(s.t*30)*12,s.down>0?66:52,0,false);bar(x,40,118,140,s.m,'#86a35a');return;}
      if(c.style==='cube'&&s.pass===1){for(let j=0;j<3;j++)for(let i=0;i<4;i++)P(x,j%2?'#e3dcc8':'#f3eddc',86+i*12,66+j*8,11,7);for(const l of s.lines)if(l.cut)P(x,'#d9b98a',56+l.x*2,64,1,28);}
      else{const cuts=s.lines.filter(l=>l.cut).map(l=>l.x).sort((a,b)=>a-b);let prev=0,sh=0;for(const cxp of[...cuts,54]){const w=Math.round(cxp-prev);if(w>0)x.drawImage(s.img,Math.round(prev),0,w,30,56+Math.round(prev)*2+sh,50,w*2,60);prev=cxp;sh+=3;}}
      for(const l of s.lines)if(!l.cut)for(let y=0;y<14;y++){const dx=c.style==='diag'?Math.round(y*.7):0;P(x,'rgba(61,44,46,.6)',56+Math.round(l.x*2)+dx-5,54+y*4,1,2);}
      for(const m of s.marks){if(m.d>=0){const len=Math.round(6+m.d*14);for(let k=0;k<len;k++)P(x,m.d>1?'#94443d':'#6b3a20',56+m.x*2+k*.5|0,64+k,1,1);}}
      if(c.style==='score'){const m=s.marks.find(m=>m.d<0);if(m){knife(x,56+m.x*2,40+s.depth*24,.4);gaugeV(x,196,30,70,s.depth,.4,.32);}}
      else knife(x,56+Math.round(s.kx*2)+(c.style==='diag'?8:0),s.down>0?54:30,c.style==='diag'?.45:0,c.style==='chunk');}},
  pour:{help:c=>`꾹 누르면 ${c.what||'물'}이 부어져요. 표시선에 맞춰 떼요.`,
    init(s,c){s.v=vesselArt(c.vessel);CK.K.vessel=c.vessel;s.idle=0;s.pouring=0;if(CK.K.liquid!==c.liq&&CK.K.level>0)s.mixFrom=CK.K.liquid;CK.K.liquid=c.liq;s.start=CK.K.level;},
    update(s,dt,I){const K=CK.K;if(I.down){K.level+=dt*.26;s.pouring=1;s.idle=0;if(Math.random()<dt*10)sfx('bubble');}else{s.pouring=Math.max(0,s.pouring-dt*4);s.idle+=dt;}
      if(K.level>1.02){K.level=.95;msg('넘쳤어요!');sfx('bad');return .2;}if(s.idle>1.1&&K.level>s.start+.05)return clamp(1-Math.abs(K.level-s.c.target)*4,0,1);},
    draw(x,s,t){const K=CK.K;x.drawImage(s.v.img,VX,VY);const col=s.mixFrom?mix(LIQ[s.mixFrom],LIQ[K.liquid],clamp((K.level-s.start)*3,0,.8)):LIQ[K.liquid];
      drawLiquid(x,s.v,K.level,col,t);drawPieces(x,s.v,K.level,t,0);const ts=surf(s.v,s.c.target);P(x,'#c4614f',Math.round(ts.x+ts.rx)-1,Math.round(ts.y)-1,4,2);P(x,'#c4614f',Math.round(ts.x-ts.rx)-2,Math.round(ts.y)-1,4,2);
      const kx=140,ky=22;P(x,'#3d2c2e',kx-1,ky-1,26,16);P(x,s.c.liq==='milk'?'#fbf6ec':s.c.liq==='soy'?'#5a3a2a':'#a69e93',kx,ky,24,14);P(x,'#3d2c2e',kx-6,ky+3,7,3);
      if(s.pouring>0)for(let y=ky+5;y<surf(s.v,K.level).y;y+=2)P(x,LIQ[K.liquid],kx-6+Math.round(Math.sin(y*.5+t*20)*.6),y,2,2);}},
  boil:{help:c=>c.mode==='boil'?'꾹 누르면 불이 세져요. 물이 펄펄 끓게 하되 넘치지 않게!':'보글보글 끓는 상태(초록 칸)를 유지해요. 너무 세면 넘쳐요.',
    init(s,c){s.v=vesselArt(CK.K.vessel||'pot');s.prog=0;s.over=0;s.inZ=0;},
    update(s,dt,I){const K=CK.K;K.flameV+=(I.down?1.4:-1.2)*dt;K.flameV=clamp(K.flameV,-.6,.6);K.flame=clamp(K.flame+K.flameV*dt,0,1);if(K.flame===0||K.flame===1)K.flameV=0;
      K.temp+=(K.flame*1.06-K.temp)*dt*.55;K.temp=clamp(K.temp,0,1);
      if(K.temp>.94&&K.flame>.8)K.foam+=dt*.7;else K.foam=Math.max(0,K.foam-dt*.5);
      if(K.foam>=1){K.foam=.3;s.over++;sfx('sizzle');msg('넘쳤어요!');K.flame*=.5;}
      if(K.temp>.6&&Math.random()<dt*K.temp*8)sfx('bubble');
      if(s.c.mode==='boil'){if(K.temp>=.82){s.inZ+=dt;if(s.inZ>1.2)return clamp(1.2-s.t/12-s.over*.25,.3,1);}else s.inZ=0;if(s.t>15)return .4;}
      else{const z=K.temp>=.62&&K.temp<=.86;if(z)s.prog+=dt/s.c.dur;K.cooked=s.prog;if(s.prog>=1)return clamp(1-s.over*.25-Math.max(0,s.t-s.c.dur-3)*.05,.3,1);if(s.t>s.c.dur+12)return .4;}},
    draw(x,s,t){const K=CK.K;drawFlame(x,K.flame,t);x.drawImage(s.v.img,VX,VY);const bub=K.temp<.55?0:(K.temp-.55)/.45;
      drawLiquid(x,s.v,K.level+K.foam*.15,K.foam>.3?mix(LIQ[K.liquid],'#fffaf0',K.foam*.6):brothCol(),t,bub);drawPieces(x,s.v,K.level,t,bub);steam(x,110,VY+10,clamp(K.temp*1.2-.3,0,1),t);
      gaugeV(x,196,22,76,K.temp,s.c.mode==='boil'?.82:.62,s.c.mode==='boil'?.15:.24,['차가움','','펄펄']);if(s.c.mode!=='boil')bar(x,40,120,140,s.prog,'#86a35a');}},
  reduce:{help:()=>'국물이 졸아드는 걸 지켜보다가, 자작하게 남았을 때 눌러서 불을 꺼요.',
    init(s,c){s.v=vesselArt(CK.K.vessel||'pan');CK.K.flame=.55;},
    update(s,dt,I){const K=CK.K;K.level-=dt*.055;K.temp=.9;if(Math.random()<dt*6)sfx('bubble');
      if(I.pressed){K.flame=0;const d=Math.abs(K.level-.12);return clamp(1-d*6,.2,1);}if(K.level<=0){K.level=0;msg('바닥이 탔어요…');return .15;}},
    draw(x,s,t){const K=CK.K;drawFlame(x,K.flame,t);x.drawImage(s.v.img,VX,VY);drawLiquid(x,s.v,Math.max(K.level,.04),mix(LIQ.soy,'#3d2210',1-K.level*2),t,.7);
      CK.K.pieces.forEach((p,i)=>{const sp=surf(s.v,.2);x.drawImage(PIECE[p.k],Math.round(sp.x+p.u*sp.rx*.75-4),Math.round(sp.y+p.v*sp.ry*.6-5));if(K.level<.3)P(x,'rgba(255,240,200,.7)',Math.round(sp.x+p.u*sp.rx*.75-2),Math.round(sp.y+p.v*sp.ry*.6-4),1,1);});
      steam(x,106,VY+18,.7,t);gaugeV(x,196,22,76,K.level/.45,.08/.45*1,.1/.45,['','','']);}},
  stir:{help:c=>({dissolve:`톡톡 눌러서 ${c.what||'된장'}을 국자로 풀어요.`,whisk:'톡톡 눌러 거품을 내요. 초록 칸에 들어오면 멈춰요. 너무 치면 분리돼요.',mash:'톡톡 눌러서 곱게 으깨요.'}[c.mode]),
    init(s,c){s.v=vesselArt(c.mode==='whisk'?'bowl':(CK.K.vessel||'pot'));s.paste=1;s.f=0;s.idle=0;s.ang=0;if(c.mode==='whisk'){CK.K.vessel='bowl';CK.K.level=.45;CK.K.liquid=c.liq||'egg';CK.K.pieces=[];}},
    update(s,dt,I){const c=s.c,K=CK.K;if(I.pressed){s.ang+=1.1;s.idle=0;sfx(c.mode==='whisk'?'shake':'bubble');}else s.idle+=dt;
      if(c.mode==='dissolve'){if(I.pressed)s.paste-=.1;K.paste=1-Math.max(0,s.paste);if(s.paste<=0)return clamp(1.6-s.t/5,.5,1);}
      if(c.mode==='mash'){if(I.pressed){s.f+=.07;if(K.pieces.length&&Math.random()<.4)K.pieces.pop();}K.liquid=s.f>.5?'pumpkin':K.liquid;if(s.f>=1){K.pieces=[];return clamp(1.7-s.t/6,.4,1);}}
      if(c.mode==='whisk'){if(I.pressed)s.f+=.065;s.f=Math.max(0,s.f-dt*.035);const lo=.72,hi=.9;
        if(s.f>1.02){msg('분리돼 버렸어요…');return .25;}if(s.f>=lo&&s.f<=hi&&s.idle>1)return 1;if(s.t>16)return clamp(s.f/lo*.7,0,.8);}},
    draw(x,s,t){const c=s.c,K=CK.K;if(c.mode!=='whisk')drawFlame(x,K.flame*.6,t);x.drawImage(s.v.img,VX,VY);
      if(c.mode==='whisk'){const sp=surf(s.v,.5);const col=mix(LIQ[K.liquid],'#fffaf0',clamp(s.f,0,1)*.85);fe(x,sp.x,sp.y,sp.rx,sp.ry,col);for(let i=0;i<Math.round(s.f*14);i++){const a=i*2.3,r=((i*13)%9)/9;fe(x,sp.x+Math.cos(a)*sp.rx*.6*r,sp.y-1+Math.sin(a)*sp.ry*.5*r-s.f*2,1.6+s.f,1.2+s.f*.8,'#fffdf8');}
        gaugeV(x,196,22,76,s.f,.72,.18,['','','']);}
      else{drawLiquid(x,s.v,K.level,brothCol(),t,.2);drawPieces(x,s.v,K.level,t,0);if(c.mode==='dissolve'&&s.paste>0){const sp=surf(s.v,K.level);fe(x,sp.x+6,sp.y-2,3+s.paste*4,2+s.paste*2.5,c.liq==='red'?'#8c2a22':'#8a5a32');}
        if(c.mode==='mash')bar(x,40,120,140,s.f,'#e0a24a');}
      const sp=surf(s.v,Math.max(K.level,.4)),ax=sp.x+Math.cos(s.ang)*sp.rx*.45,ay=sp.y+Math.sin(s.ang)*sp.ry*.45;
      if(c.mode==='whisk'){for(let k=0;k<5;k++)line(x,ax-2+k,ay,ax-4+k*2,ay-26,'#a9b4b8');P(x,RAMP.wood[2],Math.round(ax-6),Math.round(ay-38),3,12);}
      else{line(x,ax,ay,ax+18,ay-30,RAMP.wood[1]);line(x,ax+1,ay,ax+19,ay-30,RAMP.wood[3]);fe(x,ax,ay,4,2.4,RAMP.wood[2]);}}},
  stirfry:{help:()=>'재료가 눌어붙기 시작하면(빨간 표시) 눌러서 뒤집어 볶아요. 너무 자주 뒤집으면 흘려요.',
    init(s,c){s.v=vesselArt('pan');CK.K.vessel='pan';CK.K.flame=.75;if(!CK.K.pieces.length)addPieces(c.ing||'potato',8);if(c.rice)addPieces('rice',12);s.stick=0;s.pen=0;s.jump=0;s.brown=0;},
    update(s,dt,I){s.stick+=dt*.38;s.brown+=dt*.12;if(s.jump>0)s.jump-=dt;if(Math.random()<dt*5)sfx('sizzle');
      if(I.pressed){if(s.stick<.3){s.pen+=.06;msg('너무 자주 뒤집어요');}else sfx('flip');s.stick=0;s.jump=.35;}
      if(s.stick>=1){s.pen+=.18;s.stick=.4;msg('눌어붙었어요!');for(let i=0;i<4;i++)part2(110,80,'rgba(80,70,70,.5)',0,2);}if(s.t>=7)return clamp(1-s.pen,.2,1);},
    draw(x,s,t){drawFlame(x,CK.K.flame,t);x.drawImage(s.v.img,VX,VY);const sp=surf(s.v,.2);const j=s.jump>0?Math.sin(s.jump/.35*Math.PI)*14:0;
      CK.K.pieces.forEach((p,i)=>{x.drawImage(PIECE[p.k],Math.round(sp.x+p.u*sp.rx*.75-4),Math.round(sp.y+p.v*sp.ry*.6-5-j*(.6+.4*hash(i,1))));});
      if(s.brown>.4)x.fillStyle=`rgba(140,80,30,${Math.min(.3,(s.brown-.4)*.4)})`,x.fillRect(sp.x-sp.rx,sp.y-sp.ry,sp.rx*2,sp.ry*2);
      if(s.stick>.6)for(let i=0;i<3;i++)P(x,'#c4614f',Math.round(sp.x-10+i*10),Math.round(sp.y+sp.ry-2),3,1);
      bar(x,40,120,140,s.t/7,'#cc8248');gaugeV(x,196,22,76,s.stick,.3,.7,['','','']);}},
  add:{help:c=>c.hint||'넣을 재료를 순서대로 골라요.',
    init(s,c){s.i=0;s.miss=0;s.v=vesselArt(CK.K.vessel||'pot');showChoices(c.order.slice().sort(()=>Math.random()-.5),k=>{if(k===c.order[s.i]){s.i++;addPieces(k,k==='onion'?6:5);sfx('plop');for(let i=0;i<4;i++)part2(110,VY+20,'#d8e8e4');if(s.i>=c.order.length){s.fin=true;hideChoices();}}else{s.miss++;sfx('bad');msg('그건 나중에 넣어요!');}});},
    update(s,dt,I){if(s.fin)return clamp(1-s.miss*.25,.2,1);},
    draw(x,s,t){const K=CK.K;drawFlame(x,K.flame,t);x.drawImage(s.v.img,VX,VY);drawLiquid(x,s.v,K.level,brothCol(),t,K.temp>.6?.5:0);drawPieces(x,s.v,K.level,t,.3);}},
  season:{help:c=>`${c.what||'소금'}을 톡톡 넣고 잠시 멈추면 맛을 봐요. 싱거우면 조금 더.`,
    init(s,c){if(c.on)CK.K.vessel=c.on;s.v=vesselArt(CK.K.vessel||'pot');s.m=0;s.idle=0;s.tastes=0;s.lo=.5+Math.random()*.1;s.hi=s.lo+.2;s.taste=0;s.sx=110;},
    update(s,dt,I){s.sx=110+Math.sin(s.t*2.2)*22;if(s.taste>0){s.taste-=dt;if(s.taste<=0){s.tastes++;const m=s.m;
        if(m<s.lo){msg('음… 싱거워요');}else if(m<=s.hi){msg('딱 좋아요!');return clamp(1-(s.tastes-1)*.08,.6,1);}else{msg('짜요!');return clamp(1-(m-s.hi)*3,.2,.6);}}return;}
      if(I.pressed){s.m+=.08+Math.random()*.06;s.idle=0;sfx('shake');for(let i=0;i<5;i++)part2(s.sx,34,s.c.cond==='ganjang'?'#4a2a1a':s.c.cond==='gochu'?'#b4402c':'#fbf5ea',0,1,40);}else s.idle+=dt;
      if(s.idle>1.1&&s.m>0&&s.taste<=0){s.taste=.9;s.idle=-99;sfx('pick');}if(s.idle<-90&&s.taste<=0)s.idle=0;if(s.t>25)return .4;},
    draw(x,s,t){const K=CK.K;if(K.vessel!=='plate'){drawFlame(x,K.flame*.5,t);}x.drawImage(s.v.img,VX,VY);if(K.vessel==='plate'){x.drawImage(bigFishFor(),78,58,64,26);}else{drawLiquid(x,s.v,K.level,brothCol(),t,.3);drawPieces(x,s.v,K.level,t,0);}
      const X=Math.round(s.sx);if(s.c.cond==='ganjang'){P(x,'#3d2c2e',X-4,8,9,22);P(x,'#5a3a2a',X-3,9,7,20);P(x,'#f3e6cf',X-3,16,7,6);}else{P(x,'#3d2c2e',X-5,8,11,20);P(x,'#f3e6cf',X-4,9,9,18);P(x,'#a69e93',X-4,9,9,4);}
      if(s.taste>0){const sp=surf(s.v,K.level);const a=1-s.taste/.9;fe(x,sp.x+a*40,sp.y-a*40,4,2,RAMP.wood[3]);}}},
  grill:{help:()=>'아랫면이 노릇해지면(게이지 황금색) 눌러서 뒤집어요. 앞뒤 두 번.',
    init(s,c){s.side=0;s.d=0;s.res=[];s.flip=0;},
    update(s,dt,I){if(s.flip>0)s.flip-=dt;else s.d+=dt*(.22+(s.side?.04:0));if(Math.random()<dt*5)sfx('sizzle');
      if(s.d>.9&&Math.random()<dt*10)part2(110+(Math.random()-.5)*50,70,'rgba(80,70,70,.45)',0,2);
      if((I.pressed&&s.flip<=0)||s.d>1.35){const sc=clamp(1-Math.abs(s.d-.72)/.34,0,1);s.res.push(sc);sfx('flip');s.flip=.35;s.d=0;s.side++;msg(sc>.8?'노릇노릇!':sc>.4?'괜찮아요':'아쉬워요');if(s.side>=2)return(s.res[0]+s.res[1])/2;}},
    draw(x,s,t){for(let i=0;i<16;i++){const g=.5+Math.sin(t*3+i)*.5;P(x,g>.5?'#e2873f':'#c4614f',44+i*8,104,6,4);}P(x,'#3d2c2e',40,70,140,32);P(x,'#2b2526',42,72,136,28);for(let i=0;i<16;i++)P(x,'#6a6c70',44+i*8.4|0,72,2,28);
      const fy=74+(s.flip>0?-Math.sin((1-s.flip/.35)*Math.PI)*18:0);const f2=mk(64,26,c=>{c.drawImage(bigFishFor(),0,0);c.globalCompositeOperation='source-atop';const d=s.d+(s.side?.0:0);
        c.fillStyle=d<.5?`rgba(205,200,210,${.3-d*.4})`:d<.95?`rgba(200,130,55,${(d-.5)})`:`rgba(55,35,28,${Math.min(.8,(d-.95)*2+.35)})`;c.fillRect(0,0,64,26);if(d>.45){c.fillStyle=`rgba(60,34,22,${Math.min(.6,(d-.45)*1.6)})`;for(let k=0;k<5;k++)c.fillRect(14+k*8,3,2,20);}});
      x.save();if(s.side%2){x.translate(CKW,0);x.scale(-1,1);}x.drawImage(f2,78,fy);x.restore();steam(x,110,64,clamp(s.d,0,1),t);
      const grad=[[0,'#c9c4cc'],[.55,'#d9a35a'],[.95,'#b06a2c'],[1.2,'#4a342a']];P(x,'#3d2c2e',29,113,162,9);for(let i=0;i<160;i++){const v=i/160*1.3;let cc='#c9c4cc';for(const[a,c2]of grad)if(v>=a)cc=c2;P(x,cc,30,114,1,7);x.fillStyle=cc;x.fillRect(30+i,114,1,7);}
      P(x,'#3d2c2e',30+Math.round(160*Math.min(1.3,s.d)/1.3)-1,110,2,15);}},
  bake:{help:()=>'오븐 창을 보다가 시트가 부풀고 노릇해지면 눌러서 꺼내요.',
    init(s){s.d=0;},update(s,dt,I){s.d+=dt*.16;if(I.pressed)return clamp(1-Math.abs(s.d-.72)/.3,0,1);if(s.d>1.3){msg('탔어요…');return .1;}},
    draw(x,s,t){P(x,'#3d2c2e',50,20,120,96);P(x,'#cdc5b8',52,22,116,92);P(x,'#3d2c2e',62,32,96,60);const g=x.createRadialGradient(110,62,4,110,62,60);g.addColorStop(0,'rgba(255,170,80,.9)');g.addColorStop(1,'rgba(150,60,20,.9)');x.fillStyle=g;x.fillRect(64,34,92,56);
      const h=8+Math.min(1,s.d*1.4)*12;const col=s.d<.5?'#f3dcab':s.d<.9?mix('#f3dcab','#c48a48',(s.d-.5)/.4):mix('#c48a48','#4a342a',Math.min(1,(s.d-.9)*2.5));P(x,'#7a868b',76,82,68,4);fe(x,110,82-h/2,30,h/2+2,col);P(x,mix(col,'#fff',.25),88,82-h,30,2);
      for(let i=0;i<4;i++)P(x,'#f6d58a',70+i*24,88,16,1);P(x,'#86a35a',56,104,8,4);}},
  steam:{help:c=>c.what||'뚜껑을 덮고 뜸을 들여요. 시계가 초록 칸에 오면 눌러서 열어요.',
    init(s){s.v=vesselArt(CK.K.vessel||'ricepot');s.d=0;CK.K.flame=.2;},update(s,dt,I){s.d+=dt*.13;if(I.pressed)return clamp(1-Math.abs(s.d-.75)/.25,0,1);if(s.d>1.25){msg('눌어붙었어요…');return .3;}},
    draw(x,s,t){drawFlame(x,CK.K.flame,t);x.drawImage(s.v.img,VX,VY);fe(x,s.v.ix,s.v.iy-3,s.v.irx+3,s.v.iry+2,'#4f3e37');fe(x,s.v.ix,s.v.iy-4,s.v.irx,s.v.iry,'#634e44');P(x,'#7a6254',s.v.ix-4,s.v.iy-8,8,3);steam(x,110,VY+6,.9,t);
      const cx=192,cy=50,r=16;fe(x,cx,cy,r+1,r+1,'#3d2c2e');fe(x,cx,cy,r,r,'#f3e6cf');x.fillStyle='#9fc07a';x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,r,-Math.PI/2+.5*Math.PI*2,-Math.PI/2+1*Math.PI*2);x.fill();
      x.strokeStyle='#3d2c2e';x.beginPath();x.moveTo(cx,cy);const a=-Math.PI/2+Math.min(1.3,s.d)/1*Math.PI*2*.75;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.stroke();}},
  ricewash:{help:()=>'톡톡 눌러 쌀을 박박 씻고, 꾹 눌러 뿌연 물을 따라 버려요. 쌀은 흘리지 않게! (세 번)',
    init(s){s.round=0;s.ph='wash';s.n=0;s.cloud=0;s.lvl=.7;s.tilt=0;s.spill=0;CK.K.vessel='bowl';s.v=vesselArt('bowl');},
    update(s,dt,I){if(s.ph==='wash'){if(I.pressed){s.n++;s.cloud=Math.min(1,s.cloud+.12*(1-s.round*.3));sfx('water');}if(s.n>=6){s.ph='drain';}}
      else if(s.ph==='drain'){if(I.down){s.tilt=Math.min(1,s.tilt+dt*1.5);s.lvl-=dt*.35*s.tilt;}else s.tilt=Math.max(0,s.tilt-dt*3);
        if(s.lvl<.12&&I.down){s.spill+=dt;if(Math.random()<dt*8)part2(150,80,'#f7f3e9',1);}
        if(!I.down&&s.lvl<.25){s.round++;if(s.round>=3)return clamp(1-s.spill*.6,.3,1);s.ph='wash';s.n=0;s.lvl=.7;s.cloud=0;msg(`${s.round+1}번째 물`);}}},
    draw(x,s,t){x.save();x.translate(110,80);x.rotate(s.tilt*.35);x.translate(-110,-80);x.drawImage(s.v.img,VX,VY);const sp=surf(s.v,s.lvl);fe(x,sp.x,sp.y+3,sp.rx*.8,sp.ry*.7,'#f1ece0');for(let i=0;i<40;i++)P(x,'#fffdf7',Math.round(sp.x-sp.rx*.7+hash(i,2)*sp.rx*1.4),Math.round(sp.y+hash(i,3)*sp.ry),1,1);
      x.fillStyle=`rgba(${Math.round(220+s.cloud*20)},${Math.round(230+s.cloud*10)},230,${.45+s.cloud*.45})`;x.beginPath();x.ellipse(sp.x,sp.y,sp.rx,sp.ry,0,0,7);x.fill();x.restore();
      if(s.tilt>.3&&s.lvl>.1)for(let y=82;y<112;y+=2)P(x,'rgba(220,230,228,.8)',150+Math.round(Math.sin(y)*1),y,2,2);P(x,'#3d2c2e',150,112,20,4);}},
  crack:{help:()=>'달걀이 그릇 가장자리에 닿는 순간 눌러서 톡 깨요. (두 개)',
    init(s){s.v=vesselArt('bowl');CK.K.vessel='bowl';CK.K.pieces=[];CK.K.level=0;s.n=0;s.res=[];s.ey=0;s.cool=0;},
    update(s,dt,I){s.ey=(Math.sin(s.t*3.2)*.5+.5);if(s.cool>0){s.cool-=dt;return;}
      if(I.pressed){const d=Math.abs(s.ey-.85);let sc=d<.08?1:d<.18?.6:.2;if(s.ey<.6){msg('헛손질!');sfx('chopbad');s.res.push(.4);}else{sfx('chop');s.res.push(sc);msg(sc>.9?'톡!':sc>.5?'괜찮아요':'껍데기가 들어갔어요');addPieces('yolk',1);if(sc<.5)for(let i=0;i<3;i++)CK.K.pieces.push({k:'radish',u:Math.random()-.5,v:Math.random()-.5});}
        s.n++;s.cool=.5;if(s.n>=2)return(s.res[0]+s.res[1])/2;}},
    draw(x,s,t){x.drawImage(s.v.img,VX,VY);drawPieces(x,s.v,.3,t,0);const ex=128,ey=24+s.ey*40;fe(x,ex,ey,6,8,'#3d2c2e');fe(x,ex,ey,5,7,'#f6efe2');P(x,'#fff',ex-3,ey-4,2,2);P(x,'#c4614f',ex-2,ey+18-0,0,0);
      P(x,'rgba(196,97,79,.6)',134,VY+20,10,2);}},
  fold:{help:()=>'달걀 가장자리가 익어 단단해지면(초록 칸) 눌러서 밥을 감싸요. 너무 오래 두면 갈색이 돼요.',
    init(s){s.v=vesselArt('pan');CK.K.vessel='pan';CK.K.flame=.6;s.d=0;},update(s,dt,I){s.d+=dt*.18;if(Math.random()<dt*3)sfx('sizzle');if(I.pressed){s.folded=1;return clamp(1-Math.abs(s.d-.68)/.3,0,1);}if(s.d>1.3)return .2;},
    draw(x,s,t){drawFlame(x,CK.K.flame,t);x.drawImage(s.v.img,VX,VY);const sp=surf(s.v,.2);const col=s.d<.55?mix('#f6dc7a','#f2cf5a',s.d):s.d<.9?'#efc54e':mix('#efc54e','#a8692c',Math.min(1,(s.d-.9)*2.5));
      fe(x,sp.x,sp.y,sp.rx*.85,sp.ry*.85,col);fe(x,sp.x,sp.y,sp.rx*.45,sp.ry*.4,'#d8573f');for(let i=0;i<12;i++)P(x,'#f3eddc',Math.round(sp.x-8+hash(i,1)*16),Math.round(sp.y-4+hash(i,2)*8),1,1);
      if(s.d>.4)x.strokeStyle=`rgba(255,240,200,${Math.min(1,s.d)})`,x.beginPath(),x.ellipse(sp.x,sp.y,sp.rx*.85,sp.ry*.85,0,0,7),x.stroke();gaugeV(x,196,22,76,s.d,.53,.3,['','','']);}},
  ladle:{help:()=>'꾹 누르는 동안 국자로 그릇에 떠 담아요. 그릇의 70~85%쯤에서 떼요.',
    init(s){s.src=vesselArt(CK.K.vessel||'pot');s.v=vesselArt('bowlw');s.lvl=0;s.idle=0;s.pc=[];},
    update(s,dt,I){if(I.down){s.lvl+=dt*.3;s.idle=0;if(Math.random()<dt*5){sfx('bubble');if(CK.K.pieces.length&&s.pc.length<8)s.pc.push(CK.K.pieces[s.pc.length%CK.K.pieces.length]);}}else s.idle+=dt;
      if(s.lvl>1){msg('넘쳤어요');return .3;}if(s.idle>1&&s.lvl>.1)return clamp(1-Math.max(0,Math.abs(s.lvl-.78)-.07)*5,0,1);},
    draw(x,s,t){x.save();x.translate(-62,6);x.scale(1,1);x.drawImage(s.src.img,VX,VY);drawLiquid(x,s.src,CK.K.level,brothCol(),t,.3);x.restore();
      x.drawImage(s.v.img,VX+46,VY+4);const v={ix:s.v.ix+46,iy:s.v.iy+4,irx:s.v.irx,iry:s.v.iry,dep:s.v.dep};drawLiquid(x,v,s.lvl,brothCol(),t,0);
      const sp=surf(v,s.lvl);s.pc.forEach((p,i)=>{if(i<s.lvl*10)x.drawImage(PIECE[p.k],Math.round(sp.x+p.u*sp.rx*.6-4),Math.round(sp.y+p.v*sp.ry*.5-5));});steam(x,v.ix,v.iy-6,.6,t);
      const ts=surf(v,.78);P(x,'#c4614f',Math.round(ts.x+ts.rx)+1,Math.round(ts.y)-1,4,2);fe(x,120,40,6,3,'#a69e93');line(x,124,40,150,14,'#87603f');}},
  plate:{help:()=>'접시가 가운데 올 때 눌러서 올려요.',
    init(s){s.px=50;s.pv=60;s.drop=null;s.res=null;s.v=vesselArt(CK.K.final||'plate');},
    update(s,dt,I){if(!s.drop){s.px+=s.pv*dt;if(s.px>170){s.px=170;s.pv=-Math.abs(s.pv);}if(s.px<50){s.px=50;s.pv=Math.abs(s.pv);}if(I.pressed){s.drop={y:24,vy:0};sfx('drop');}}
      else{s.drop.vy+=300*dt;s.drop.y+=s.drop.vy*dt;if(s.drop.y>=72&&s.res===null){s.res=clamp(1-Math.abs(s.px-110)/30,0,1);s.lx=s.px;return s.res;}}},
    draw(x,s,t){if(s.res===null)x.drawImage(s.v.img,Math.round(s.px-50),VY+10);if(s.res!==null)x.drawImage(DISHART[CK.dish],Math.round(s.lx-32),VY+16);else{const it=plateItem();x.drawImage(it,110-it.width/2,s.drop?s.drop.y-it.height/2:12);}}},
  garnish:{help:c=>c.g==='heart'?'꾹 누르고 있는 동안 케첩으로 하트를 그려요. 다 그리면 떼요.':'통이 가운데 올 때 눌러서 톡톡 세 번 뿌려요.',
    init(s,c){s.n=0;s.dots=[];s.p=0;s.sx=110;},
    update(s,dt,I){if(s.c.g==='heart'){if(I.down)s.p+=dt*.45;if(I.released&&s.p>0)return clamp(s.p>1.12?.4:s.p,0,1);if(s.p>1.4)return .3;return;}
      s.sx=110+Math.sin(s.t*2.2)*40;if(I.pressed){s.n++;sfx('shake');s.dots.push(s.sx);for(let i=0;i<6;i++)part2(s.sx,30,garnCol(s.c.g),0,1,45);if(s.n>=3)return clamp(1-s.dots.reduce((a,d)=>a+Math.abs(d-110),0)/3/40,0,1);}},
    draw(x,s,t){x.drawImage(DISHART[CK.dish],78,VY+14);if(s.c.g==='heart'){const n=Math.floor(Math.min(1.15,s.p)*60);for(let i=0;i<n;i++){const a=i/60*Math.PI*2;const hx=16*Math.pow(Math.sin(a),3),hy=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a));P(x,'#c4362e',Math.round(110+hx*.45),Math.round(VY+34+hy*.45),2,2);}
      const a=Math.min(1.15,s.p)*Math.PI*2;P(x,'#c4362e',Math.round(110+16*Math.pow(Math.sin(a),3)*.45)-2,Math.round(VY+34-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.45)-14,5,12);}
      else{for(const d of s.dots)for(let i=0;i<5;i++)P(x,garnCol(s.c.g),Math.round(d-6+hash(i,d)*12),VY+28+Math.round(hash(d,i)*8),2,1);const X=Math.round(s.sx);P(x,'#3d2c2e',X-5,10,11,18);P(x,'#f3e6cf',X-4,11,9,16);}}},
  layer:{help:()=>'시트 → 크림 → 딸기 순서로 차곡차곡 쌓아요.',
    init(s,c){s.stack=[];s.i=0;s.miss=0;const names={sheet:'시트',cream:'생크림',berry:'딸기'};showChoices(['sheet','cream','berry'],k=>{if(k===c.order[s.i]){s.stack.push(k);s.i++;sfx('drop');if(s.i>=c.order.length){s.fin=1;hideChoices();}}else{s.miss++;sfx('bad');msg('순서가 틀렸어요');}},names);},
    update(s){if(s.fin)return clamp(1-s.miss*.2,.2,1);},
    draw(x,s,t){const pv=vesselArt('plate');x.drawImage(pv.img,VX,VY+12);let y=VY+44;for(const k of s.stack){const h=k==='sheet'?7:k==='cream'?3:4;y-=h;if(k==='sheet'){P(x,'#c99a58',84,y,52,h);P(x,'#e9c78c',84,y,52,h-2);}else if(k==='cream')P(x,'#fbf6ec',84,y,52,h);else for(let i=0;i<6;i++){fe(x,88+i*9,y+2,3.4,2.4,'#c4503f');P(x,'#f4d6c8',87+i*9,y+1,2,1);}}}},
  skewer:{help:()=>'꼬치가 생선 입 높이에 맞을 때 눌러서 꿰요.',
    init(s){s.y=0;s.tries=0;},update(s,dt,I){s.y=Math.sin(s.t*2.6)*16;if(I.pressed){s.tries++;const d=Math.abs(s.y);if(d<4){sfx('chop');s.ok=1;return clamp(1-(s.tries-1)*.25,.3,1);}sfx('chopbad');msg('빗나갔어요');if(s.tries>=4)return .3;}},
    draw(x,s,t){P(x,RAMP.wood[1],30,66,160,46);P(x,'#d9b98a',31,66,158,43);x.drawImage(bigFishFor(),70,70,80,32);line(x,30,86+s.y,66,86+s.y,'#c5a382');line(x,30,87+s.y,66,87+s.y,'#9a7356');}},
};
function garnCol(g){return{onion:'#77a052',sesame:'#fbf5ea',cream:'#fbf6ec',parsley:'#5d8546'}[g]||'#77a052';}
function brothCol(){const K=CK.K;let c=LIQ[K.liquid]||LIQ.water;if(K.paste)c=mix(LIQ.water,K.pasteCol||LIQ.miso,K.paste);if(K.liquid==='red')c=LIQ.red;return c;}
function bigFishFor(){const sp={grill:'f_crucian',ayu:'f_sweet',goldfish:'f_gold',maeun:'f_catfish'}[CK.dish]||'f_crucian';return bigFish(sp);}
const bigFishCache={};function bigFish(sp){return bigFishCache[sp]||(bigFishCache[sp]=fishArt(64,26,FISHRAMP[sp][0],FISHRAMP[sp][1]));}
function plateItem(){const d=CK.dish;if(d==='grill'||d==='ayu'||d==='goldfish')return bigFishFor();return mk(40,20,x=>{CK.K.pieces.slice(0,12).forEach((p,i)=>x.drawImage(PIECE[p.k],4+(i%6)*5,4+Math.floor(i/6)*5));if(d==='omurice')fe(x,20,10,16,8,'#efc54e');});}
function part2(x,y,c,small,r,vy){CK.parts.push({x,y,vx:(Math.random()-.5)*40,vy:vy!=null?vy+Math.random()*20:-30-Math.random()*20,g:160,life:.5,c,r:r||(small?1:2)});}
function bar(x,bx,by,bw,v,c){P(x,'#3d2c2e',bx-1,by-1,bw+2,7);P(x,'#ece0c6',bx,by,bw,5);P(x,c,bx,by,Math.round(bw*clamp(v,0,1)),5);}
function gaugeV(x,gx,gy,gh,v,z,zw){P(x,'#3d2c2e',gx-1,gy-1,10,gh+2);P(x,'#ece0c6',gx,gy,8,gh);P(x,'#9fc07a',gx,gy+Math.round(gh*(1-z-zw)),8,Math.round(gh*zw));const ny=gy+Math.round(gh*(1-clamp(v,0,1)));P(x,'#3d2c2e',gx-4,ny-1,16,3);P(x,'#fbf5ea',gx-3,ny,14,1);}
function msg(t){$('cookmsg').textContent=t;CK.msgClear=1.1;}
let choiceCb=null;
function showChoices(keys,cb,names){choiceCb=cb;const el=$('cookopts');el.hidden=false;el.innerHTML=keys.map((k,i)=>`<button type="button" data-ch="${k}"><span class="kn">${i+1}</span>${PIECE[k]||IC[k]?`<img class="px" src="${curl(IC[k]||PIECE[k])}" alt="">`:''}${names?names[k]:nameOf(k)}</button>`).join('');
  el.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{if(choiceCb)choiceCb(b.dataset.ch);});}
function hideChoices(){choiceCb=null;$('cookopts').hidden=true;$('cookopts').innerHTML='';}
addEventListener('keydown',e=>{if(!CK.on||!choiceCb)return;const n=+e.key;if(n>=1&&n<=4){const b=$('cookopts').querySelectorAll('[data-ch]')[n-1];if(b)b.click();}});

// ---------------- 흐름 ----------------
function startCook(dk,ingQ,done){
  if(!PIECE.radish)buildPieces();const d=DISHES[dk];
  Object.assign(CK,{on:true,dish:dk,steps:d.steps,si:0,scores:[],ingQ,done,phase:'step',parts:[],msgT:0,pendingAdd:[],
    K:{vessel:d.steps.find(s=>s.vessel)?.vessel||'pot',level:0,liquid:'water',temp:0,flame:0,flameV:0,foam:0,paste:0,pasteCol:d.paste||LIQ.miso,pieces:[],final:d.final||'plate'}});
  $('cook').hidden=false;$('cookrev').hidden=true;hideChoices();$('cookname').textContent=d.n;beginStep();
}
function beginStep(){
  const c=CK.steps[CK.si];CK.phase='step';$('cookmsg').textContent='';
  $('cookstep').textContent=`${CK.si+1}/${CK.steps.length} · ${c.txt}`;$('cookhelp').textContent=STEP[c.t].help(c);
  // 썰어 둔 재료는 다음 조리 단계에서 냄비/팬으로 들어간다
  if(c.t!=='chop'&&CK.pendingAdd.length&&['boil','stirfry','pour','stir'].includes(c.t)){for(const k of CK.pendingAdd)addPieces(k,k==='onion'?4:6);CK.pendingAdd=[];}
  const s={c,t:0,seed:CK.si*17+3};STEP[c.t].init(s,c);CK.st=s;
}
function stepDone(score){CK.scores.push(clamp(score,0,1));CK.phase='msg';CK.msgT=.9;hideChoices();
  if(!$('cookmsg').textContent||CK.msgClear<=0)$('cookmsg').textContent=score>.85?'완벽해요!':score>.6?'좋아요!':score>.3?'괜찮아요':'아쉬워요…';
  const c=CK.steps[CK.si];if(c.t==='chop'&&!c.keep&&!CK.steps.some(q=>q.t==='add'))CK.pendingAdd.push(c.ing);sfx(score>.6?'good':'pick');}
function cookUpdate(dt,inp){
  if(!CK.on)return;for(const p of CK.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g||0)*dt;p.life-=dt;}CK.parts=CK.parts.filter(p=>p.life>0);
  if(CK.msgClear>0){CK.msgClear-=dt;if(CK.msgClear<=0&&CK.phase==='step')$('cookmsg').textContent='';}
  if(CK.phase==='msg'){CK.msgT-=dt;const K=CK.K;K.temp=Math.max(0,K.temp-dt*.05);if(CK.msgT<=0){CK.si++;if(CK.si>=CK.steps.length)toReveal();else beginStep();}return;}
  if(CK.phase==='reveal'){CK.revealT+=dt;if(inp.pressed&&CK.revealT>.6)finishCook();return;}
  const s=CK.st;s.t+=dt;const r=STEP[s.c.t].update(s,dt,inp);if(r!==undefined)stepDone(r);
}
function toReveal(){const cook=CK.scores.reduce((a,b)=>a+b,0)/CK.scores.length,ing=(CK.ingQ-1)/2;const tot=cook*.72+ing*.28;
  CK.stars=tot>=.78?3:tot>=.5?2:1;CK.phase='reveal';CK.revealT=0;sfx('reveal');hideChoices();
  $('cookrev').hidden=false;$('revname').textContent=DISHES[CK.dish].n;$('revstars').innerHTML=stars(CK.stars);$('cookstep').textContent='완성';
  $('revcom').textContent=['','먹을 만해요. 다음엔 더 잘할 수 있어요.','맛있다! 솜씨가 좋아요.','한 입 먹자마자 눈이 감기는 맛!'][CK.stars];$('cookhelp').textContent='';$('cookmsg').textContent='';}
function finishCook(){CK.on=false;$('cook').hidden=true;S.stats.cook++;const k=CK.dish;S.dishLog[k]=Math.max(S.dishLog[k]||0,CK.stars);const d=CK.done;CK.done=null;if(d)d(k,CK.stars);}
function cookRender(t){
  if(!CK.on)return;const x=cx2;x.imageSmoothingEnabled=false;x.drawImage(cookBg(),0,0);
  if(CK.phase==='reveal'){drawReveal(t);return;}
  STEP[CK.st.c.t].draw(x,CK.st,t);
  for(const p of CK.parts){x.fillStyle=p.c;x.globalAlpha=clamp(p.life*2,0,1);x.fillRect(Math.round(p.x),Math.round(p.y),p.r||1,p.r||1);}x.globalAlpha=1;
}
function drawReveal(t){const x=cx2;x.fillStyle='rgba(61,44,46,.55)';x.fillRect(0,0,CKW,CKH);
  const g=x.createRadialGradient(110,62,4,110,62,86);g.addColorStop(0,'rgba(255,226,170,.55)');g.addColorStop(1,'rgba(255,226,170,0)');x.fillStyle=g;x.fillRect(0,0,CKW,CKH);
  const k=Math.min(1,CK.revealT*3);x.save();x.translate(110,62);x.scale(2*(.8+.2*k),2*(.8+.2*k));x.drawImage(DISHART[CK.dish],-32,-24);x.restore();steam(x,110,40,.8,t);
  if(CK.stars===3)for(let i=0;i<6;i++){const a=t*1.5+i,r=48+Math.sin(t*3+i)*4;const X=110+Math.cos(a)*r*1.3,Y=60+Math.sin(a)*r*.7;P(x,'#fff6c8',Math.round(X),Math.round(Y)-1,1,3);P(x,'#fff6c8',Math.round(X)-1,Math.round(Y),3,1);}}
