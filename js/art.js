'use strict';
// =====================================================================
//  등불식당 — 도트 그림 엔진
//  모든 그림은 코드로 찍는다. 채도를 낮춘 따뜻한 팔레트 + 구체 음영 + 부드러운 외곽선(sel-out)
// =====================================================================
const T = 16;
const PAL = {
  '#':'#3d2c2e','%':'#5b4141',
  w:'#fbf5ea',c:'#f3e6cf',C:'#e2cfb0',
  d:'#d4ae86',D:'#b98d68',e:'#977055',E:'#735441',f:'#553f33',
  s:'#eedfbb',S:'#dcc79f',
  t:'#cf9d70',T:'#ad7c53',u:'#87603f',U:'#634631',
  a:'#cdc5b8',A:'#a69e93',m:'#837c75',M:'#615b58',
  r:'#e2887a',R:'#c4614f',x:'#94443d',
  o:'#eaa96a',O:'#cc8248',y:'#f2d58d',Y:'#d9ae5f',
  p:'#f1bbb1',P:'#da918b',v:'#bca6c8',V:'#9480a8',b:'#a3bfd6',B:'#7395b5',
  g:'#a8c172',G:'#86a35a',n:'#647f45',N:'#4b6338',
};
const DARK = [61,44,46];
const RAMP = {
  leaf:['#3a4c34','#4a633c','#5f7c47','#7a9653','#97ae66','#b7c788'],
  leafY:['#4f5232','#66693a','#7f8346','#9b9c54','#b8b46a','#d3cc8c'],
  blossom:['#8a5c66','#a5717a','#c08b91','#d7a6a6','#e9c2bc','#f6dcd4'],
  maple:['#6b3a31','#8a4a37','#a86241','#c47f50','#d9a066','#e9c28a'],
  bark:['#45322a','#5a4033','#71533f','#896a50'],
  stone:['#4f4b49','#66615d','#7f7973','#999289','#b4ada1','#cec7bb'],
  white:['#a49c90','#c3bbae','#dbd3c6','#ede6da','#fbf5ea'],
  red:['#6e3331','#8c413b','#ab5549','#c77162','#dd927f','#eeb7a5'],
  orange:['#7f4a2d','#9d6038','#bb7a47','#d4975a','#e7b679','#f4d4a3'],
  yellow:['#93763e','#b0904c','#caab5d','#dfc477','#eedb9a','#f8eccb'],
  brown:['#4a372f','#5f4638','#775944','#906e53','#aa8766','#c5a382'],
  crop:['#36502f','#476a3a','#5d8546','#77a052','#95b866','#b6cf88'],
  dkgreen:['#2c3a2b','#384a35','#465d40','#57714d','#6b885d'],
  skin:['#d79b82','#e8b49a','#f4ccb2','#fbe1cd','#fff0e3'],
  wood:['#5a3f2e','#6f4f39','#876245','#a07a56','#bb956c','#d4b087'],
  roof:['#3a3a45','#4a4b57','#5c5e6a','#71747f','#8a8d96','#a5a8ae'],
  purple:['#4f4263','#65567c','#7f6f97','#9a8bb0','#b8abc8'],
  pink:['#9b5c66','#b8747c','#d19196','#e6b0b0','#f4d0cc'],
  gold:['#8a6326','#ad7f30','#cc9e3e','#e3bd55','#f2d77c','#fbedb4'],
  silver:['#5f6a70','#7a868b','#98a4a6','#b7c1c0','#d6dddb','#f0f3f1'],
  teal:['#3e5f63','#4f777a','#669193','#82abaa','#a3c5c0'],
};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function mk(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(f)f(x,w,h);return c;}
const col=ch=>PAL[ch]||ch;
function P(c,ch,x,y,w=1,h=1){c.fillStyle=col(ch);c.fillRect(x,y,w,h);}
function rng(seed){let a=seed>>>0||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(x,y,s=0){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y,s=0){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s=0){return vnoise(x,y,s)*.6+vnoise(x*2.1,y*2.1,s+7)*.28+vnoise(x*4.3,y*4.3,s+13)*.12;}
function rgb(h){h=col(h);return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function mix(a,b,t){const A=rgb(a),B=rgb(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function spr(rows,map){const w=Math.max(...rows.map(r=>r.length));return mk(w,rows.length,c=>{rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){let ch=r[i];if(map&&map[ch])ch=map[ch];if(ch!=='.'&&ch!==' ')P(c,ch,i,j);}});});}
function flipH(s){return mk(s.width,s.height,c=>{c.translate(s.width,0);c.scale(-1,1);c.drawImage(s,0,0);});}

const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const LV=(()=>{const v=[-.5,-.65,.58],l=Math.hypot(...v);return v.map(a=>a/l);})();
// 빛을 받는 타원(구체) — 도트 음영의 핵심
function shadeEll(c,cx,cy,rx,ry,ramp,o={}){
  const ang=o.ang||0,ca=Math.cos(ang),sa=Math.sin(ang),dith=o.dither===true,amb=o.amb||0,R=Math.max(rx,ry)+1,flat=o.flat||1;
  for(let y=Math.floor(cy-R);y<=cy+R;y++)for(let x=Math.floor(cx-R);x<=cx+R;x++){
    if(o.clip&&!o.clip(x,y))continue;
    const px=x+.5-cx,py=y+.5-cy,lx=(px*ca+py*sa)/rx,ly=(-px*sa+py*ca)/ry,r2=lx*lx+ly*ly;if(r2>1)continue;
    const nz=Math.sqrt(1-r2)*flat,nx=lx*ca-ly*sa,ny=lx*sa+ly*ca;
    let L=(nx*LV[0]+ny*LV[1]+nz*LV[2])/Math.hypot(nx,ny,nz||.001);L=clamp(L*.55+.45+amb,0,.999);
    let f=L*ramp.length;if(dith)f+=(BAYER[(y&3)*4+(x&3)]-.5)*.8;
    P(c,ramp[clamp(Math.floor(f),0,ramp.length-1)],x,y);
    if(o.spec&&L>.9&&r2<.45)P(c,o.spec,x,y);
  }
}
// 원기둥 음영 (세로)
function shadeCyl(c,x0,y0,w,h,ramp,amb=0){for(let i=0;i<w;i++){const nx=(i+.5)/w*2-1,nz=Math.sqrt(Math.max(0,1-nx*nx));let L=nx*LV[0]+nz*LV[2];L=clamp(L*.55+.45+amb,0,.999);P(c,ramp[Math.floor(L*ramp.length)],x0+i,y0,1,h);}}
// 부드러운 외곽선: 바깥 픽셀을 이웃 색을 어둡게 섞어 칠한다 (위쪽 밝게, 아래쪽 진하게)
function outline(src,strength=1){
  const w=src.width,h=src.height,c=mk(w,h);const x=c.getContext('2d');x.drawImage(src,0,0);
  const id=x.getImageData(0,0,w,h),d=id.data,o=new Uint8ClampedArray(d);
  const at=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&d[(j*w+i)*4+3]>110;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const p=(j*w+i)*4;if(d[p+3]>110)continue;
    let nb=-1,k=.7;
    if(at(i,j+1)){nb=((j+1)*w+i)*4;k=.5;}else if(at(i+1,j)){nb=(j*w+i+1)*4;k=.6;}else if(at(i-1,j)){nb=(j*w+i-1)*4;k=.72;}else if(at(i,j-1)){nb=((j-1)*w+i)*4;k=.82;}
    if(nb<0)continue;k=Math.min(.95,k*strength);
    o[p]=d[nb]*(1-k)+DARK[0]*k;o[p+1]=d[nb+1]*(1-k)+DARK[1]*k;o[p+2]=d[nb+2]*(1-k)+DARK[2]*k;o[p+3]=255;}
  for(let p=3;p<o.length;p+=4)if(o[p]>0&&o[p]<255)o[p]=o[p]>110?255:0;
  x.putImageData(new ImageData(o,w,h),0,0);return c;
}
function leaf(c,x,y,len,ang,ramp,wd){shadeEll(c,x+Math.cos(ang)*len/2,y+Math.sin(ang)*len/2,len/2,wd||Math.max(1,len/4.5),ramp,{ang,dither:false});}
function line(c,x0,y0,x1,y1,ch){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))|0;for(let i=0;i<=n;i++){const t=n?i/n:0;P(c,ch,Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t));}}

