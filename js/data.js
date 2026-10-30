'use strict';
// =====================================================================
//  데이터 — 재료, 요리, 물고기, 혼령 손님 이야기
// =====================================================================
const CROPS={
  radish:{n:'무',days:3,item:'radish',seed:'s_radish'},
  potato:{n:'감자',days:4,item:'potato',seed:'s_potato'},
  onion:{n:'대파',days:3,item:'onion',seed:'s_onion',regrow:2},
  carrot:{n:'당근',days:4,item:'carrot',seed:'s_carrot'},
  pumpkin:{n:'단호박',days:6,item:'pumpkin',seed:'s_pumpkin'},
  strawberry:{n:'딸기',days:5,item:'strawberry',seed:'s_strawberry',regrow:3},
};
const ITEMS={
  s_radish:{n:'무 씨앗',kind:'seed',crop:'radish',price:20},
  s_potato:{n:'씨감자',kind:'seed',crop:'potato',price:30},
  s_onion:{n:'대파 씨앗',kind:'seed',crop:'onion',price:25},
  s_carrot:{n:'당근 씨앗',kind:'seed',crop:'carrot',price:30},
  s_pumpkin:{n:'단호박 씨앗',kind:'seed',crop:'pumpkin',price:55},
  s_strawberry:{n:'딸기 모종',kind:'seed',crop:'strawberry',price:60},
  radish:{n:'무',kind:'veg',d:'시원하고 단단한 가을무.'},
  potato:{n:'감자',kind:'veg',d:'포슬포슬하게 익는 감자.'},
  onion:{n:'대파',kind:'veg',d:'국물 맛을 살려주는 대파. 베어도 다시 자라요.'},
  carrot:{n:'당근',kind:'veg',d:'달큰한 당근.'},
  pumpkin:{n:'단호박',kind:'veg',d:'껍질은 초록, 속은 진한 노랑.'},
  strawberry:{n:'딸기',kind:'veg',d:'새콤달콤한 딸기. 따도 다시 열려요.'},
  mushroom:{n:'표고버섯',kind:'veg',d:'숲 나무 아래에서 하루에 몇 개씩 자라요.'},
  f_crucian:{n:'붕어',kind:'fish',d:'호수와 개울 어디서나.'},
  f_sweet:{n:'은어',kind:'fish',d:'맑은 개울에 사는 날렵한 물고기. 수박 향이 나요.'},
  f_trout:{n:'산천어',kind:'fish',d:'개울 상류, 오전에 잘 문다.'},
  f_catfish:{n:'메기',kind:'fish',d:'비 오는 날이나 밤에 호수 바닥에서 올라와요.'},
  f_cray:{n:'가재',kind:'fish',d:'작은 그림자는 대개 이 녀석.'},
  f_gold:{n:'황금잉어',kind:'fish',d:'선착장 끝 깊은 물의 전설.'},
};
const FISHKEYS=['f_crucian','f_sweet','f_trout','f_catfish','f_cray','f_gold'];
// 그림자 크기: 1 작음 2 보통 3 큼
const FISH={
  f_crucian:{size:2,where:['lake','river'],w:40,len:[14,30],pull:.9,stam:3.2},
  f_sweet:{size:1,where:['river'],w:34,len:[12,22],pull:1.1,stam:2.6},
  f_trout:{size:2,where:['river'],w:22,len:[20,36],pull:1.35,stam:3.8,am:1},
  f_catfish:{size:3,where:['lake'],w:16,len:[35,70],pull:1.6,stam:5,wet:1},
  f_cray:{size:1,where:['lake','river'],w:22,len:[7,13],pull:.6,stam:1.8},
  f_gold:{size:3,where:['deep'],w:5,len:[55,90],pull:2.5,stam:8.5},
};
const DISHES={
  doenjang:{n:'무 된장국',need:{radish:1},steps:['chop','heat','season','plate'],ing:'radish',val:90,garnish:'onion',
    d:'구수한 된장에 네모난 무가 퐁당. 기본 중의 기본.'},
  grill:{n:'생선구이',need:{fish_small:1},steps:['grill','season','plate'],val:110,
    d:'붕어·은어·산천어 아무거나 한 마리를 노릇하게.'},
  jorim:{n:'감자조림',need:{potato:2},steps:['chop','heat','plate'],ing:'potato',val:120,garnish:'sesame',
    d:'간장에 졸여 윤기가 반질반질.'},
  omurice:{n:'오므라이스',need:{carrot:1,onion:1},steps:['chop','heat','plate'],ing:'carrot',val:180,garnish:'heart',
    d:'노란 달걀 이불 위에 케첩 하트.'},
  sotbap:{n:'버섯 솥밥',need:{mushroom:2},steps:['chop','heat','plate'],ing:'mushroom',val:170,garnish:'onion',
    d:'버섯 향이 밴 갓 지은 솥밥.'},
  soup:{n:'단호박 수프',need:{pumpkin:1},steps:['chop','heat','plate'],ing:'pumpkin',val:200,garnish:'cream',
    d:'곱게 간 단호박에 크림 한 바퀴.'},
  maeun:{n:'메기 매운탕',need:{f_catfish:1,radish:1,onion:1},steps:['chop','heat','season','plate'],ing:'f_catfish',val:320,garnish:'onion',
    d:'얼큰하고 칼칼한 국물.'},
  cake:{n:'딸기 쇼트케이크',need:{strawberry:2},steps:['chop','plate'],ing:'strawberry',val:260,garnish:'berry',
    d:'폭신한 시트 사이사이 딸기.'},
  ayu:{n:'은어 소금구이',need:{f_sweet:1},steps:['season','grill','plate'],val:150,
    d:'굵은 소금을 뿌려 통째로 굽는다.'},
  goldfish:{n:'황금잉어찜',need:{f_gold:1,pumpkin:1},steps:['chop','grill','heat','plate'],ing:'pumpkin',val:900,garnish:'onion',
    d:'호수의 전설을 단호박과 함께 쪄낸 잔치 요리.'},
};
const FISH_SMALL=['f_crucian','f_sweet','f_trout'];
const STEPNAME={chop:'썰기',heat:'불 조절',season:'간 맞추기',grill:'굽기',plate:'담기'};

