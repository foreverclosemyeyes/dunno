'use strict';
// =====================================================================
//  소리 — 사인파 마림바, 걸러낸 잡음, 종소리. 날카로운 사각파는 쓰지 않는다
// =====================================================================
const AU={ctx:null,master:null,music:true,mT:0,step:0,note:5,rain:null,noise:null,verb:null};
function initAudio(){
  if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume();return;}
  try{AU.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  const a=AU.ctx;AU.master=a.createGain();AU.master.gain.value=.55;
  const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;AU.master.connect(lp);lp.connect(a.destination);
  // 짧은 잔향
  const len=a.sampleRate*1.6,ir=a.createBuffer(2,len,a.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
  AU.verb=a.createConvolver();AU.verb.buffer=ir;const vg=a.createGain();vg.gain.value=.22;AU.verb.connect(vg);vg.connect(AU.master);
  const nb=a.createBuffer(1,a.sampleRate*2,a.sampleRate),nd=nb.getChannelData(0);let last=0;for(let i=0;i<nd.length;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;nd[i]=w*.6+last*3;}AU.noise=nb;
  const src=a.createBufferSource();src.buffer=nb;src.loop=true;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=900;AU.rain=a.createGain();AU.rain.gain.value=0;src.connect(f);f.connect(AU.rain);AU.rain.connect(AU.master);src.start();
  AU.mT=a.currentTime+.2;
}
function env(g,t,a,peak,dur){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
function voice(freq,dur,o={}){
  const a=AU.ctx;if(!a)return;const t=a.currentTime+(o.at||0);
  const g=a.createGain();env(g,t,o.att||.005,o.vol||.12,dur);g.connect(AU.master);if(o.verb!==false){const s=a.createGain();s.gain.value=.6;g.connect(s);s.connect(AU.verb);}
  const parts=o.parts||[[1,1]];
  for(const[mul,amp]of parts){const os=a.createOscillator(),og=a.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(freq*mul,t);
    if(o.slide)os.frequency.exponentialRampToValueAtTime(freq*mul*o.slide,t+dur*.8);og.gain.value=amp;os.connect(og);og.connect(g);os.start(t);os.stop(t+dur+.05);}
}
function hiss(dur,freq,o={}){
  const a=AU.ctx;if(!a||!AU.noise)return;const t=a.currentTime+(o.at||0);const s=a.createBufferSource();s.buffer=AU.noise;
  const f=a.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(freq,t);if(o.sweep)f.frequency.exponentialRampToValueAtTime(freq*o.sweep,t+dur);f.Q.value=o.q||1;
  const g=a.createGain();env(g,t,o.att||.01,o.vol||.1,dur);s.connect(f);f.connect(g);g.connect(AU.master);s.start(t,Math.random());s.stop(t+dur+.05);
}
const MARIMBA=[[1,1],[4,.25],[10,.05]];
const BELL=[[1,1],[2.76,.4],[5.4,.2],[8.9,.08]];
const mf=n=>440*Math.pow(2,(n-69)/12);
const SFX={
  step:()=>hiss(.05,500,{vol:.025,q:.6}),
  till:()=>{hiss(.14,380,{vol:.16,type:'lowpass'});voice(110,.12,{vol:.06,slide:.7,verb:false});},
  water:()=>{hiss(.4,1800,{vol:.05,q:.4,sweep:.6});for(let i=0;i<4;i++)voice(900+Math.random()*700,.06,{vol:.015,at:i*.06+Math.random()*.03,slide:1.6});},
  fill:()=>{hiss(.6,500,{vol:.08,sweep:2.5});voice(300,.5,{vol:.03,slide:2});},
  plant:()=>{voice(mf(74),.25,{parts:MARIMBA,vol:.08});voice(mf(79),.3,{parts:MARIMBA,vol:.07,at:.07});},
  harvest:()=>[72,76,79,84].forEach((n,i)=>voice(mf(n),.35,{parts:MARIMBA,vol:.08,at:i*.06})),
  pick:()=>{voice(mf(79),.15,{parts:MARIMBA,vol:.06});},
  weed:()=>{hiss(.12,1200,{vol:.07});},
  coin:()=>{voice(mf(84),.25,{parts:BELL,vol:.05});voice(mf(91),.4,{parts:BELL,vol:.05,at:.08});},
  open:()=>voice(mf(76),.18,{parts:MARIMBA,vol:.06}),
  close:()=>voice(mf(71),.15,{parts:MARIMBA,vol:.05}),
  talk:()=>voice(mf(67+Math.floor(Math.random()*5)),.06,{vol:.025,parts:[[1,1],[2,.3]],verb:false}),
  bad:()=>{voice(mf(57),.2,{vol:.05,type:'triangle'});voice(mf(56),.25,{vol:.04,type:'triangle',at:.08});},
  charge:(p)=>voice(300+p*500,.06,{vol:.02,verb:false}),
  cast:()=>{hiss(.3,2400,{vol:.05,sweep:.3});},
  plop:()=>{voice(500,.12,{vol:.07,slide:.5});hiss(.15,700,{vol:.05});},
  nibble:()=>voice(1200,.05,{vol:.03,slide:.8}),
  bite:()=>{hiss(.25,600,{vol:.12,type:'lowpass'});voice(mf(88),.2,{parts:BELL,vol:.06});},
  reel:()=>hiss(.04,2500,{vol:.02,q:3}),
  snap:()=>{voice(800,.15,{vol:.06,slide:.3,type:'triangle'});},
  catch:()=>[67,72,76,79,84].forEach((n,i)=>voice(mf(n),.5,{parts:MARIMBA,vol:.08,at:i*.07})),
  chop:()=>{hiss(.05,2400,{vol:.12,q:2});voice(180,.05,{vol:.05,verb:false});},
  chopbad:()=>{hiss(.08,700,{vol:.08});},
  sizzle:()=>hiss(.5,4200,{vol:.04,q:.5,type:'highpass'}),
  bubble:()=>voice(220+Math.random()*200,.08,{vol:.03,slide:2.2,verb:false}),
  shake:()=>hiss(.07,5200,{vol:.05,q:2}),
  flip:()=>{hiss(.08,1500,{vol:.06});voice(400,.06,{vol:.03,slide:1.5});},
  drop:()=>voice(mf(79),.2,{parts:MARIMBA,vol:.07}),
  good:()=>[79,84].forEach((n,i)=>voice(mf(n),.3,{parts:MARIMBA,vol:.07,at:i*.07})),
  reveal:()=>[72,76,79,83,88].forEach((n,i)=>voice(mf(n),.8,{parts:BELL,vol:.05,at:i*.09})),
  lantern:()=>{[60,67,72,76,79,84,88].forEach((n,i)=>voice(mf(n),1.4,{parts:BELL,vol:.05,at:i*.12}));},
  chime:()=>[84,88,91].forEach((n,i)=>voice(mf(n),1.2,{parts:BELL,vol:.035,at:i*.15})),
  door:()=>{hiss(.25,300,{vol:.08});voice(mf(79),.6,{parts:BELL,vol:.03,at:.1});},
};
function sfx(n,a){if(AU.ctx&&SFX[n])SFX[n](a);}
// 배경음: 낮은 느릿한 오음계 마림바, 밤은 더 성기고 종소리
const PROG=[[57,64,69,72],[53,60,65,69],[55,62,67,71],[52,59,64,67]];
const PENTA=[0,2,4,7,9,12,14,16,19,21,24];
function musicTick(night){
  const a=AU.ctx;if(!a||!AU.music)return;const beat=60/(night?62:74)/2;
  while(AU.mT<a.currentTime+.4){const bar=(AU.step>>3)%4,b=AU.step%8,ch=PROG[bar],at=AU.mT-a.currentTime;
    if(b===0){voice(mf(ch[0]-12),beat*7,{vol:.05,type:'triangle',att:.05,at,verb:true});voice(mf(ch[2]),beat*6,{vol:.012,type:'sine',att:.3,at});voice(mf(ch[3]),beat*6,{vol:.01,type:'sine',att:.3,at});}
    if(b===4)voice(mf(ch[1]-12),beat*3,{vol:.03,type:'triangle',att:.05,at});
    const play=night?(b%2===0&&Math.random()<.5):(Math.random()<.55&&b!==7);
    if(play){AU.note=clamp(AU.note+[-2,-1,-1,0,1,1,2][Math.random()*7|0],0,PENTA.length-1);voice(mf(60+PENTA[AU.note]+(night?0:0)),beat*2.2,{parts:night?BELL:MARIMBA,vol:night?.022:.035,at});}
    AU.mT+=beat;AU.step++;}
}