// =====================================================================
//  나무, 덤불, 돌
// =====================================================================
function fe(c,cx,cy,rx,ry,ch){c.fillStyle=col(ch);for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;if(dx*dx+dy*dy<=1)c.fillRect(x,y,1,1);}}
// 단순한 셀 음영 나무: 어두운 실루엣 → 중간톤 → 밝은 덩어리 → 몇 점 하이라이트
const TREEPAL={
  oak:['#3e5839','#577a45','#7b9c57','#a7c179'],
  persimmon:['#4f5b37','#6c7a44','#8f9a53','#b9bd78'],
  blossom:['#9a6672','#c08a94','#e0b2b3','#f5dad4'],
  maple:['#83432f','#ad5c3b','#d3854e','#ecb878'],
  pine:['#2d4637','#3d5f45','#557d56','#7c9f6d'],
};
const BARK=['#4c372c','#694b38','#8a6a50'];
function trunk(x,tx,ty,th){P(x,BARK[1],tx,ty,6,th);P(x,BARK[2],tx,ty,2,th);P(x,BARK[0],tx+4,ty,2,th);
  P(x,BARK[1],tx-1,ty+th-3,8,3);P(x,BARK[2],tx-1,ty+th-3,2,2);P(x,BARK[0],tx+6,ty+th-2,1,2);P(x,BARK[0],tx+2,ty+4,1,2);P(x,BARK[0],tx+3,ty+9,1,2);}
function makeTree(kind,seed){
  if(kind==='pine')return makePine(seed);
  const r=rng(seed*131+kind.length*7),pl=TREEPAL[kind];
  const c=mk(42,52,x=>{
    trunk(x,18,31,18);
    const B=[[21,21,13,10.5],[11,25,8,6.5],[31,25,8,6.5],[21,12,10,7.5],[14,15,6,5],[28,16,6,5]].map(([a,b,rx,ry])=>[a+(r()-.5)*2,b+(r()-.5)*1.5,rx+(r()-.5),ry]);
    for(const[a,b,rx,ry]of B)fe(x,a,b,rx,ry,pl[0]);
    for(const[a,b,rx,ry]of B)fe(x,a-.8,b-1.6,rx-1.4,ry-1.6,pl[1]);
    for(const[a,b,rx,ry]of B)if(b<23)fe(x,a-2.2,b-3,rx*.55,ry*.5,pl[2]);
    for(const[a,b,rx]of B){if(b>=23)continue;P(x,pl[3],Math.round(a-rx*.45),Math.round(b-4),2,1);P(x,pl[3],Math.round(a-rx*.2),Math.round(b-5),1,1);}
    for(const[a,b,rx,ry]of B){for(let k=-1;k<=1;k++){const sx=Math.round(a+k*rx*.45),sy=Math.round(b+ry*.45);P(x,pl[0],sx-1,sy,1,1);P(x,pl[0],sx,sy+1,2,1);P(x,pl[0],sx+2,sy,1,1);}}
    if(kind==='persimmon')for(const[a,b]of[[12,24],[27,19],[19,27],[32,26],[16,16],[24,13]]){fe(x,a,b,1.8,1.6,'#d8783f');P(x,'#f2b06c',a-1,b-1);P(x,'#566b3c',a,b-2);}
    if(kind==='blossom')for(let k=0;k<10;k++){const a=6+r()*30|0,b=6+r()*24|0;if(x.getImageData(a,b,1,1).data[3])P(x,'#fbf0ea',a,b);}
  });
  return outline(c);
}
function makePine(seed){const pl=TREEPAL.pine,r=rng(seed*7+1);return outline(mk(36,52,x=>{
  trunk(x,15,38,12);
  const tiers=[[6,9],[14,12],[23,15],[32,16]];
  for(const[ty,hw]of tiers){for(let j=0;j<10;j++){const w=Math.round(hw*(j+1)/10);P(x,pl[0],18-w,ty+j,w*2,1);}}
  for(const[ty,hw]of tiers){for(let j=0;j<9;j++){const w=Math.round((hw-1.5)*(j+1)/10);P(x,pl[1],18-w-1,ty+j,w*2,1);P(x,pl[2],18-w-1,ty+j,Math.max(1,Math.round(w*.6)),1);}
    for(let i=-hw+2;i<hw-1;i+=3)P(x,pl[0],18+i,ty+9,2,1);P(x,pl[3],18-Math.round(hw*.5),ty+5,2,1);}
  P(x,pl[2],17,5,2,2);}));}
function makeBush(seed,flower){
  const r=rng(seed*53+5),pl=TREEPAL.oak;
  return outline(mk(20,16,x=>{const B=[[10,9,7.5,5],[6,10,4,3.5],[14,10,4,3.5],[10,6,4.5,3.5]].map(([a,b,rx,ry])=>[a+(r()-.5),b,rx,ry]);
    for(const[a,b,rx,ry]of B)fe(x,a,b,rx,ry,pl[0]);for(const[a,b,rx,ry]of B)fe(x,a-.6,b-1,rx-1.2,ry-1.2,pl[1]);fe(x,8,6,3,1.8,pl[2]);P(x,pl[3],7,5,2,1);
    if(flower)for(const[a,b]of[[5,8],[11,6],[14,9],[8,11],[16,7]]){P(x,flower,a,b);P(x,'#fbf5ea',a,b-1);}}));
}
const STONE=['#6f6a66','#8f8981','#b2aba0','#d2ccc1'];
function makeRock(seed){const v=seed%4,r=rng(seed+900);return outline(mk(18,15,x=>{
  const rock=(a,b,rx,ry)=>{fe(x,a,b,rx,ry,STONE[0]);fe(x,a-.5,b-1,rx-.8,ry-1,STONE[1]);fe(x,a-1.5,b-1.8,rx*.55,ry*.5,STONE[2]);P(x,STONE[3],Math.round(a-rx*.5),Math.round(b-ry*.6),2,1);};
  if(v===0){rock(9,9,7,4.6);P(x,STONE[0],10,8,1,2);P(x,STONE[0],11,10,1,1);}
  else if(v===1){rock(6,10,4.5,3.4);rock(12.5,10.5,4,3);}
  else if(v===2){rock(9,8.5,5,5.4);}
  else{rock(8,10,6.5,3.6);rock(12,8,3,2.4);}
  for(const[a,b]of[[5,6],[6,6],[4,7]])if(r()<.7)P(x,'#7b9c57',a+(v===1?-1:0),b+(v===2?-1:0));}));}
function makeStump(){return outline(mk(18,16,x=>{shadeCyl(x,3,6,12,7,RAMP.wood);shadeEll(x,9,6,6,2.6,['#a07a56','#bb956c','#d4b087','#e6c9a2'],{dither:false,flat:.2});
  x.strokeStyle='#a07a56';x.beginPath();x.ellipse(9,6,3,1.2,0,0,7);x.stroke();P(x,RAMP.wood[0],2,12,2,1);P(x,RAMP.wood[0],14,12,2,1);}));}
function makeStoneWall(seed){const r=rng(seed*7+3);return outline(mk(18,18,x=>{
  for(const[a,b,rx,ry]of[[4.5,13,4.4,3.2],[13,13.3,4.6,3.1],[8.5,8.6,4.6,3.1],[16.5,8.8,3,2.8],[1.5,8.8,2.6,2.8]]){const a2=a+(r()-.5);fe(x,a2,b,rx,ry,STONE[0]);fe(x,a2-.4,b-.8,rx-.8,ry-.9,STONE[1]);fe(x,a2-1.2,b-1.5,rx*.45,ry*.4,STONE[2]);}
  for(let k=0;k<3;k++)P(x,RAMP.leaf[3],2+(r()*14|0),6+(r()*2|0));}));}