// 혼령 손님 이야기 — 순서대로 한 명씩 찾아온다
const SPIRITS=[
  {id:'kong',n:'콩이',kind:'fox',title:'꼬마 여우불',dish:'doenjang',
    intro:['…킁킁. 여기서 따뜻한 냄새가 나.','나 너무 배고파. 근데… 뭘 먹고 싶었는지 기억이 잘 안 나.'],
    hint:'구수한 냄새가 나는 국이었어. 하얗고 네모난 게 퐁당퐁당 들어 있었고.',
    ok:['…이거야. 엄마가 끓여주던 바로 그 맛.','배 속이 따뜻해졌어. 이제 길을 알 것 같아. 고마워, 사장님!'],
    wrong:'맛있어! 근데 이 맛은 아니야. 국물이 있었던 것 같은데…',
    reward:{seeds:['s_onion','s_carrot'],recipes:['omurice'],text:'대파·당근 씨앗을 살 수 있게 됐고, 오므라이스 만드는 법을 배웠어요.'}},
  {id:'doto',n:'도토',kind:'tanuki',title:'너구리 혼령',dish:'grill',
    intro:['흠흠, 사장 새로 왔다며? 나 도토. 이 동네 터줏대감이지.','옛날에 개울가 할아버지가 나눠주던 게 있었는데 말이야…'],
    hint:'강에서 온 녀석을 통째로 바삭하게. 소금 톡톡 뿌려서.',
    ok:['그래 이거! 껍질이 바삭바삭한 거!','할아버지 낚싯대가 아직 창고에 있을 거야. 선물이야, 가져가.'],
    wrong:'으음 맛은 좋은데… 내가 말한 건 강에서 온 거라고!',
    reward:{rod:1,recipes:['sotbap'],text:'튼튼한 대나무 낚싯대를 받았어요 (줄이 덜 팽팽해져요). 버섯 솥밥 레시피도 배웠어요.'}},
  {id:'bibi',n:'비비',kind:'umbrella',title:'우산 요괴',dish:'jorim',
    intro:['비 오는 날 버려진 우산이야. 히히, 놀랐지?','주인이 도시락에 꼭 싸오던 반찬이 있었는데…'],
    hint:'동글동글하고, 갈색으로 반질반질 윤이 났어. 달고 짭짤했지.',
    ok:['반질반질 동글동글… 맞아, 이거였어!','주인 도시락 냄새가 나. 이제 쉬어도 되겠다. 히히.'],
    wrong:'우와 맛있다. 근데 반질반질한 게 아니잖아~',
    reward:{seeds:['s_pumpkin'],recipes:['soup'],can:1,text:'단호박 씨앗과 단호박 수프 레시피, 그리고 한 번에 세 칸 물 주는 큰 물뿌리개를 받았어요.'}},
  {id:'mong',n:'몽실',kind:'cloud',title:'아기 구름',dish:'omurice',
    intro:['몽실몽실~ 하늘에서 맛있는 냄새 따라 내려왔어!','나 그거 먹고 싶어! 이름이… 이름이 뭐였더라!'],
    hint:'노란 이불을 덮은 밥! 그 위에 빨간 하트가 있었어!',
    ok:['노란 이불! 빨간 하트! 꺄아~','이거 먹고 비 많이 내려줄게. 밭에 물 안 줘도 되게!'],
    wrong:'맛있어~ 근데 노란 이불이 없어!',
    reward:{seeds:['s_strawberry'],recipes:['maeun'],rain:1,text:'딸기 모종을 살 수 있게 됐고, 메기 매운탕 레시피를 배웠어요. 앞으로 비가 조금 더 자주 와요.'}},
  {id:'halme',n:'할매냥',kind:'oldcat',title:'늙은 고양이 혼령',dish:'maeun',
    intro:['…이 집 할멈은 잘 있나 모르겠구먼.','추운 밤엔 늘 그걸 끓여줬지. 냥.'],
    hint:'비 오는 밤엔 얼큰한 게 최고지. 수염 달린 녀석이 들어간 걸로. 무하고 파도 듬뿍.',
    ok:['크으… 이 칼칼함. 할멈 솜씨 그대로구먼.','네 할멈한테 전해다오. 고마웠다고. 냥.'],
    wrong:'맛은 있는데, 수염 달린 놈이 안 들었잖니.',
    reward:{recipes:['cake','ayu'],text:'딸기 쇼트케이크, 은어 소금구이 레시피를 배웠어요.'}},
  {id:'bandi',n:'반디',kind:'firefly',title:'반딧불 아이',dish:'soup',
    intro:['빛이 자꾸 꺼져… 몸이 차가워.','뭔가 따뜻하고 노오란 게 먹고 싶어.'],
    hint:'노오랗고 부드러운 수프. 하얀 크림이 동그랗게 그려져 있었어.',
    ok:['몸이 따뜻해… 빛이 돌아왔어!','이제 친구들한테 돌아갈래. 호숫가를 환하게 비춰줄게.'],
    wrong:'고마워… 근데 아직 빛이 안 돌아와.',
    reward:{recipes:['goldfish'],text:'황금잉어찜 레시피를 배웠어요. 선착장 끝 깊은 물에서 황금빛 그림자를 찾아보세요.'}},
  {id:'gaegul',n:'개굴스님',kind:'frog',title:'개구리 스님',dish:'sotbap',
    intro:['개굴. 산에서 수행하다 내려왔소.','산 공양간에서 먹던 밥이 그리워서.'],
    hint:'숲 나무 아래 나는 향긋한 것을 얹어, 무쇠솥에 지은 밥이오.',
    ok:['개굴… 이 향, 이 누룽지. 공양간 그대로요.','이제 미련이 없소. 나무아미타불 개굴.'],
    wrong:'정성은 고맙소만, 숲의 향이 안 나오.',
    reward:{text:'스님이 식당에 풍경을 달아줬어요. 바람이 불면 맑은 소리가 나요.'}},
  {id:'haru',n:'하루',kind:'rabbit',title:'하얀 토끼',dish:'cake',
    intro:['오늘 내 생일이었는데… 아무도 기억 못 해.','생일엔 원래 그걸 먹어야 하잖아.'],
    hint:'하얀 구름 같은 위에 빨간 보석이 올라간 거. 자르면 층층이 예뻐.',
    ok:['생일 축하해, 하루야… 라고 말해줄래?','고마워. 이제 마지막 등불이 될게. 다 같이 하늘을 밝히자!'],
    wrong:'달콤하지만… 생일엔 그게 아니야.',
    reward:{text:'호숫가의 등불 여덟 개가 모두 켜졌어요!'}},
];
const WISP_HUES=['teal','pink','gold','purple'];
const WISP_NAMES=['반딧불 손님','길 잃은 도깨비불','작은 바람 정령','이슬 요정'];
// 레시피 → 등장하는 그림자 크기, 장소
const START_RECIPES=['doenjang','grill','jorim'];
const START_SEEDS=['s_radish','s_potato'];
