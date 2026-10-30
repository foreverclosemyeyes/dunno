'use strict';
// =====================================================================
//  요리 그림 (64×48) — 윤기, 김, 건더기까지
// =====================================================================
const DW=64,DH=48;
const R2={
  pot:['#231c1b','#2f2523','#3d302c','#4f3e37','#634e44','#7a6254'],
  miso:['#7d5130','#966239','#ad7543','#c48b52','#d7a466','#e6bf86'],
  redsoup:['#6a231d','#862c22','#a23a28','#ba5132','#cc6c42','#dc8c5a'],
  pumpkinsoup:['#a8652a','#c27c34','#d69343','#e5ab5a','#efc27a','#f7dca6'],
  crust:['#5f3620','#7d4a2a','#9c6136','#b97c47','#d29a5e','#e8bd85'],
  glaze:['#5c3019','#7a4222','#99582d','#b5713b','#cf8f50','#e8b572'],
  egg:['#b07f2a','#c99636','#dcae48','#e9c462','#f3d888','#fcedbf'],
  rice:['#cfc6b4','#e0d8c6','#ede7d8','#f7f3e9','#fffdf7'],
  sponge:['#c99a58','#dcb170','#e9c78c','#f3dcab'],
  cream:['#d9d0c2','#ebe4d8','#f6f1e8','#fffdf8'],
  berry:['#8a2a2a','#a83a35','#c4503f','#d86c55','#e98d74','#f4b6a0'],
  plate:['#b9b2a6','#d2cbbf','#e6e0d5','#f3eee5','#fffcf6'],
  steel:['#3a3b40','#4b4d53','#5f6268','#777a80','#91959a'],
  gold:['#8a5d1f','#ab792a','#c99a38','#e0b74e','#efd172','#fbeaa9'],
};
function dsh(x,cx,cy,rx,ry,a=.28){x.fillStyle=`rgba(61,44,46,${a})`;x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,7);x.fill();}
// 평평한 국물 표면: 뒤쪽은 그늘, 앞쪽은 밝게 + 반사광
function liquid(x,cx,cy,rx,ry,ramp,seed=1){const r=rng(seed);
  for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let i=Math.floor(cx-rx);i<=cx+rx;i++){const dx=(i+.5-cx)/rx,dy=(y+.5-cy)/ry;if(dx*dx+dy*dy>1)continue;
    let L=.35+dy*.35-dx*.1+(fbm(i*.25,y*.4,seed)-.5)*.35;L=clamp(L+(BAYER[(y&3)*4+(i&3)]-.5)*.18,0,.999);P(x,ramp[Math.floor(L*(ramp.length-1))],i,y);}
  for(let k=0;k<3;k++){const a=cx-rx*.5+r()*rx*.3,b=cy-ry*.1+k*1.4;P(x,'rgba(255,248,235,.55)',Math.round(a),Math.round(b),3+(r()*3|0),1);}
}
function ttukbaegi(x,cx,cy,rx,ry,depth){
  for(let y=0;y<=depth;y++){const t=y/depth;const w=rx*(1-t*t*.18);for(let i=Math.round(cx-w);i<=Math.round(cx+w);i++){const nx=(i-cx)/w;let L=-nx*.45+.45+(1-t)*.15;L+=(hash(i,y,9)-.5)*.12;P(x,R2.pot[clamp(Math.floor(L*6),0,5)],i,cy+y);}}
  shadeEll(x,cx,cy,rx,ry,R2.pot,{flat:.25,amb:.05});
  for(let k=0;k<30;k++)P(x,'rgba(140,110,95,.5)',cx-rx+hash(k,1)*rx*2|0,cy+2+hash(k,2)*depth|0);
  return [cx,cy+.5,rx-2.6,ry-1.8];
}
function whiteBowl(x,cx,cy,rx,ry,depth,band='#6e8fb0'){
  P(x,R2.plate[1],cx-rx*.35,cy+depth,rx*.7,2);
  for(let y=0;y<depth;y++){const t=y/depth;const w=rx*Math.sqrt(1-t*t*.75);for(let i=Math.round(cx-w);i<=Math.round(cx+w);i++){const nx=(i-cx)/w;let L=-nx*.45+.5-t*.12;P(x,R2.plate[clamp(Math.floor(L*5),0,4)],i,cy+y);}
    if(y===3||y===5){for(let i=Math.round(cx-w)+1;i<Math.round(cx+w);i++)if(y===3||(i%4))P(x,band,i,cy+y);}}
  shadeEll(x,cx,cy,rx,ry,R2.plate,{flat:.2,dither:false,amb:.1});
  return [cx,cy+.3,rx-1.6,ry-1.2];
}
function plate(x,cx,cy,rx,ry,rim='#6e8fb0'){
  shadeEll(x,cx,cy+1.5,rx,ry,R2.plate,{flat:.2,dither:false,amb:-.05});shadeEll(x,cx,cy,rx,ry,R2.plate,{flat:.15,dither:false,amb:.1});
  x.strokeStyle=rim;x.lineWidth=1;x.beginPath();x.ellipse(cx,cy,rx-2,ry-1.3,0,0,7);x.stroke();
  shadeEll(x,cx,cy+.5,rx-4,ry-2.6,R2.plate,{flat:.1,dither:false,amb:.05});
}
function cube(x,cx,cy,s,top,side){P(x,side,cx,cy+1,s,s);P(x,top,cx,cy,s,Math.max(1,s-1));P(x,'rgba(255,255,255,.55)',cx,cy,1,1);}
function onionRing(x,cx,cy){P(x,'#7ea35a',cx,cy,2,2);P(x,'#c4dc9a',cx,cy,1,1);}
function spec(x,a,b){P(x,'rgba(255,252,240,.9)',a,b,1,1);}