function makeMushrooms(){return outline(mk(16,14,x=>{for(const[a,b,s]of[[5,8,1],[10,9,.8],[8,10,.6]]){shadeCyl(x,Math.round(a-1),b,2,4,RAMP.white);shadeEll(x,a,b,4*s,2.4*s,RAMP.brown,{dither:false,spec:'#e6c9a2'});}}));}
function makeLantern(lit){return outline(mk(18,34,x=>{
  shadeEll(x,9,30,6.5,2.6,RAMP.stone);shadeCyl(x,7,19,4,11,RAMP.stone);shadeEll(x,9,18.5,6,2,RAMP.stone,{flat:.4});
  shadeCyl(x,4,11,10,7,RAMP.stone,.03);
  if(lit){P(x,'#f6d58a',6,12,6,5);P(x,'#fff1c8',7,13,4,3);P(x,'#f2a95e',8,15,2,2);}else{P(x,'#4a4644',6,12,6,5);P(x,'#5d5855',6,12,6,1);}
  P(x,RAMP.stone[2],8,12,2,5);
  shadeEll(x,9,9.5,8,2.6,RAMP.stone,{flat:.5,amb:.05});shadeEll(x,9,6.8,4.4,2.5,RAMP.stone,{amb:.05});shadeEll(x,9,3.6,1.9,1.9,RAMP.stone,{dither:false});
  for(let k=0;k<4;k++)P(x,RAMP.leaf[3],[5,12,7,11][k],[29,28,20,25][k]);}));}
function makeBench(){return outline(mk(30,16,x=>{shadeCyl(x,4,8,2,7,RAMP.wood);shadeCyl(x,24,8,2,7,RAMP.wood);P(x,RAMP.wood[4],2,6,26,2);P(x,RAMP.wood[3],2,8,26,1);P(x,RAMP.wood[5],2,6,26,1);
  P(x,RAMP.wood[3],3,2,24,2);P(x,RAMP.wood[4],3,2,24,1);shadeCyl(x,5,3,2,4,RAMP.wood);shadeCyl(x,23,3,2,4,RAMP.wood);}));}
function makeSign(){return outline(mk(16,22,x=>{shadeCyl(x,7,9,2,12,RAMP.wood);P(x,RAMP.wood[3],2,3,12,7);P(x,RAMP.wood[4],2,3,12,1);P(x,RAMP.wood[2],2,9,12,1);
  P(x,'#e9c28a',5,5,6,1);P(x,'#e9c28a',5,7,4,1);}));}
function makeCrates(){return outline(mk(28,22,x=>{const box=(bx,by,fill)=>{P(x,RAMP.wood[2],bx,by,12,10);P(x,RAMP.wood[4],bx,by,12,1);for(let i=bx+1;i<bx+12;i+=3)P(x,RAMP.wood[3],i,by+1,2,9);
  if(fill)for(let k=0;k<5;k++)shadeEll(x,bx+2+k*2,by-1,1.8,1.6,fill,{dither:false});};
  box(1,10,RAMP.orange);box(14,10,RAMP.red);box(7,1,RAMP.white);}));}

// =====================================================================
//  등불식당 외관 (기와지붕, 창살, 포렴)
// =====================================================================
const DINER_W=104,DINER_H=112;
function makeDiner(){return outline(mk(DINER_W,DINER_H,x=>{
  // 기단
  for(let i=0;i<9;i++)shadeEll(x,10+i*10.5,105,5.6,3.4,RAMP.stone,{amb:(i%3-1)*.04});
  // 벽
  for(let y=56;y<101;y++)for(let i=10;i<94;i++){const n=hash(i,y,5);P(x,n<.08?'#e4d3b6':n>.95?'#fbf3e4':'#f1e4cc',i,y);}
  shadeCyl(x,10,56,4,45,RAMP.wood);shadeCyl(x,90,56,4,45,RAMP.wood);shadeCyl(x,47,56,3,45,RAMP.wood);shadeCyl(x,69,56,3,45,RAMP.wood);
  P(x,RAMP.wood[2],10,56,84,4);P(x,RAMP.wood[4],10,56,84,1);P(x,RAMP.wood[1],10,59,84,1);
  P(x,RAMP.wood[2],10,90,84,3);P(x,RAMP.wood[4],10,90,84,1);
  // 창살창
  for(const[wx,ww]of[[17,26],[74,13]]){P(x,RAMP.wood[1],wx,64,ww,22);P(x,'#f3e6cf',wx+2,66,ww-4,18);}
  // 문 + 포렴
  P(x,RAMP.wood[0],51,66,17,35);P(x,RAMP.wood[2],52,67,15,34);for(let i=53;i<67;i+=3)P(x,RAMP.wood[1],i,67,1,34);P(x,RAMP.wood[3],52,82,15,1);
  for(let i=50;i<69;i++){const slit=(i===56||i===62);const h=slit?0:14+((i%6===0)?1:0);for(let y=62;y<62+h;y++)P(x,y<64?'#7a3733':((i+y)%7===0?'#a8554a':'#93463f'),i,y);}
  shadeEll(x,59.5,70,3.2,3.2,['#d9c9b0','#efe3cf','#fbf5ea'],{dither:false});P(x,'#93463f',59,68,1,5);P(x,'#93463f',57,70,5,1);
  P(x,RAMP.wood[1],48,61,23,2);
  // 간판
  P(x,RAMP.wood[1],38,46,30,10);P(x,RAMP.wood[3],39,47,28,8);P(x,RAMP.wood[4],39,47,28,1);
  shadeEll(x,53,51,2.4,3,RAMP.orange,{dither:false});P(x,'#fbedb4',52,50,2,2);P(x,RAMP.wood[0],53,46,1,2);
  for(const sx of[44,47,59,62])P(x,'#e9c28a',sx,50,2,3);
  // 지붕 (기와)
  const top=14,bot=52;
  for(let y=top;y<=bot;y++){const t=(y-top)/(bot-top);const half=30+t*22;const lift=0;const x0=Math.round(52-half),x1=Math.round(52+half);
    for(let i=x0;i<=x1;i++){const ph=((i-52)+200)%6;const L=ph<3?(ph===1?4:3):ph<5?2:1;const shade=t>.85?-1:0;P(x,RAMP.roof[clamp(L+shade+(y%7===0?-1:0),0,5)],i,y-lift);}}
  // 처마 끝 들림 + 막새
  for(let i=0;i<104;i++){const e=Math.abs(i-52)/52;const lift=Math.round(Math.pow(e,3)*7);const y=bot+1-lift;P(x,RAMP.roof[1],i,y-2,1,3);P(x,RAMP.roof[0],i,y+1,1,1);}
  for(let i=3;i<102;i+=6){const e=Math.abs(i-52)/52;const lift=Math.round(Math.pow(e,3)*7);shadeEll(x,i+1,bot+1-lift,1.8,1.6,RAMP.roof,{dither:false});}
  // 용마루
  P(x,RAMP.roof[1],16,top-4,72,5);P(x,RAMP.roof[3],16,top-4,72,1);P(x,RAMP.roof[2],16,top-2,72,1);
  shadeEll(x,15,top-5,3.4,3,RAMP.roof,{dither:false});shadeEll(x,89,top-5,3.4,3,RAMP.roof,{dither:false});
  // 그늘
  P(x,'rgba(61,44,46,.25)',10,60,84,3);
}));}
function dinerWindows(c,x,y,lit,t){
  for(const[wx,ww]of[[17,26],[74,13]]){c.fillStyle=lit?'#f4cd86':'#efe2c9';c.fillRect(x+wx+2,y+66,ww-4,18);
    if(lit){c.fillStyle='#fbe7b4';c.fillRect(x+wx+3,y+67,ww-8,6);}
    c.fillStyle=lit?'#9a6a42':'#a07a56';for(let i=wx+5;i<wx+ww-2;i+=4)c.fillRect(x+i,y+66,1,18);c.fillRect(x+wx+2,y+72,ww-4,1);c.fillRect(x+wx+2,y+78,ww-4,1);}
}
// 처마 초롱
function choRong(c,x,y,lit,t){const sw=Math.round(Math.sin(t*1.7+x)*1);P(c,'#3d2c2e',x+3+sw,y-4,1,4);
  P(c,'#3d2c2e',x,y,8,11);P(c,lit?'#f39a6b':'#c4614f',x+1,y+1,6,9);P(c,lit?'#ffd4a0':'#de8a72',x+2,y+2,2,6);P(c,'#3d2c2e',x+1,y+1,6,1);P(c,'#3d2c2e',x+1,y+9,6,1);
  P(c,'#d9ae5f',x+2,y+11,4,1);P(c,'#d9ae5f',x+3,y+12,2,2);}

