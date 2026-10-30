'use strict';
// =====================================================================
//  화면 UI (DOM) — HUD, 대화창, 창, 캐릭터 만들기
// =====================================================================
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const urlCache=new Map();
function curl(cv){if(!cv)return'';let u=urlCache.get(cv);if(!u){u=cv.toDataURL();urlCache.set(cv,u);}return u;}
function iconOf(id){if(!id)return null;if(id.startsWith('d_'))return DISHICON[id.slice(2)];return IC[id];}
function nameOf(id){if(id==='fish_small')return'생선(붕어·은어·산천어)';if(id.startsWith('d_'))return DISHES[id.slice(2)].n;return ITEMS[id]?ITEMS[id].n:id;}
const img=(id,cls='')=>`<img class="px ${cls}" src="${curl(iconOf(id)||IC.radish)}" alt="">`;
const stars=n=>'<span class="stars">'+'★'.repeat(n)+'<i>'+'★'.repeat(3-n)+'</i></span>';

// ---------------- 토스트 ----------------
function toast(msg,id){const box=$('toasts');const el=document.createElement('div');el.className='toast paper';
  el.innerHTML=(id?img(id):'')+'<span></span>';el.querySelector('span').textContent=msg;box.prepend(el);
  while(box.children.length>3)box.lastChild.remove();setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400);},2600);}

// ---------------- 대화 ----------------
const DLG={q:[],cur:null,shown:0,t:0,done:null,open:false};
function dialog(lines,done){DLG.q=lines.slice();DLG.done=done||null;DLG.open=true;$('dlg').hidden=false;nextLine();}
function nextLine(){
  if(!DLG.q.length){DLG.open=false;$('dlg').hidden=true;const d=DLG.done;DLG.done=null;if(d)d();return;}
  DLG.cur=DLG.q.shift();DLG.shown=0;DLG.t=0;
  $('dlgname').textContent=DLG.cur.who||'';$('dlgname').hidden=!DLG.cur.who;
  const pc=$('dlgpic');if(DLG.cur.pic){pc.hidden=false;const x=pc.getContext('2d');x.clearRect(0,0,pc.width,pc.height);x.imageSmoothingEnabled=false;const s=DLG.cur.pic;
    const sc=Math.floor(Math.min(pc.width/s.width,pc.height/s.height));x.drawImage(s,(pc.width-s.width*sc)/2,(pc.height-s.height*sc)/2+(DLG.cur.picDy||0),s.width*sc,s.height*sc);}else pc.hidden=true;
  $('dlgtext').textContent='';
}
function dialogTick(dt){if(!DLG.open||!DLG.cur)return;const full=DLG.cur.text;if(DLG.shown<full.length){DLG.t+=dt*38;const n=Math.min(full.length,Math.floor(DLG.t));
  if(n>DLG.shown){if(DLG.cur.who&&n%3===0)sfx('talk');DLG.shown=n;$('dlgtext').textContent=full.slice(0,n);}}
  $('dlgmore').style.visibility=DLG.shown>=full.length?'visible':'hidden';}
function dialogPress(){if(!DLG.cur)return;if(DLG.shown<DLG.cur.text.length){DLG.shown=DLG.cur.text.length;$('dlgtext').textContent=DLG.cur.text;}else nextLine();}
$('dlg').addEventListener('pointerdown',e=>{e.preventDefault();dialogPress();});

// ---------------- 창 ----------------
const PANEL={open:false,kind:'',onClose:null};
function openPanel(kind,title,sub,body,foot,onClose){
  PANEL.open=true;PANEL.kind=kind;PANEL.onClose=onClose||null;$('veil').hidden=false;
  $('panel').innerHTML=`<div class="phead"><div><h2>${title}</h2>${sub?`<p class="sub">${sub}</p>`:''}</div><button class="x" type="button" aria-label="닫기">✕</button></div><div class="pbody">${body}</div>${foot?`<div class="pfoot">${foot}</div>`:''}`;
  $('panel').querySelector('.x').onclick=closePanel;sfx('open');
}
function closePanel(){if(!PANEL.open)return;PANEL.open=false;$('veil').hidden=true;sfx('close');const f=PANEL.onClose;PANEL.onClose=null;PANEL.kind='';if(f)f();}
$('veil').addEventListener('pointerdown',e=>{if(e.target.id==='veil')closePanel();});
const on=(sel,fn)=>$('panel').querySelectorAll(sel).forEach(el=>el.onclick=()=>fn(el));