const DISH_ART={
  doenjang(x){dsh(x,32,40,26,6);shadeEll(x,32,39,26,5,RAMP.wood,{flat:.3});
    const[l1,l2,l3,l4]=ttukbaegi(x,32,22,23,8,15);liquid(x,l1,l2,l3,l4,R2.miso,3);
    for(let k=0;k<7;k++)P(x,'rgba(232,200,150,.6)',l1-14+hash(k,4)*28|0,l2-4+hash(k,5)*7|0,2,1);
    for(const[a,b]of[[22,20],[28,23],[35,19],[40,22],[31,25],[25,24]])cube(x,a,b,3,'#f3eddc','#d9d1bc');
    for(const[a,b]of[[19,23],[37,25],[43,21]])cube(x,a,b,3,'#efe3c7','#d8c8a6');
    for(const[a,b]of[[26,19],[33,22],[39,19],[23,22],[36,24],[29,20],[45,22]])onionRing(x,a,b);
    for(const[a,b]of[[30,18],[42,24]]){P(x,'rgba(255,240,215,.7)',a,b,2,1);}},
  maeun(x){dsh(x,32,40,26,6);shadeEll(x,32,39,26,5,RAMP.wood,{flat:.3});
    const[l1,l2,l3,l4]=ttukbaegi(x,32,22,23,8,15);liquid(x,l1,l2,l3,l4,R2.redsoup,8);
    for(let k=0;k<10;k++)P(x,'rgba(240,150,80,.6)',l1-15+hash(k,6)*30|0,l2-4+hash(k,7)*8|0,2,1);
    for(const[a,b]of[[24,19],[36,21]]){shadeEll(x,a,b,4,2.3,R2.cream,{dither:false});P(x,'#6b4a3a',a-4,b,8,1);}
    for(const[a,b]of[[30,23],[41,20]])cube(x,a,b,4,'#efe6d0','#cfc2a6');
    for(const[a,b]of[[20,23],[33,19],[44,23],[27,25],[38,25]])onionRing(x,a,b);
    for(const[a,b]of[[28,21],[39,24],[22,21]]){P(x,'#c9302a',a,b,2,1);P(x,'#e8b84a',a+1,b,1,1);}
    for(const[a,b]of[[34,24],[25,22]])spec(x,a,b);},
  grill(x){dsh(x,32,41,28,5);
    shadeEll(x,32,36,29,6,R2.plate,{flat:.15,dither:false});P(x,'#e6e0d5',5,30,54,8);P(x,'#f3eee5',6,30,52,2);P(x,'#6e8fb0',7,32,50,1);
    // 생선
    for(let i=0;i<8;i++){const s=i*.6+1;P(x,R2.crust[2+(i>4?1:0)],8+i,28-s,1,s*2);}
    shadeEll(x,30,28,16,5.6,R2.crust,{spec:'#fbe0b0'});shadeEll(x,31,30.5,13,2.4,['#d9b383','#e8cba0','#f3dfbd'],{dither:false});
    for(const a of[20,26,32,38])line(x,a,24,a+3,31,'#4f2c1c');P(x,R2.crust[1],24,22,12,1);
    P(x,'#fbf5ea',42,26,2,2);P(x,'#3d2c2e',43,26,1,1);
    shadeEll(x,51,33,5,3,R2.rice,{spec:'#fff'});P(x,'#7a4a32',51,31,2,1);
    leaf(x,49,27,8,-.3,RAMP.crop,3);shadeEll(x,11,33,3.6,2.4,R2.egg,{dither:false});P(x,'#fff6c8',10,32,2,1);},
  jorim(x){dsh(x,32,41,27,6);plate(x,32,32,27,10,'#8f6c50');
    shadeEll(x,32,33,18,6,R2.glaze,{flat:.2,amb:-.15});
    const pts=[[22,30],[30,28],[38,29],[26,34],[34,33],[42,33],[18,33],[31,36],[39,36]];
    for(const[a,b]of pts){shadeEll(x,a,b,4.2,3.4,R2.glaze,{dither:false,spec:'#fff1d0'});P(x,'rgba(255,240,210,.7)',a-2,b-2,2,1);}
    for(let k=0;k<12;k++)P(x,'#fbf5ea',18+hash(k,3)*28|0,27+hash(k,4)*10|0);
    for(const[a,b]of[[25,29],[36,31],[29,33]])P(x,'#86a35a',a,b,2,1);},
  omurice(x){dsh(x,32,42,28,5);plate(x,32,34,28,10);
    shadeEll(x,45,31,6,3,RAMP.crop,{dither:false});shadeEll(x,47,33,2,2,R2.berry,{dither:false,spec:'#fff'});
    shadeEll(x,29,30,17,9,R2.egg,{spec:'#fffbe4'});P(x,'rgba(180,120,40,.35)',13,33,32,2);
    const heart=[[0,1,1,0,1,1,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]];
    heart.forEach((row,j)=>row.forEach((v,i)=>{if(v)P(x,j<1?'#d8574a':'#bd3b33',26+i,23+j);}));P(x,'#f2a08f',27,24,1,1);P(x,'#f2a08f',30,24,1,1);
    for(const[a,b]of[[16,27],[18,26]])P(x,'#86a35a',a,b,2,1);},
  soup(x){dsh(x,32,42,24,5);
    const[l1,l2,l3,l4]=whiteBowl(x,32,24,24,8,15);liquid(x,l1,l2,l3,l4,R2.pumpkinsoup,4);
    x.strokeStyle='#fbf3e3';x.lineWidth=1;x.beginPath();for(let a=0;a<9;a+=.15){const r=a*.75;x.lineTo(32+Math.cos(a)*r*1.6,24+Math.sin(a)*r*.5);}x.stroke();
    for(const[a,b]of[[22,22],[41,25],[38,20]])cube(x,a,b,3,'#e8bd85','#b98d68');for(const[a,b]of[[28,21],[36,26],[44,22],[24,26]])P(x,'#6a8f49',a,b,2,1);},
  sotbap(x){dsh(x,32,42,26,6);
    shadeEll(x,50,15,11,4,RAMP.wood,{flat:.3,ang:-.5});P(x,RAMP.wood[1],48,13,5,2);
    const[l1,l2,l3,l4]=ttukbaegi(x,32,24,22,8,13);
    for(let y=Math.floor(l2-l4);y<=l2+l4;y++)for(let i=Math.floor(l1-l3);i<=l1+l3;i++){const dx=(i+.5-l1)/l3,dy=(y+.5-l2)/l4;if(dx*dx+dy*dy>1)continue;P(x,R2.rice[clamp(Math.floor((.5+dy*.35+(hash(i,y,2)-.5)*.6)*5),0,4)],i,y);}
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2,rx2=l3*.55,ry2=l4*.5;const px2=l1+Math.cos(a)*rx2,py2=l2+Math.sin(a)*ry2;shadeEll(x,px2,py2,3,1.8,R2.crust,{dither:false,spec:'#f6dcb0'});}
    shadeEll(x,l1,l2,2.6,1.6,R2.egg,{dither:false});for(const[a,b]of[[26,22],[38,26],[33,21]])onionRing(x,a,b);},
  cake(x){dsh(x,30,43,22,4);plate(x,30,37,22,7);
    const fx=14,fy=24,fw=26,fh=13;
    for(let j=0;j<fh;j++){const layer=j<3?'c':j<6?'s':j<8?'c2':j<11?'s':'c';for(let i=0;i<fw;i++){let ch;
      if(layer==='c'||layer==='c2')ch=R2.cream[i<3?1:2+(hash(i,j)<.3?1:0)];else ch=R2.sponge[(hash(i,j,4)*3|0)+(i<2?0:0)];P(x,ch,fx+i,fy+j);}}
    for(const a of[17,24,31])for(const[dx,dy,ch]of[[0,0,'#c4503f'],[1,0,'#d86c55'],[2,0,'#c4503f'],[0,1,'#a83a35'],[1,1,'#f4d6c8'],[2,1,'#a83a35']])P(x,ch,a+dx,fy+6+dy,1,1);
    for(let j=1;j<=6;j++)for(let i=0;i<fw;i++)P(x,R2.cream[2+(hash(i,j,8)<.25?1:0)+(j===6?-1:0)],fx+i+j,fy-j);
    for(let j=0;j<fh;j++)for(let i=1;i<=6;i++){if(i>j+6)continue;P(x,j<3||j===6||j===7||j>10?R2.cream[1]:R2.sponge[1],fx+fw+i-1,fy+j-i+1);}
    for(const a of[19,36])shadeEll(x,a,19,2.8,2,R2.cream,{dither:false});shadeEll(x,28,16,4.2,4.8,R2.berry,{spec:'#ffe2d6'});for(const[a,b]of[[27,16],[30,17],[28,19]])P(x,'#f4e6a6',a,b);leaf(x,28,12,4,-2.4,RAMP.crop,1.6);leaf(x,28,12,4,-.8,RAMP.crop,1.6);
    line(x,48,30,56,40,'#a69e93');line(x,49,30,57,40,'#cdc5b8');},
  ayu(x){dsh(x,32,41,28,5);shadeEll(x,32,36,29,6,R2.plate,{flat:.15,dither:false});P(x,'#e6e0d5',5,30,54,8);P(x,'#f3eee5',6,30,52,2);P(x,'#86a35a',7,32,50,1);
    line(x,6,38,58,18,'#c5a382');line(x,6,39,58,19,'#9a7356');
    for(let k=0;k<26;k++){const t=k/25;const a=12+t*36,b=31-t*10+Math.sin(t*Math.PI)*-3;shadeEll(x,a,b,2.6+Math.sin(t*Math.PI)*2.4,2.4+Math.sin(t*Math.PI)*1.6,['#5b6157','#727a6c','#8e9584','#b5a678','#d6c08e','#efe2bd'],{dither:false});}
    for(let k=0;k<14;k++)P(x,'#fbf5ea',10+hash(k,9)*40|0,20+hash(k,8)*14|0);P(x,'#fbf5ea',45,20,2,2);P(x,'#3d2c2e',46,20,1,1);
    shadeEll(x,50,34,4,2.5,R2.egg,{dither:false});},
  goldfish(x){dsh(x,32,42,29,6);plate(x,32,34,29,10,'#c99a38');
    shadeEll(x,32,34,22,6,['#7a3e1c','#9a5326','#b86b32','#cf8743'],{flat:.2,amb:-.1});
    for(let i=0;i<9;i++){const s=i*.7+1;P(x,R2.gold[2],9+i,31-s,1,s*2);}
    shadeEll(x,31,31,15,6.4,R2.gold,{spec:'#fffbe0'});for(let k=0;k<12;k++)P(x,'#f6dc8a',22+(k%4)*4+((k>>2)&1)*2,28+(k>>2)*2,2,1);
    P(x,'#fbf5ea',42,29,2,2);P(x,'#3d2c2e',43,29,1,1);
    for(const[a,b]of[[18,37],[45,37],[48,32]]){shadeEll(x,a,b,3,2.2,R2.pumpkinsoup,{dither:false,spec:'#fff1d0'});}
    for(const[a,b]of[[26,26],[34,25],[38,27]])P(x,'#86a35a',a,b,2,1);for(const[a,b]of[[14,24],[50,26],[30,22]])P(x,'#fff6c8',a,b);},
};
const DISHART={},DISHICON={};
function buildDishArt(){for(const k in DISH_ART){DISHART[k]=outline(mk(DW,DH,DISH_ART[k]));
  const s=mk(22,17,x=>{x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(DISHART[k],0,0,22,17);});
  const d=s.getContext('2d').getImageData(0,0,22,17);for(let p=3;p<d.data.length;p+=4)d.data[p]=d.data[p]>120?255:0;s.getContext('2d').putImageData(d,0,0);
  DISHICON[k]=outline(mk(24,19,x=>x.drawImage(s,1,1)));}}