// =====================================================================
//  작물 (6종 × 4단계) — 그림자, 잎, 열매에 각각 음영
// =====================================================================
function cropArt(kind,stage){
  const c=mk(18,20,x=>{
    const base=17;
    if(stage===0){shadeEll(x,9,base-1,4,1.6,RAMP.brown,{dither:false});P(x,'#f3e6cf',7,base-2);P(x,'#f3e6cf',11,base-2);return;}
    if(stage===1){shadeEll(x,9,base,2.5,1,RAMP.brown,{dither:false});P(x,RAMP.crop[2],9,base-4,1,4);leaf(x,9,base-4,5,-2.5,RAMP.crop,1.6);leaf(x,9.5,base-4,5,-.6,RAMP.crop,1.6);return;}
    const L=RAMP.crop;
    if(kind==='radish'){
      if(stage===3)shadeEll(x,9,base-3,4.2,3.6,RAMP.white,{spec:'#fff'});if(stage===3)P(x,'#b6cf88',7,base-6,5,1);
      for(const[a,l]of[[-2.2,8],[-1.6,9],[-1.1,8],[-.6,7],[-2.7,6]])leaf(x,9,base-5,stage===3?l:l-2,a,L,2);
    }else if(kind==='potato'){
      const k=stage===3?1:.8;for(const[a,l]of[[-2.6,7],[-2,8],[-1.5,8],[-1,8],[-.5,7],[-1.3,5]])leaf(x,9,base-2,l*k,a,L,2.2);
      if(stage===3)for(const[a,b]of[[5,5],[11,4],[13,8]]){P(x,'#fbf5ea',a,b-1);P(x,'#fbf5ea',a-1,b);P(x,'#fbf5ea',a+1,b);P(x,'#fbf5ea',a,b+1);P(x,'#e3bd55',a,b);}
    }else if(kind==='onion'){
      const hgt=stage===3?15:10;for(const[dx,dh]of[[-3,-2],[-1,0],[1,-1],[3,-3]]){const hh=hgt+dh;for(let i=0;i<hh;i++){const tt=i/hh;P(x,tt<.3?'#f1ead9':tt<.45?'#c6d6a1':L[3+(i%5===0?1:0)],9+dx,base-i);P(x,tt<.3?'#cfc6b4':L[2],9+dx+1,base-i);}}
    }else if(kind==='carrot'){
      if(stage===3)shadeEll(x,9,base-1,3.2,2.2,RAMP.orange,{dither:false,spec:'#f4d4a3'});
      for(let a=-2.8;a<=-.3;a+=.42){const l=(stage===3?10:7)-Math.abs(a+1.55)*2;for(let i=1;i<l;i++){const px=9+Math.cos(a)*i,py=base-3+Math.sin(a)*i;P(x,L[2+((i>>1)&1)+(i>l-3?1:0)],Math.round(px),Math.round(py));if(i%2===0)P(x,L[4],Math.round(px+1),Math.round(py));}}
    }else if(kind==='pumpkin'){
      leaf(x,4,base-5,6,-2.4,L,3);leaf(x,13,base-6,6,-.7,L,3);
      if(stage===3){shadeEll(x,9,base-4,6.6,4.8,['#2e4229','#3b5534','#4c6b40','#628450','#7c9c63'],{spec:'#a3b97a'});for(const dx of[-3,0,3])for(let y=base-8;y<base;y++)if(hash(dx,y)<.7)P(x,'#33492d',9+dx,y);
        P(x,RAMP.wood[1],9,base-10,2,3);}else{shadeEll(x,10,base-3,2.5,2,RAMP.yellow,{dither:false});}
    }else if(kind==='strawberry'){
      for(const[a,l]of[[-2.8,6],[-2.2,7],[-1.4,7],[-.8,7],[-.3,6]])leaf(x,9,base-1,l,a,L,2.4);
      if(stage===3)for(const[a,b]of[[5,base-2],[12,base-3],[9,base]]){shadeEll(x,a,b,2.2,2.6,RAMP.red,{dither:false,spec:'#f6d0c0'});P(x,'#f4e6a6',a-1,b);P(x,'#f4e6a6',a+1,b+1);P(x,L[3],a,b-3,1,1);}
      else{P(x,'#fbf5ea',8,base-6);P(x,'#fbf5ea',7,base-5);P(x,'#fbf5ea',9,base-5);P(x,'#fbf5ea',8,base-4);P(x,'#e3bd55',8,base-5);}
    }
  });
  return outline(c,.9);
}
const CROP_KINDS=['radish','potato','onion','carrot','pumpkin','strawberry'];
const CROPART={};for(const k of CROP_KINDS)CROPART[k]=[0,1,2,3].map(s=>cropArt(k,s));
const WEED=outline(mk(14,12,x=>{for(const[a,l]of[[-2.6,6],[-2,7],[-1.4,6],[-.6,6],[-1.1,4]])leaf(x,7,10,l,a,RAMP.dkgreen,1.3);}));
const SOIL=[0,1].map(wet=>mk(16,16,x=>{const ramp=wet?['#3f2f29','#4b382f','#594236','#664c3d']:['#6b4e3d','#7c5b46','#8e6a52','#a07a5f'];
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){const ex=Math.min(i,15-i),ey=Math.min(j,15-j);if(ex+ey<2)continue;const furrow=(j%5===2)?0:(j%5===3?2:1);const n=hash(i,j,wet+3);
    P(x,ramp[clamp(furrow+(n<.15?-1:n>.88?1:0)+((ex<1||ey<1)?-1:0),0,3)],i,j);}
  if(wet){P(x,'rgba(170,200,210,.18)',3,2,4,1);P(x,'rgba(170,200,210,.18)',9,7,5,1);}}));

// =====================================================================
//  아이콘 (16×16)
// =====================================================================
const IC={};
function icon(fn){return outline(mk(18,18,x=>fn(x)));}
IC.radish=icon(x=>{shadeEll(x,9,11,4.4,5,RAMP.white,{spec:'#fff'});P(x,'#c9dba3',7,6,5,2);for(const a of[-2.1,-1.6,-1.1])leaf(x,9,6,6,a,RAMP.crop,1.7);P(x,'#cfc6b4',9,16,1,1);});
IC.potato=icon(x=>{shadeEll(x,9,10,6,4.6,RAMP.brown,{spec:'#e6cfa8',amb:.1});for(const[a,b]of[[7,8],[11,11],[9,12]])P(x,RAMP.brown[1],a,b);});
IC.onion=icon(x=>{for(let i=0;i<14;i++){const tt=i/14;P(x,tt<.4?'#f1ead9':tt<.55?'#c6d6a1':RAMP.crop[3],7+(i>9?-1:0),15-i,2,1);P(x,tt<.4?'#f1ead9':RAMP.crop[2],10+(i>10?1:0),15-i,2,1);}P(x,'#e6dcc8',8,14,3,2);});
IC.carrot=icon(x=>{for(let i=0;i<10;i++){const w=Math.max(1,4-i*.4);shadeEll(x,6+i*.8,5+i,w,1.2,RAMP.orange,{dither:false});}for(const a of[-2.6,-2,-1.5])leaf(x,6,5,5,a,RAMP.crop,1.4);});
IC.pumpkin=icon(x=>{shadeEll(x,9,10,7,5.2,['#2e4229','#3b5534','#4c6b40','#628450','#7c9c63'],{spec:'#a3b97a'});for(const dx of[-3,0,3])P(x,'#33492d',9+dx,7,1,7);P(x,RAMP.wood[1],9,3,2,3);shadeEll(x,13,12,2,1.6,RAMP.orange,{dither:false});});
IC.strawberry=icon(x=>{shadeEll(x,9,10,5,5.6,RAMP.red,{spec:'#f6d0c0'});for(const[a,b]of[[7,9],[11,10],[9,12],[8,13],[11,7],[6,11]])P(x,'#f4e6a6',a,b);for(const a of[-2.5,-1.6,-.6])leaf(x,9,5,4,a,RAMP.crop,1.4);});
IC.mushroom=icon(x=>{shadeCyl(x,8,9,3,6,RAMP.white);shadeEll(x,9.5,8,6,3.6,RAMP.brown,{spec:'#e6c9a2'});for(const[a,b]of[[7,6],[11,7],[9,9]])P(x,'#e6d2b2',a,b);});
IC.persimmon=icon(x=>{shadeEll(x,9,10,5.6,5,RAMP.orange,{spec:'#fbe6c4'});P(x,RAMP.crop[2],6,5,7,2);P(x,RAMP.wood[1],9,3,1,3);});
function fishArt(w,h,ramp,o={}){return outline(mk(w,h,x=>{const cy=h/2,bl=w*.36;
  // 꼬리
  for(let i=0;i<w*.2;i++){const s=i*.55+1;P(x,ramp[1],w*.06+i,cy-s,1,s*2);}
  shadeEll(x,w*.52,cy,bl,h*.34*(o.slim||1),ramp,{spec:ramp[ramp.length-1]});
  if(o.belly)shadeEll(x,w*.55,cy+h*.12,bl*.75,h*.12,o.belly,{dither:false});
  P(x,ramp[1],w*.42,cy-h*.36,w*.2,2);
  if(o.spots)for(let k=0;k<6;k++)P(x,o.spots,w*.3+hash(k,1)*w*.4,cy-h*.2+hash(k,2)*h*.3);
  const ex=Math.round(w*.78),ey=Math.round(cy-h*.08);P(x,'#fbf5ea',ex,ey,2,2);P(x,'#3d2c2e',ex+1,ey,1,1);
  if(o.whisk){line(x,w*.86,cy+1,w*.98,cy+4,'#3d2c2e');line(x,w*.84,cy+1,w*.92,cy+5,'#3d2c2e');}
}));}
const FISHRAMP={
  f_crucian:[['#5b5232','#76693e','#91834e','#ad9e66','#c8ba87','#e4d9b4'],{belly:['#d4c69a','#e8dcba']}],
  f_sweet:[['#4f5a52','#69766b','#879286','#a8b1a3','#c7cec2','#e6ebe2'],{slim:.8,belly:['#e5e6d8','#f4f3ea']}],
  f_trout:[['#5b4d55','#776470','#95818b','#b39fa5','#cfbec0','#ecdfdd'],{spots:'#5b4d55',belly:['#e8b7aa','#f2d0c4']}],
  f_catfish:[['#2f2b2b','#433c3a','#58504c','#706660','#8a8079','#a59b92'],{whisk:1}],
  f_gold:[RAMP.gold,{belly:['#f2d77c','#fbedb4']}],
};
for(const k in FISHRAMP)IC[k]=fishArt(18,12,FISHRAMP[k][0],FISHRAMP[k][1]);
IC.f_cray=outline(mk(18,16,x=>{for(let i=0;i<5;i++)shadeEll(x,5+i*2,9+(i===4?0:0),2.2-i*.1,2.6-i*.15,RAMP.red,{dither:false});shadeEll(x,15,6,2.6,1.6,RAMP.red,{dither:false,ang:-.6});shadeEll(x,15,12,2.6,1.6,RAMP.red,{dither:false,ang:.6});
  P(x,'#3d2c2e',4,8);P(x,'#3d2c2e',4,10);line(x,3,8,0,5,'#94443d');line(x,3,10,0,13,'#94443d');}));