// ---------------- HUD ----------------
let hudKey='';
function timeStr(m){const h=Math.floor(m/60)%24,mm=Math.floor(m%60/10)*10;return`${h<12?'오전':'오후'} ${h%12||12}:${String(mm).padStart(2,'0')}`;}
function refreshHud(){
  const key=[S.day,Math.floor(S.min/10),S.weather,S.gold,S.spiritIdx,S.water,S.seed,S.seed&&cnt(S.seed)].join('|');if(key===hudKey)return;hudKey=key;
  $('hday').textContent=`${S.day}일째`;$('htime').textContent=timeStr(S.min);
  const night=S.min>=18*60;$('hwx').textContent=S.weather==='rain'?'비':night?'밤':'맑음';
  $('hgold').textContent=S.gold.toLocaleString();
  let l='';for(let i=0;i<8;i++)l+=`<img class="px" src="${curl(i<S.spiritIdx?IC.lanternOn:IC.lanternOff)}" alt="">`;$('hlan').innerHTML=l;
  $('hseed').innerHTML=S.seed&&cnt(S.seed)?`${img(S.seed)}<b>${cnt(S.seed)}</b>`:`<span class="none">씨앗<br>없음</span>`;
  $('hcan').innerHTML=`${img('can')}<i><u style="height:${S.water/canMax()*100}%"></u></i>`;
}
function setHint(label){const h=$('hint');if(label){h.hidden=false;if(h.dataset.l!==label){h.dataset.l=label;$('hintl').textContent=label;}}else h.hidden=true;}