// =====================================================================
//  손질할 재료 (썰기 화면용 큰 그림)
// =====================================================================
const BIGING={
  radish:x=>{for(let i=0;i<40;i++){const t=i/39;const r=7.5-Math.pow(t,2.2)*6;shadeEll(x,10+i,15,1.2,r,t<.18?['#9fb27a','#bccb96','#d6ddb6','#e9ecd8']:RAMP.white,{dither:false});}
    for(const a of[-2.8,-3.2,-2.5])leaf(x,10,14,10,a,RAMP.crop,3);},
  potato:x=>{shadeEll(x,17,15,11,8,RAMP.brown,{spec:'#e6cfa8',amb:.08});shadeEll(x,36,16,9,7,RAMP.brown,{spec:'#e6cfa8',amb:.08});for(const[a,b]of[[13,12],[20,17],[34,14],[39,19]])P(x,RAMP.brown[1],a,b);},
  carrot:x=>{for(let i=0;i<40;i++){const t=i/39;shadeEll(x,10+i,15,1.2,6-t*5,RAMP.orange,{dither:false});if(i%6===3)P(x,RAMP.orange[1],10+i,12+(i%4),2,1);}for(const a of[-2.8,-3.3,-2.4])leaf(x,10,15,9,a,RAMP.crop,2);},
  pumpkin:x=>{shadeEll(x,27,15,17,11,['#2e4229','#3b5534','#4c6b40','#628450','#7c9c63'],{spec:'#a3b97a'});for(const dx of[-9,-3,3,9])for(let y=6;y<25;y++)if(Math.abs(dx)<15)P(x,'#33492d',27+dx+Math.round(Math.sin(y*.3)*.6),y);P(x,RAMP.wood[1],26,2,3,4);},
  strawberry:x=>{for(const a of[12,26,40]){shadeEll(x,a,16,6,7,R2.berry,{spec:'#ffe2d6'});for(let k=0;k<6;k++)P(x,'#f4e6a6',a-3+hash(k,a)*6|0,13+hash(a,k)*7|0);leaf(x,a,9,4,-2.4,RAMP.crop,1.6);leaf(x,a,9,4,-.8,RAMP.crop,1.6);}},
  mushroom:x=>{for(const[a,s]of[[13,1],[28,1.1],[42,.9]]){shadeCyl(x,a-2,15,4,8,RAMP.white);shadeEll(x,a,14,8*s,4.6*s,RAMP.brown,{spec:'#e6c9a2'});for(let k=0;k<4;k++)P(x,'#e6d2b2',a-5+k*3,12+(k&1));}},
  onion:x=>{for(let i=0;i<44;i++){const t=i/43;const ch=t<.35?['#cfc6b4','#e6dfcf','#f7f2e6']:t<.45?['#9fb27a','#c6d6a1','#dde7c4']:['#476a3a','#5d8546','#77a052'];shadeEll(x,6+i,15,1.2,3.4,ch,{dither:false});}},
  f_catfish:x=>{x.drawImage(fishArt(50,22,FISHRAMP.f_catfish[0],FISHRAMP.f_catfish[1]),0,4);},
};
const BIGINGART={};function buildBigIng(){for(const k in BIGING)BIGINGART[k]=outline(mk(54,30,BIGING[k]));}