function pouch(c1,c2){return outline(mk(18,18,x=>{shadeEll(x,9,11,5.6,5,['#9a8466','#b29d7d','#c8b493','#dccbab','#ece0c6'],{amb:.05});P(x,'#9a8466',6,5,7,2);P(x,'#ece0c6',7,5,5,1);
  P(x,c1,7,9,4,4);P(x,c2,8,10,2,2);line(x,9,3,6,1,'#87603f');}));}
IC.s_radish=pouch('#efe8dc','#86a35a');IC.s_potato=pouch('#906e53','#c5a382');IC.s_onion=pouch('#86a35a','#efe8dc');
IC.s_carrot=pouch('#d4975a','#86a35a');IC.s_pumpkin=pouch('#4c6b40','#d4975a');IC.s_strawberry=pouch('#c77162','#86a35a');
IC.worm=outline(mk(18,18,x=>{for(let i=0;i<12;i++){const a=i/11;fe(x,3+i,10+Math.sin(a*6)*3,1.6,1.6,i===2?'#b8746a':'#d99a8e');}P(x,'#f1bbb1',4,9,1,1);}));
IC.paste=outline(mk(18,18,x=>{fe(x,9,10,6,4.6,'#c9a86a');fe(x,8,9,4.5,3.2,'#ddc08a');for(const[a,b]of[[6,9],[10,8],[11,11],[8,12]])P(x,'#a8854c',a,b);}));
IC.fert=outline(mk(18,18,x=>{P(x,'#8a7a5a',4,4,10,12);P(x,'#a8946a',4,4,10,3);P(x,'#5b6e49',6,9,6,4);P(x,'#86a35a',7,9,2,2);P(x,'#c9b48a',5,3,8,1);}));
IC.coin=outline(mk(18,18,x=>{shadeEll(x,9,9,6.6,6.6,RAMP.gold,{dither:false,spec:'#fff6d0'});P(x,'#8a6326',7,7,4,4);P(x,'rgba(0,0,0,0)',8,8,2,2);x.clearRect(8,8,2,2);
  P(x,'#ad7f30',9,3,1,2);P(x,'#ad7f30',9,13,1,2);P(x,'#ad7f30',3,9,2,1);P(x,'#ad7f30',13,9,2,1);}));
IC.lanternOn=outline(mk(14,18,x=>{shadeEll(x,7,9,5,6,RAMP.orange,{spec:'#fff1c8'});P(x,'#3d2c2e',4,2,6,2);P(x,'#3d2c2e',4,15,6,2);P(x,'#ffe7b0',6,7,2,4);}));
IC.lanternOff=outline(mk(14,18,x=>{shadeEll(x,7,9,5,6,RAMP.stone,{});P(x,'#3d2c2e',4,2,6,2);P(x,'#3d2c2e',4,15,6,2);}));
IC.can=outline(mk(18,18,x=>{shadeEll(x,8,10,5.5,4.6,RAMP.teal,{spec:'#cfe3dc'});line(x,12,9,16,5,'#4f777a');line(x,12,10,16,6,'#669193');P(x,'#3e5f63',4,4,7,1);P(x,'#3e5f63',4,4,1,3);P(x,'#3e5f63',10,4,1,3);}));
IC.hoe=outline(mk(18,18,x=>{line(x,3,15,12,6,RAMP.wood[3]);line(x,4,15,13,6,RAMP.wood[2]);shadeEll(x,13,5,3.6,1.6,RAMP.silver,{dither:false,ang:-.8});}));
IC.rod=outline(mk(18,18,x=>{line(x,2,16,15,2,RAMP.wood[4]);line(x,3,16,16,2,RAMP.wood[2]);shadeEll(x,5,13,1.8,1.8,RAMP.stone,{dither:false});line(x,15,2,15,10,'#f3e6cf');}));

// =====================================================================
//  주인공 — 큰 머리, 점 두 개 눈, 앞치마. 머리 모양/색/옷/장식 조합
// =====================================================================
const HAIRS=[
  {id:'crew',n:'짧은 머리'},{id:'part',n:'가르마'},{id:'twoblock',n:'투블럭'},{id:'bowl',n:'덮머리'},{id:'spiky',n:'까치머리'},{id:'slick',n:'올백'},
  {id:'curly',n:'곱슬'},{id:'wolf',n:'울프컷'},{id:'mpony',n:'꽁지머리'},{id:'mlong',n:'장발'},
  {id:'short',n:'숏컷'},{id:'bob',n:'단발'},{id:'twin',n:'양갈래'},{id:'pony',n:'포니테일'},{id:'long',n:'긴 생머리'},{id:'hime',n:'히메컷'},{id:'buns',n:'똥머리'},{id:'braid',n:'땋은 머리'}];
const HS={crew:{b:'up',side:9,back:0},part:{b:'side',side:10,back:11},twoblock:{b:'side2',side:8,back:10,vol:1},bowl:{b:'straight',bl:8,side:11,back:12},
  spiky:{b:'jag',bl:6,side:9,back:10,spikes:1},slick:{b:'none',side:9,back:11},curly:{b:'curl',bl:7,side:11,back:12,curl:1},wolf:{b:'jag',bl:7,side:13,back:15,ragged:1},
  mpony:{b:'side',side:10,back:11,tail:'small'},mlong:{b:'center',side:14,back:16},short:{b:'jag',bl:7,side:11,back:11},bob:{b:'straight',bl:7,side:14,back:14},
  twin:{b:'jag',bl:7,side:11,back:11,tail:'twin'},pony:{b:'jag',bl:7,side:10,back:10,tail:'pony'},long:{b:'center',side:15,back:22},hime:{b:'straight',bl:7,side:13,back:22,hime:1},
  buns:{b:'jag',bl:7,side:10,back:10,tail:'buns'},braid:{b:'side',side:11,back:11,tail:'braid'}};