// ---------------- 바구니(가방) ----------------
function openBasket(tab){
  tab=tab||'bag';
  const tabs=`<div class="tabs">${[['bag','바구니'],['recipe','요리 수첩'],['guest','손님 수첩'],['fish','물고기 도감']].map(([k,n])=>`<button type="button" class="tab${k===tab?' on':''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
  let body=tabs;
  if(tab==='bag'){
    const groups=[['요리',k=>k.startsWith('d_')],['채소',k=>ITEMS[k]&&ITEMS[k].kind==='veg'],['물고기',k=>ITEMS[k]&&ITEMS[k].kind==='fish'],['씨앗',k=>ITEMS[k]&&ITEMS[k].kind==='seed']];
    let any=false;
    for(const[g,f]of groups){const ks=Object.keys(S.inv).filter(f).filter(k=>cnt(k)>0);if(!ks.length)continue;any=true;body+=`<h3>${g}</h3><div class="items">`;
      for(const k of ks){const a=S.inv[k];const q=ITEMS[k]&&ITEMS[k].kind==='seed'?'':[3,2,1].filter(s=>a[s-1]).map(s=>`<span class="q">${'★'.repeat(s)}×${a[s-1]}</span>`).join(' ');
        body+=`<div class="item${k===S.seed?' sel':''}" ${ITEMS[k]&&ITEMS[k].kind==='seed'?`data-seed="${k}"`:''}>${img(k)}<div><b>${nameOf(k)}</b> ×${cnt(k)}<div class="ds">${q||(ITEMS[k].kind==='seed'?'눌러서 뿌릴 씨앗으로 고르기':'')}</div></div></div>`;}
      body+='</div>';}
    if(!any)body+='<p class="empty">바구니가 비었어요. 밭과 호수, 숲에서 재료를 모아 보세요.</p>';
  }else if(tab==='recipe'){
    body+='<div class="rlist">';for(const k of S.recipes){const d=DISHES[k];const best=S.dishLog[k];
      body+=`<div class="rcard"><img class="px big" src="${curl(DISHART[k])}" alt=""><div><b>${d.n}</b>${best?stars(best):''}<div class="ds">${d.d}</div><div class="need">${needHtml(d)}</div><div class="ds">과정: ${d.steps.map(s=>STEPNAME[s]).join(' → ')}</div></div></div>`;}
    body+='</div>';
  }else if(tab==='guest'){
    body+='<div class="glist">';SPIRITS.forEach((sp,i)=>{const met=i<S.spiritIdx||(i===S.spiritIdx&&S.metCur);
      body+=`<div class="gcard${i<S.spiritIdx?' lit':''}"><img class="px" src="${curl(met?spiritSprite(sp.kind):IC.lanternOff)}" alt=""><div>`+(met?`<b>${sp.n}</b> <span class="ds">${sp.title}</span><div class="ds">“${sp.hint}”</div>${i<S.spiritIdx?`<div class="okk">등불이 되었어요 · ${DISHES[sp.dish].n}</div>`:'<div class="wait">아직 그 맛을 찾는 중…</div>'}`:`<b>???</b><div class="ds">아직 만나지 못한 손님</div>`)+'</div></div>';});
    body+='</div>';
  }else{
    body+='<div class="flist">';for(const k of FISHKEYS){const j=S.journal[k];body+=`<div class="fcard${j?'':' unk'}">${j?img(k):'<span class="qm">?</span>'}<b>${j?ITEMS[k].n:'???'}</b><span class="ds">${j?`${j.n}마리 · 최대 ${j.best}cm`:''}</span></div>`;}
    body+='</div>';
  }
  openPanel('basket','바구니','',body,`<span class="ds">등불 ${S.spiritIdx}/8 · 낚은 물고기 ${S.stats.fish} · 수확 ${S.stats.harvest} · 요리 ${S.stats.cook}</span><span class="row"><button type="button" id="bMus" class="ghost">${AU.music?'음악 끄기':'음악 켜기'}</button><button type="button" id="bSave">저장</button></span>`);
  on('[data-tab]',el=>openBasket(el.dataset.tab));
  on('[data-seed]',el=>{S.seed=el.dataset.seed;hudKey='';openBasket('bag');});
  $('bSave').onclick=()=>{save();toast('저장했어요.');};
  $('bMus').onclick=()=>{AU.music=!AU.music;if(AU.ctx)AU.mT=AU.ctx.currentTime+.1;openBasket(tab);};
}
function needHtml(d){return Object.entries(d.need).map(([k,n])=>{const h=cnt(k);return`<span class="nd${h<n?' no':''}">${k==='fish_small'?img('f_crucian'):img(k)}${k==='fish_small'?'생선':nameOf(k)} ${h}/${n}</span>`;}).join('');}

// ---------------- 장부 (씨앗 주문) ----------------
function openLedger(){
  let body='<p class="sub2">할머니가 쓰던 주문 장부. 적어 두면 아침 배달꾼 까치가 바로 가져다줘요.</p><div class="rows">';
  for(const k of S.seedsAvail){const it=ITEMS[k],c=CROPS[it.crop];
    body+=`<div class="row">${img(k)}<div class="info"><b>${it.n}</b><div class="ds">${c.days}일이면 다 자라요${c.regrow?` · 수확 뒤 ${c.regrow}일마다 또 열림`:''}</div></div><div class="pr">${it.price}냥</div>
      <div class="btns"><button type="button" data-buy="${k}" data-n="1" ${S.gold<it.price?'disabled':''}>1</button><button type="button" data-buy="${k}" data-n="5" ${S.gold<it.price*5?'disabled':''}>5</button></div></div>`;}
  body+='</div>';
  openPanel('ledger','주문 장부','',body,`<span>가진 돈 <b>${S.gold.toLocaleString()}냥</b></span>`);
  on('[data-buy]',el=>{const k=el.dataset.buy,n=+el.dataset.n,c=ITEMS[k].price*n;if(S.gold<c)return;S.gold-=c;addInv(k,1,n);if(!S.seed||!cnt(S.seed))S.seed=k;sfx('coin');hudKey='';openLedger();});
}

