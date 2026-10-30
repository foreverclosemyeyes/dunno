'use strict';
// =====================================================================
//  지도 — 바깥(호숫가 마을)과 식당 안
// =====================================================================
const GR=0,PA=1,SA=2,WA=3,PL=4,FL=5,WL=6,DR=7;
function newMap(id,w,h){return{id,w,h,ground:new Uint8Array(w*h),field:new Uint8Array(w*h),objs:[],ogrid:new Array(w*h).fill(null),
  ix(x,y){return y*this.w+x;},inb(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h;},g(x,y){return this.inb(x,y)?this.ground[y*this.w+x]:-1;}};}
function addObj(m,t,x,y,w=1,h=1,solid=true,v={}){
  for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(!m.inb(i,j)||m.ogrid[m.ix(i,j)])return null;
  const o={t,x,y,w,h,solid,v};m.objs.push(o);for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)m.ogrid[m.ix(i,j)]=o;return o;
}
function removeObj(m,o){const k=m.objs.indexOf(o);if(k>=0)m.objs.splice(k,1);for(let j=o.y;j<o.y+o.h;j++)for(let i=o.x;i<o.x+o.w;i++)if(m.ogrid[m.ix(i,j)]===o)m.ogrid[m.ix(i,j)]=null;}

const LANTERN_POS=[[6,13],[11,10],[15,13],[16,18],[25,10],[24,13],[28,9],[32,5]];
const DINER_DOOR=[7,6];
let OUT,INN;
function genOutside(){
  const W=50,H=36,m=newMap('out',W,H);const set=(x,y,g)=>{if(m.inb(x,y))m.ground[m.ix(x,y)]=g;};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=(x-25)/6.3,dy=(y-19.5)/4.4,d=dx*dx+dy*dy+(hash(x,y,7)-.5)*.25;if(d<1)set(x,y,WA);else if(d<1.55)set(x,y,SA);}
  for(let y=0;y<=16;y++){set(29,y,WA);set(30,y,WA);for(const sx of[28,31])if(m.g(sx,y)!==WA)set(sx,y,SA);}
  const path=(x0,y0,x1,y1)=>{for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)if(m.g(x,y)!==WA)set(x,y,PA);};
  path(7,7,7,12);path(2,12,27,12);path(8,7,12,7);path(18,11,18,12);path(17,12,17,19);path(31,4,31,12);path(28,8,28,8);path(27,12,28,12);path(28,9,28,12);path(12,13,12,30);path(12,30,40,30);path(40,8,40,30);path(31,8,40,8);path(40,6,43,6);
  for(let x=18;x<=23;x++)set(x,19,PL);set(29,8,PL);set(30,8,PL);
  for(let y=4;y<=10;y++)for(let x=13;x<=23;x++)m.field[m.ix(x,y)]=1;
  addObj(m,'diner',4,3,6,4);
  for(let x=12;x<=24;x++){addObj(m,'wall',x,3);if(x!==18)addObj(m,'wall',x,11);}
  for(let y=4;y<=10;y++){if(y!==7)addObj(m,'wall',12,y);addObj(m,'wall',24,y);}
  LANTERN_POS.forEach(([x,y],i)=>addObj(m,'lantern',x,y,1,1,true,{i}));
  addObj(m,'well',25,7);addObj(m,'board',10,9);addObj(m,'cairn',44,5);addObj(m,'crates',10,5,2,1);addObj(m,'sign',8,8);addObj(m,'bench',13,13,2,1);addObj(m,'bench',20,16,2,1);
  addObj(m,'tree',32,9,1,1,true,{kind:'persimmon',seed:2});addObj(m,'tree',3,9,1,1,true,{kind:'persimmon',seed:4});
  addObj(m,'tree',26,4,1,1,true,{kind:'blossom',seed:1});addObj(m,'tree',10,15,1,1,true,{kind:'blossom',seed:3});addObj(m,'tree',21,14,1,1,true,{kind:'maple',seed:5});
  const nearPath=(x,y)=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([i,j])=>{const g=m.g(x+i,y+j);return g===PA||g===PL;});
  m.mushSpots=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=m.ix(x,y);if(m.ground[i]!==GR&&m.ground[i]!==SA)continue;if(m.ogrid[i]||m.field[i])continue;
    const border=x<2||x>=W-2||y<2||y>=H-2,r=hash(x,y,3),r2=hash(x,y,9);
    const kinds=r2<.45?'oak':r2<.6?'pine':r2<.74?'maple':r2<.88?'blossom':'persimmon';
    if(border){if(m.ground[i]===GR||r<.5)addObj(m,'tree',x,y,1,1,true,{kind:kinds,seed:(r2*5)|0});continue;}
    if(m.ground[i]===SA||nearPath(x,y))continue;
    if(x>=2&&x<=11&&y>=7&&y<=11)continue;
    const forest=y>=14&&x<=15&&y<26,east=x>=25&&y<=10&&x<=27,grove=x>=32,south=y>=26,clear=x>=36&&x<=46&&y>=3&&y<=11;
    let pt=.03,pb=.03,pr=.02;if(forest){pt=.28;pb=.07;pr=.03;}if(east){pt=.25;}if(grove){pt=.24;pb=.05;}if(south){pt=.1;pb=.05;pr=.03;}if(clear){pt=.06;}
    if(r<pt)addObj(m,'tree',x,y,1,1,true,{kind:forest&&r2<.7?'oak':kinds,seed:(r2*5)|0});
    else if(r<pt+pb)addObj(m,'bush',x,y,1,1,true,{seed:(r2*6)|0,flower:r2>.6?(r2>.8?'#f1bbb1':'#f3e6cf'):null});
    else if(r<pt+pb+pr)addObj(m,'rock',x,y,1,1,true,{seed:(r2*4)|0});
  }
  for(let y=13;y<26;y++)for(let x=2;x<16;x++){const i=m.ix(x,y);if(m.ground[i]!==GR||m.ogrid[i])continue;
    if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const o=m.inb(x+a,y+b)&&m.ogrid[m.ix(x+a,y+b)];return o&&o.t==='tree';}))m.mushSpots.push([x,y]);}
  m.bake=bakeOutside(m);
  m.shore=[];m.sparkles=[];
  for(let y=0;y<m.bakeT.h;y++)for(let x=0;x<m.bakeT.w;x++){const k=y*m.bakeT.w+x;if(m.bakeT.t[k]!==WA)continue;
    if(m.bakeT.dist[k]===1)m.shore.push(x,y);else if(hash(x,y,44)<.012)m.sparkles.push(x,y);}
  return m;
}
const GRASS=['#4b5d40','#5a6f4b','#6b8257','#7d9563','#90a771','#a6b885'];
const DIRT=['#86644d','#9b775b','#b08a6b','#c19d7c','#d0b08f'];
const SANDC=['#bfa880','#cfba93','#ddcba7','#e8dabb'];
const WATERC=['#b7d1c3','#9cc0b4','#82aca4','#6e9898','#5f8689','#53767c'];
function bakeOutside(m){
  const cw=m.w*T,chh=m.h*T,t=new Uint8Array(cw*chh);
  for(let py=0;py<chh;py++)for(let px=0;px<cw;px++){
    const wx=px+(vnoise(px*.11,py*.11,1)-.5)*8,wy=py+(vnoise(px*.11,py*.11,2)-.5)*8;
    const tx=clamp(Math.floor(wx/T),0,m.w-1),ty=clamp(Math.floor(wy/T),0,m.h-1);let g=m.ground[m.ix(tx,ty)];
    const raw=m.ground[m.ix(Math.floor(px/T),Math.floor(py/T))];if(raw===PL)g=WA;if(g===PL)g=WA;
    t[py*cw+px]=g;
  }
  // 물가로부터 거리 (BFS)
  const dist=new Int16Array(cw*chh).fill(-1),q=new Int32Array(cw*chh);let qh=0,qt=0;
  for(let k=0;k<t.length;k++)if(t[k]!==WA){dist[k]=0;q[qt++]=k;}
  while(qh<qt){const k=q[qh++],x=k%cw,y=(k/cw)|0;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+a,ny=y+b;if(nx<0||ny<0||nx>=cw||ny>=chh)continue;const n=ny*cw+nx;if(dist[n]<0){dist[n]=dist[k]+1;q[qt++]=n;}}}
  m.bakeT={t,dist,w:cw,h:chh};
  const c=mk(cw,chh),x=c.getContext('2d'),img=x.createImageData(cw,chh),d=img.data;
  const put=(k,hx)=>{const v=rgb(hx);d[k*4]=v[0];d[k*4+1]=v[1];d[k*4+2]=v[2];d[k*4+3]=255;};
  const near=(px,py,r,ty)=>{for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const X=px+i,Y=py+j;if(X<0||Y<0||X>=cw||Y>=chh)continue;if(t[Y*cw+X]===ty)return true;}return false;};
  for(let py=0;py<chh;py++)for(let px=0;px<cw;px++){const k=py*cw+px,g=t[k],b=BAYER[(py&3)*4+(px&3)]-.5;
    if(g===GR){const tone=fbm(px/46,py/46,3);const det=vnoise(px*.45,py*.45,5);let i=2+(tone-.5)*3.2+(det-.5)*1.3+b*.6;if(near(px,py,1,PA)||near(px,py,1,SA))i-=.8;put(k,GRASS[clamp(Math.round(i),0,5)]);}
    else if(g===PA){const det=vnoise(px*.3,py*.3,6);let i=2.2+(det-.5)*1.6+b*.5;if(near(px,py,2,GR))i-=1;if(hash(px,py,8)<.02)i+=1.5;put(k,DIRT[clamp(Math.round(i),0,4)]);}
    else if(g===SA){let i=2+(vnoise(px*.35,py*.35,7)-.5)*1.4+b*.4;if(near(px,py,2,WA))i=0;else if(near(px,py,1,GR))i-=1;put(k,SANDC[clamp(Math.round(i),0,3)]);}
    else if(g===WA){const dd=dist[k];let i=dd<2?0:dd<5?1:dd<10?2:dd<17?3:dd<28?4:5;if(dd>=2&&b>.3&&i>1&&hash(px,py,2)<.4)i--;put(k,WATERC[i]);}
  }
  x.putImageData(img,0,0);
  // 풀포기 + 들꽃
  const r=rng(77);const FL=['#efe3cf','#f1bbb1','#c9b6d6','#f2d58d'];
  for(let n=0;n<1600;n++){const px=r()*cw|0,py=r()*chh|0;if(t[py*cw+px]!==GR)continue;const tx=(px/T)|0,ty=(py/T)|0;if(m.field[m.ix(tx,ty)])continue;
    if(r()<.12){if(m.ogrid[m.ix(tx,ty)])continue;const fc=FL[r()*4|0];P(x,'#5a6f4b',px,py+1,1,2);P(x,fc,px-1,py);P(x,fc,px+1,py);P(x,fc,px,py-1);P(x,'#e7c26c',px,py);}
    else{P(x,GRASS[1],px,py);P(x,GRASS[1],px+2,py);P(x,GRASS[4],px,py-1);P(x,GRASS[4],px+2,py-1);P(x,GRASS[2],px+1,py+1);}}
  return c;
}
function genInside(){
  const W=11,H=9,m=newMap('in',W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)m.ground[m.ix(x,y)]=y<2||y===8?WL:FL;
  m.ground[m.ix(5,8)]=DR;
  addObj(m,'stove',1,2,2,1);addObj(m,'ledger',4,2);addObj(m,'ladder',9,2);addObj(m,'counter',0,4,8,1);
  for(const x of[1,3,5])addObj(m,'stool',x,5,1,1,true,{seat:x});
  addObj(m,'table',8,6,2,1);addObj(m,'plant',0,7,1,1,true,{seed:1});addObj(m,'plant',10,7,1,1,true,{seed:2});addObj(m,'plant',10,2,1,1,true,{seed:3});
  m.bake=bakeInside(m);
  return m;
}
function bakeInside(m){
  const cw=m.w*T,chh=m.h*T;return mk(cw,chh,x=>{
    // 바닥: 가로 널
    const r=rng(5);
    for(let row=0;row*8<chh;row++){let px=-(r()*30|0);while(px<cw){const len=24+(r()*28|0),tone=r();
      for(let i=0;i<len;i++)for(let j=0;j<8;j++){const X=px+i,Y=row*8+j;if(X<0||X>=cw)continue;let k=2+(tone-.5)*1.4+(vnoise(X*.08,Y*.9,row)-.5)*1.2;if(j===7)k=0;if(i===0)k=.6;P(x,RAMP.wood[clamp(Math.round(k)+1,0,5)],X,Y);}
      px+=len;}}
    // 뒷벽
    for(let y=0;y<32;y++)for(let i=0;i<cw;i++){if(y<16){const n=hash(i,y,3);P(x,n<.07?'#e0cfb0':'#efe2c8',i,y);}else{const b=(i%8===0)?0:(i%8===1?3:2);P(x,RAMP.wood[b+(y===16?2:0)],i,y);}}
    P(x,RAMP.wood[1],0,14,cw,2);P(x,RAMP.wood[4],0,14,cw,1);P(x,'rgba(61,44,46,.18)',0,32,cw,3);
    // 선반과 단지
    for(const[sx,sw]of[[2,40],[120,46]]){P(x,RAMP.wood[2],sx,9,sw,2);P(x,RAMP.wood[4],sx,9,sw,1);
      for(let k=0;k<sw/8-1;k++){const jx=sx+4+k*8,ramp=[RAMP.orange,RAMP.teal,RAMP.red,RAMP.yellow,RAMP.brown][(k+sx)%5];const s=mk(8,9,c=>{shadeEll(c,4,5,3,3.4,ramp,{dither:false,spec:'#fff'});P(c,'#3d2c2e',2,1,4,1);P(c,'#e2cfb0',2,0,4,1);});x.drawImage(outline(s),jx-3,0);}}
    // 메뉴 나무패
    for(let k=0;k<3;k++){const mx=100+k*7;P(x,RAMP.wood[1],mx,1,5,12);P(x,RAMP.wood[4],mx+1,2,3,10);P(x,'#5a3f2e',mx+2,4,1,6);}
    // 앞벽 (아래)
    for(let i=0;i<cw;i++)for(let y=128;y<144;y++){P(x,y<130?RAMP.wood[4]:RAMP.wood[(i%12===0)?0:1],i,y);}
    P(x,'#d9b98a',80,128,16,16);P(x,'#c9a376',80,128,16,2);
  });
}