const HAIRCOL=[
  {n:'밤색',r:['#4a332b','#654638','#80594a','#a2765d']},{n:'먹색',r:['#26232b','#35303b','#48424f','#625a6c']},
  {n:'갈색',r:['#5a3a26','#7a5235','#9a6c45','#bb8a5c']},{n:'벚꽃',r:['#8e5560','#ad707a','#c98d93','#e3b2b0']},
  {n:'라벤더',r:['#564a6c','#706289','#8e80a8','#b2a5c8']},{n:'민트',r:['#3e6359','#557f72','#6f9d8c','#97bca8']},
  {n:'은발',r:['#77727a','#959099','#b8b3b8','#dad6d6']},{n:'금발',r:['#8f6f3c','#ad8b4a','#c9a85f','#e2c785']},
  {n:'하늘',r:['#46617f','#5f7d9c','#7d9bba','#a5bfd6']},{n:'다홍',r:['#7c3c37','#9c5046','#bb6a57','#d8917a']},
];
const OUTFITS=[
  {n:'감물',r:['#7c4a30','#99603d','#b67b4f','#cd9766']},{n:'쪽빛',r:['#36435c','#475874','#5e7290','#7c90ab']},
  {n:'쑥색',r:['#46553a','#5b6e49','#73885c','#90a477']},{n:'팥죽',r:['#5f2f33','#7b3f44','#985659','#b47472']},
  {n:'연분홍',r:['#9d6a70','#b9878b','#d2a3a4','#e5c0bd']},{n:'먹색',r:['#2c2930','#3c3842','#504b57','#68626f']},{n:'흰색',r:['#a8a097','#c9c1b6','#e4ddd2','#f6f1e8']},
];
const BOTTOMS=[{n:'바지'},{n:'치마'}];
const ACCS=[{n:'없음'},{n:'리본'},{n:'고양이 귀'},{n:'꽃핀'},{n:'바보털'},{n:'여우 가면'},{n:'머리띠'},{n:'두건'},{n:'안경'}];
const CW=22,CH=25;
const SKIN=['#ebc5a8','#f7dfc9'];
function bangY(b,i,bl){switch(b){
  case'straight':return bl;case'jag':return bl+[0,1,0,-1,0,1,0,0,1,0,-1,0,1,0,0][i];
  case'side':return[9,9,9,8,8,8,7,7,6,6,5,5,5,5,5][i];case'side2':return[8,8,7,7,7,6,6,5,5,5,4,4,4,4,4][i];
  case'center':return[9,8,8,7,6,5,5,4,5,5,6,7,8,8,9][i];case'none':return i===7?4:3;
  case'up':return[5,5,4,5,5,4,5,5,4,5,5,4,5,5,5][i];case'curl':return bl+[0,1,1,0,1,1,0,1,1,0,1,1,0,1,0][i];}return 7;}
function drawChar(L,dir,fr){
  const H=HAIRCOL[L.hc].r,O=OUTFITS[L.top].r,st=HS[HAIRS[L.hair].id],side=dir==='side',up=dir==='up',skirt=(L.bot??1)===1;
  const c=mk(CW,CH,x=>{
    const px=(ch,a,b,w=1,h=1)=>P(x,ch,a,b,w,h);const cx=11;
    const la=fr==='A'?-1:0,lb=fr==='B'?-1:0,sw=fr==='A'?1:fr==='B'?-1:0;
    // ---- 뒷머리
    if(st.back>13){for(let y=8;y<=st.back;y++){const t=(y-8)/(st.back-8);const x0=side?4+Math.round(t*1.5):5+(t>.8?1:0),x1=side?11:17-(t>.8?1:0);for(let i=x0;i<=x1;i++){if(y===st.back&&(i===x0||i===x1))continue;if(st.ragged&&y>=st.back-1&&(i%2))continue;px(H[i>=x1-1||(!side&&(i===8||i===14)&&y>13)?1:2],i,y);}}}
    if(st.tail==='twin'){for(const t of side?[-1]:[-1,1]){const tx=side?6:cx+t*8.5;fe(x,tx+(side?0:sw*.4),14.5,2.2,5.2,H[1]);fe(x,tx-.4,14,1.3,4.4,H[2]);px('#c4614f',Math.round(tx)-1,9,2,1);}}
    if(st.tail==='buns')for(const t of side?[-1]:[-1,1]){const bx=side?6:cx+t*6;fe(x,bx,2.8,2.6,2.4,H[1]);fe(x,bx-.4,2.4,1.7,1.5,H[2]);}
    if(up&&st.tail==='pony'){fe(x,cx,15,2.4,5,H[1]);fe(x,cx-.4,14.5,1.4,4,H[2]);}
    if(up&&st.tail==='small'){fe(x,cx,12.5,1.8,2.4,H[1]);fe(x,cx-.3,12,1,1.6,H[2]);}
    if(up&&st.tail==='braid')for(let y=11;y<20;y+=2){fe(x,cx,y,1.6,1.2,H[(y>>1)%2?1:2]);}
    if(side&&st.tail==='pony'){for(let k=0;k<9;k++){const a=k/8;fe(x,5-a*2+(sw*a*.6),7+a*8,2.2-a*.8,1.6,H[k%3===2?1:2]);}}
    if(side&&st.tail==='small'){fe(x,5,9,1.8,2,H[1]);}
    // ---- 몸
    const legs=(xa,xb,ya,yb)=>{px(SKIN[1],xa,20+ya,2,1);px(SKIN[1],xb,20+yb,2,1);px('#5a4033',xa,21+ya,2,1);px('#5a4033',xb,21+yb,2,1);};
    if(!side){
      for(let y=14;y<=17;y++)for(let i=8;i<=14;i++)px(O[i<10?3:i>12?1:2],i,y);
      if(skirt){for(let i=7;i<=15;i++){px(O[i<9?2:i>13?0:1],i,18);px(O[i<9?2:i>13?0:1],i,19);}legs(9,12,la,lb);}
      else{for(let y=18;y<=20;y++)for(let i=8;i<=14;i++){if(i===11&&y>18)continue;px(i<11?'#6a5a52':'#55463f',i,y+(y===20?(i<11?la:lb):0));}px('#5a4033',8,21+la,3,1);px('#5a4033',12,21+lb,3,1);}
      if(!up){px('#f6eedf',9,15,5,3);px('#e3d6c0',9,17,5,1);px('#f6eedf',9,14,1,1);px('#f6eedf',13,14,1,1);}else{px('#f6eedf',10,15,3,1);}
      for(const[ax,s]of[[7,sw],[15,-sw]]){px(O[ax<10?2:1],ax,14+Math.max(0,s),1,3);px(SKIN[1],ax,17+Math.max(0,s),1,1);}
    }else{
      for(let y=14;y<=17;y++)for(let i=9;i<=13;i++)px(O[i<10?3:i>12?1:2],i,y);
      const st2=fr==='A'?2:fr==='B'?0:1;
      if(skirt){for(let i=8;i<=14;i++){px(O[i>13?0:1],i,18);px(O[i>13?0:1],i,19);}px(SKIN[1],10-st2+1,20,2,1);px(SKIN[1],11+st2-1,20,2,1);px('#5a4033',10-st2+1,21,2,1);px('#5a4033',11+st2-1,21,3,1);}
      else{for(let y=18;y<=20;y++){px('#55463f',10-(y>18?st2-1:0),y,2,1);px('#6a5a52',11+(y>18?st2-1:0),y,2,1);}px('#5a4033',10-st2+1,21,2,1);px('#5a4033',11+st2-1,21,3,1);}
      px('#f6eedf',13,15,1,3);px(O[1],11+sw,14,2,3);px(SKIN[1],11+sw,17,2,1);
    }
    // ---- 얼굴 (점 두 개)
    const hx=side?cx+.4:cx;fe(x,hx,8,6.4,5.7,SKIN[1]);for(let i=6;i<=16;i++)if(x.getImageData(i,13,1,1).data[3])px(SKIN[0],i,13);
    if(!up){if(fr==='blink'){if(side)px('#3d2c2e',15,10,1,1);else{px('#3d2c2e',8,10,1,1);px('#3d2c2e',14,10,1,1);}}
      else if(side)px('#3d2c2e',15,9,1,2);else{px('#3d2c2e',8,9,1,2);px('#3d2c2e',14,9,1,2);}}
    // ---- 앞머리
    const capCx=side?10:cx;
    const inHead=(i,y)=>{const dx=(i+.5-capCx)/7.1,dy=(y+.5-7.4)/(up?6.1:5.7);return dx*dx+dy*dy<=1;};
    for(let y=0;y<=14;y++)for(let i=2;i<=19;i++){if(!inHead(i,y))continue;let on=false;
      if(up)on=true;
      else if(!side){const k=i-4;if(k>=0&&k<=14)on=y<=bangY(st.b,k,st.bl);if((i<=5||i>=16)&&y<=st.side)on=true;if(y<=3)on=true;}
      else{on=y<=3||i<=10||(i>=11&&y<=bangY(st.b,Math.min(14,i-4+4),st.bl)-1);if(i<=11&&y>st.side)on=false;}
      if(on)px(H[2],i,y);}
    if(!up&&!side)for(const sx of[4,5,16,17])for(let y=7;y<=st.side;y++){if(st.hime&&y>11&&(sx===5||sx===16))continue;px(H[sx>=16?1:2],sx,y);}
    if(side)for(let y=7;y<=st.side;y++)px(H[1],4,y);
    if(!up&&!side)for(let k=0;k<15;k++){const by=bangY(st.b,k,st.bl);if(by>4&&inHead(k+4,by))px(H[1],k+4,by);}
    if(st.b==='side'||st.b==='side2'){if(!side&&!up)px(H[1],14,2,1,2);}
    px(H[3],side?7:8,3,3,1);px(H[3],side?6:7,4,1,1);
    if(st.vol){for(let i=6;i<=16;i++)px(H[2],i,1);px(H[3],8,1,3,1);}
    if(st.spikes)for(const[i,h]of[[6,2],[9,3],[12,2],[15,2]]){for(let j=0;j<h;j++)px(H[2],i+(side?-1:0),1-j,2-j>0?2-j:1,1);}
    if(st.curl)for(const[a,b]of[[3,6],[3,9],[19,6],[19,9],[6,1],[11,0],[16,1]])if(!(side&&a>15)){fe(x,a+(side?-1:0),b,1.6,1.6,H[2]);}
    if(st.tail==='braid'&&!up&&!side)for(let y=11;y<19;y+=2){fe(x,5,y,1.5,1.2,H[(y>>1)%2?1:2]);}
    // ---- 장식
    const acc=L.acc;
    if(acc===1&&!(side&&false)){const rx=side?6:cx+5;fe(x,rx-1.6,2.5,1.8,1.5,'#c4614f');fe(x,rx+1.6,2.5,1.8,1.5,'#c4614f');px('#94443d',rx,2,1,2);}
    if(acc===2){const ear=(ex,d)=>{for(let j=0;j<4;j++)for(let i=0;i<4-j;i++)px(H[j<2?2:3],ex+d*i,3-j,1,1);px('#e8a9a2',ex+d,2,1,1);};if(side){ear(6,1);ear(11,-1);}else{ear(5,1);ear(17,-1);}}
    if(acc===3&&!up){const fx=side?6:cx+5,fy=6;for(const[a,b]of[[0,-1],[-1,0],[1,0],[0,1]])px('#f1bbb1',fx+a,fy+b);px('#e3bd55',fx,fy);}
    if(acc===4){const ax=side?9:cx;px(H[2],ax,0,1,2);px(H[2],ax+1,-0,1,1);px(H[2],ax+2,0,1,1);}
    if(acc===5){const mx=side?3:cx-9,my=2;fe(x,mx+2.5,my+2.5,2.6,2.4,'#f6f1e8');px('#c4614f',mx+1,my+2,1,1);px('#c4614f',mx+3,my+2,1,1);px('#f6f1e8',mx,my-1,1,2);px('#f6f1e8',mx+4,my-1,1,2);}
    if(acc===6)for(let i=4;i<=18;i++)if(inHead(i,4))px(up?'#c4614f':'#c4614f',i,4);
    if(acc===7){for(let y=0;y<=4;y++)for(let i=2;i<=19;i++)if(inHead(i,y))px(y===4?'#d8cdbb':'#f3ead9',i,y);if(!side)px('#e3d6c0',17,5,2,2);else px('#e3d6c0',3,5,2,2);}
    if(acc===8&&!up){const g='#5b4141';if(side){px(g,14,8,3,1);px(g,14,11,3,1);px(g,16,8,1,4);px(g,13,9,1,1);}else{for(const ex of[8,14]){px(g,ex-1,8,3,1);px(g,ex-1,11,3,1);px(g,ex-2,9,1,2);px(g,ex+2,9,1,2);}px(g,10,9,3,1);}}
  });
  return outline(c);
}
const charCache=new Map();
function charSprite(L,dir,fr){const key=[L.hair,L.hc,L.top,L.acc,L.bot??1,dir,fr].join(',');let s=charCache.get(key);
  if(!s){if(dir==='left')s=flipH(charSprite(L,'right',fr));else s=drawChar(L,dir==='right'?'side':dir,fr);charCache.set(key,s);}return s;}