// ---------------- 요리 고르기 ----------------
function canMake(k){const d=DISHES[k];return Object.entries(d.need).every(([i,n])=>cnt(i)>=n);}
function openCookPick(title,sub,onPick,guest){
  let body='<div class="rows">';
  for(const k of S.recipes){const d=DISHES[k],have=cnt('d_'+k),ok=canMake(k);
    body+=`<div class="row${ok||have?'':' off'}"><img class="px mid" src="${curl(DISHICON[k])}" alt=""><div class="info"><b>${d.n}</b>${have?` <span class="have">만들어 둔 것 ${have}</span>`:''}<div class="need">${needHtml(d)}</div></div>
      <div class="btns">${guest&&have?`<button type="button" data-serve="${k}">내기</button>`:''}<button type="button" data-cook="${k}" ${ok?'':'disabled'}>만들기</button></div></div>`;}
  body+='</div>';
  openPanel('cookpick',title,sub,body,'');
  on('[data-cook]',el=>{const k=el.dataset.cook;closePanel();onPick(k,'cook');});
  on('[data-serve]',el=>{const k=el.dataset.serve;closePanel();onPick(k,'serve');});
}

// ---------------- 캐릭터 만들기 ----------------
let creatorLook={hair:1,hc:2,top:0,acc:1},creatorDir=0;
function openCreator(done){
  $('title').hidden=true;$('creator').hidden=false;
  const rows=[['hair','머리 모양',HAIRS.map(h=>h.n)],['hc','머리 색',HAIRCOL.map(h=>h.n)],['top','옷 색',OUTFITS.map(h=>h.n)],['acc','장식',ACCS.map(h=>h.n)]];
  let h='';for(const[k,n,opts]of rows){h+=`<div class="crow"><span class="cl">${n}</span><div class="chips">`;
    opts.forEach((o,i)=>{const sw=k==='hc'?`<i style="background:${HAIRCOL[i].r[3]}"></i>`:k==='top'?`<i style="background:${OUTFITS[i].r[2]}"></i>`:'';h+=`<button type="button" class="chip" data-k="${k}" data-v="${i}">${sw}${o}</button>`;});h+='</div></div>';}
  $('copts').innerHTML=h;
  const sync=()=>{$('copts').querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',creatorLook[b.dataset.k]===+b.dataset.v));};
  $('copts').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{creatorLook[b.dataset.k]=+b.dataset.v;sync();sfx('pick');});sync();
  $('crot').onclick=()=>{creatorDir=(creatorDir+1)%4;};
  $('crand').onclick=()=>{creatorLook={hair:Math.random()*HAIRS.length|0,hc:Math.random()*HAIRCOL.length|0,top:Math.random()*OUTFITS.length|0,acc:Math.random()*ACCS.length|0};sync();sfx('pick');};
  $('cgo').onclick=()=>{const nm=$('cname').value.trim()||'사장님';$('creator').hidden=true;done(nm,Object.assign({},creatorLook));};
}
function drawCreatorPreview(t){const cv=$('cprev');if(!cv||$('creator').hidden)return;const x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,cv.width,cv.height);
  const dir=['down','right','up','left'][creatorDir],fr=Math.floor(t*2.2)%8===0?'blink':(Math.floor(t*4)%4===1?'A':Math.floor(t*4)%4===3?'B':'idle');
  const s=charSprite(creatorLook,dir,dir==='up'&&fr==='blink'?'idle':fr);const sc=Math.floor(cv.height/CH);
  x.fillStyle='rgba(61,44,46,.18)';x.beginPath();x.ellipse(cv.width/2,cv.height-sc*2.5,sc*7,sc*2,0,0,7);x.fill();
  x.drawImage(s,(cv.width-CW*sc)/2,cv.height-CH*sc-sc,CW*sc,CH*sc);}