// =====================================================================
//  혼령 손님들 — 점 눈, 볼터치
// =====================================================================
function face(x,ex1,ex2,ey,o={}){const k='#3d2c2e';if(o.closed){P(x,k,ex1-1,ey,1,1);P(x,k,ex1,ey-1,1,1);P(x,k,ex1+1,ey,1,1);P(x,k,ex2-1,ey,1,1);P(x,k,ex2,ey-1,1,1);P(x,k,ex2+1,ey,1,1);}
  else{P(x,o.eye||k,ex1,ey,1,2);P(x,o.eye||k,ex2,ey,1,2);}
  if(!o.noblush){P(x,'rgba(232,140,128,.75)',ex1-2,ey+2,2,1);P(x,'rgba(232,140,128,.75)',ex2+1,ey+2,2,1);}}
const SPIRIT_DRAW={
  fox:(x)=>{for(const[a,b,r]of[[8,6,2.2],[12,4,2.4],[16,7,2]])shadeEll(x,a,b,r,3.6,RAMP.orange,{dither:false,amb:.15});
    shadeEll(x,12,13,7,6.5,RAMP.orange,{amb:.1});shadeEll(x,12,15.5,4.4,3.2,['#f3dcc1','#f9eadb','#fff6ec'],{dither:false});
    for(const s of[-1,1]){for(let j=0;j<4;j++)P(x,RAMP.orange[3],12+s*4-(s<0?0:j)+(s<0?-j+j:0),6-j+2,j+1,1);}
    shadeEll(x,20,15,2.5,4,RAMP.orange,{ang:.5,amb:.2});face(x,9,15,12);},
  tanuki:(x)=>{shadeEll(x,8,5,2.4,2.4,RAMP.brown,{});shadeEll(x,16,5,2.4,2.4,RAMP.brown,{});shadeEll(x,12,13,8,7.4,RAMP.brown,{amb:.08});
    shadeEll(x,12,17,4.6,3.6,['#d8c1a0','#e8d6ba','#f4e8d4'],{dither:false});shadeEll(x,9,11.5,2.6,2,['#3d2f2a','#4a3a33'],{dither:false});shadeEll(x,15,11.5,2.6,2,['#3d2f2a','#4a3a33'],{dither:false});
    P(x,'#fbf5ea',9,11,1,2);P(x,'#fbf5ea',15,11,1,2);P(x,'rgba(232,140,128,.75)',6,14,2,1);P(x,'rgba(232,140,128,.75)',17,14,2,1);P(x,'#3d2c2e',12,14,1,1);
    leaf(x,12,5,6,-2.2,RAMP.crop,2);},
  umbrella:(x)=>{for(let y=0;y<10;y++){const w=Math.round(2+y*1.05);for(let i=12-w;i<=12+w;i++){const e=(i-(12-w))/(2*w);P(x,RAMP.purple[clamp(Math.floor((1-Math.abs(e-.35))*4)+(y>7?-1:0),0,4)],i,2+y);}}
    for(let i=1;i<24;i+=3)P(x,RAMP.purple[0],i,12,2,1);for(const i of[6,12,18])line(x,12,2,i,11,RAMP.purple[1]);
    face(x,9,15,7);P(x,'#c4614f',12,10,2,2);shadeCyl(x,11,13,2,7,RAMP.wood);P(x,RAMP.wood[1],9,20,6,1);P(x,RAMP.wood[0],9,21,6,1);},
  cloud:(x)=>{for(const[a,b,r]of[[7,14,4.6],[12,11,5.6],[17,14,4.6],[12,15,5]])shadeEll(x,a,b,r,r*.9,RAMP.white,{amb:.15});face(x,10,14,13);},
  oldcat:(x)=>{shadeEll(x,12,15,7,6.4,RAMP.stone,{amb:.12});for(const s of[-1,1])for(let j=0;j<4;j++)P(x,RAMP.stone[3],12+s*5-(s>0?j:0)+(s<0?0:0),7-j+3,j+1,1);
    shadeEll(x,12,11,6,5,RAMP.stone,{amb:.15});face(x,9,15,11,{closed:1});P(x,'#3d2c2e',12,13);line(x,5,13,1,12,'#837c75');line(x,19,13,23,12,'#837c75');
    for(let i=5;i<20;i++)P(x,i%2?'#8f7aa3':'#a693b6',i,16,1,4);shadeEll(x,12,20,3,1,RAMP.purple,{dither:false});},
  firefly:(x)=>{shadeEll(x,12,16,5,5,['#d9c66f','#ecd98a','#f8eaaa','#fff6d6'],{dither:false});shadeEll(x,12,10,6,5.4,RAMP.brown,{amb:.15});face(x,9,15,9,{eye:'#fbf5ea'});
    line(x,9,5,7,1,'#4a372f');line(x,15,5,17,1,'#4a372f');P(x,'#f2d77c',6,0,2,2);P(x,'#f2d77c',17,0,2,2);shadeEll(x,6,13,3,1.6,['#cfdde0','#e8f0f0'],{dither:false,ang:-.5});shadeEll(x,18,13,3,1.6,['#cfdde0','#e8f0f0'],{dither:false,ang:.5});},
  frog:(x)=>{shadeEll(x,12,15,8,6,RAMP.crop,{amb:.1});shadeEll(x,8,8.5,3,3,RAMP.crop,{});shadeEll(x,16,8.5,3,3,RAMP.crop,{});
    for(const ex of[8,16]){P(x,'#fbf5ea',ex-1,8,3,2);P(x,'#3d2c2e',ex,8,1,2);}P(x,'rgba(232,140,128,.75)',6,13,2,1);P(x,'rgba(232,140,128,.75)',17,13,2,1);line(x,10,14,14,14,'#3d2c2e');
    for(let i=0;i<9;i++)shadeEll(x,6+i*1.5,18+Math.sin(i/8*Math.PI)*1.5,.9,.9,RAMP.wood,{dither:false});},
  rabbit:(x)=>{for(const s of[-1,1]){shadeEll(x,12+s*3,5,1.8,5,RAMP.white,{ang:s*.2});P(x,'#e8a9a2',12+s*3,3,1,4);}shadeEll(x,12,14,7,6.6,RAMP.white,{amb:.12});face(x,9,15,13);P(x,'#d98f8a',12,15);},
  wisp:(x,hue)=>{const R=hue||RAMP.teal;for(const[a,b,r]of[[12,6,2.2],[10,9,3]])shadeEll(x,a,b,r,r*1.4,R,{dither:false,amb:.2});shadeEll(x,12,14,6,6,R,{amb:.15});face(x,10,14,13);},
};
const spiritCache=new Map();
function spiritSprite(kind,hue){const k=kind+(hue||'');if(!spiritCache.has(k))spiritCache.set(k,outline(mk(24,24,x=>SPIRIT_DRAW[kind](x,hue&&RAMP[hue]))));return spiritCache.get(k);}

// =====================================================================
//  실내 소품
// =====================================================================
const COUNTER_TOP=['#8f6c50','#a8835f','#bf9a72','#d4b087'];
function makeStool(){return outline(mk(16,18,x=>{shadeCyl(x,7,8,2,8,RAMP.wood);P(x,RAMP.wood[2],4,15,8,1);shadeEll(x,8,7,5.4,2.6,RAMP.red,{dither:false,flat:.5,spec:'#f0b8a6'});}));}
function makeStove(){return outline(mk(34,30,x=>{
  for(let y=10;y<30;y++)for(let i=1;i<33;i++){const brick=((y>>2)+((i+(y>>2&1)*3)>>2))&1;P(x,(y%4===0||((i+((y>>2)&1)*3)%6===0))?'#7b5444':brick?'#a8705a':'#9c6551',i,y);}
  P(x,'#a69e93',0,8,34,3);P(x,'#cdc5b8',0,8,34,1);P(x,'#3d2c2e',6,18,8,7);P(x,'#3d2c2e',20,18,8,7);
  shadeEll(x,10,6,6,4,['#2b2526','#3b3334','#4d4344','#625657'],{dither:false});P(x,'#c49c6a',6,3,8,2);P(x,'#e3bd85',7,3,6,1);
  shadeEll(x,24,5,6,4.5,RAMP.silver,{dither:false,spec:'#fff'});P(x,'#7a868b',18,2,12,1);P(x,'#3d2c2e',23,0,3,1);}));}
const FIRE=[0,1,2].map(f=>mk(8,6,x=>{P(x,'#c4614f',1,2,6,4);P(x,'#eaa96a',2,1+(f===1?-1:0)+1,4,4);P(x,'#f6d58a',3,3-(f===2?1:0),2,3);}));
function makeLadder(){return outline(mk(16,40,x=>{shadeCyl(x,2,0,2,40,RAMP.wood);shadeCyl(x,12,0,2,40,RAMP.wood);for(let y=3;y<40;y+=6){P(x,RAMP.wood[3],4,y,8,2);P(x,RAMP.wood[4],4,y,8,1);}}));}
function makeLedger(){return outline(mk(18,20,x=>{shadeCyl(x,1,8,16,12,RAMP.wood);P(x,RAMP.wood[4],1,8,16,1);P(x,'#f3e6cf',3,4,6,5);P(x,'#f3e6cf',9,4,6,5);P(x,'#c3bbae',8,4,2,5);
  for(let k=0;k<3;k++){P(x,'#a49c90',4,5+k*1.4|0,4,1);P(x,'#a49c90',10,5+k*1.4|0,4,1);}P(x,'#94443d',13,2,1,4);}));}
function makePlant(seed){const r=rng(seed);return outline(mk(16,24,x=>{shadeCyl(x,4,15,8,8,['#8f4b36','#a8603f','#c47f50','#d9a066']);P(x,'#b06440',3,14,10,2);P(x,'#e9c28a',3,14,10,1);
  for(let k=0;k<7;k++)leaf(x,8,15,5+r()*5,-Math.PI/2+(r()-.5)*2.4,RAMP.leaf,2);}));}
function makeTable(){return outline(mk(32,22,x=>{shadeCyl(x,4,10,2,10,RAMP.wood);shadeCyl(x,26,10,2,10,RAMP.wood);shadeEll(x,16,8,15,5,COUNTER_TOP,{flat:.3});
  shadeEll(x,11,7,2.4,1.6,RAMP.white,{dither:false});shadeEll(x,20,8,2,1.4,RAMP.teal,{dither:false});P(x,'#86a35a',20,4,1,3);}));}

function makeWell(){return outline(mk(20,30,x=>{shadeCyl(x,3,6,2,18,RAMP.wood);shadeCyl(x,15,6,2,18,RAMP.wood);
  for(let i=0;i<20;i++){const t=Math.abs(i-9.5)/10;P(x,RAMP.roof[clamp(Math.round(3-t*2+(i%3===0?-1:0)),0,5)],i,2+Math.round(t*3),1,4);}
  P(x,RAMP.wood[1],4,9,12,1);shadeEll(x,10,22,8,3,RAMP.stone,{flat:.4});shadeCyl(x,2,22,16,6,RAMP.stone);shadeEll(x,10,21.5,6,2,['#3e5f63','#4f777a'],{dither:false});
  P(x,RAMP.wood[3],8,12,4,4);P(x,RAMP.wood[4],8,12,4,1);P(x,'#cdc5b8',9,10,1,2);}));}
const PLANK=mk(16,16,x=>{P(x,'rgba(40,60,60,.35)',0,14,16,3);for(let i=0;i<16;i+=4){shadeCyl(x,i,0,4,14,RAMP.wood,.05);P(x,RAMP.wood[0],i,0,1,14);}P(x,RAMP.wood[1],0,13,16,1);P(x,RAMP.wood[0],1,4,1,1);P(x,RAMP.wood[0],9,10,1,1);});
