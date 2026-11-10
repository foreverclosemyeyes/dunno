// 화면 확인용 가짜 데이터 (DIARY_DEMO=1 로 실행할 때만 사용). 실제 노션 내용 아님.
'use strict';
module.exports = function demo(today) {
  const d = new Date(today + 'T00:00:00');
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const day = (i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return iso(x); };
  const add = (n) => { const x = new Date(d); x.setDate(d.getDate() + n); return iso(x); };
  let id = 0;
  const t = (text, checked, children = []) => ({ id: 'd' + id++, text, checked, children });
  const prevMon = new Date(mon); prevMon.setDate(mon.getDate() - 7);
  const pday = (i) => { const x = new Date(prevMon); x.setDate(prevMon.getDate() + i); return iso(x); };
  return {
    quests: [
      { id: 'q1', url: 'https://www.notion.so/demo1', name: '분기 비용 정산 보고서', status: '진행중', start: add(-10), end: add(-2) },
      { id: 'q2', url: 'https://www.notion.so/demo2', name: '사무실 계약 갱신 검토', status: '진행중', start: add(-3), end: add(2) },
      { id: 'q3', url: 'https://www.notion.so/demo3', name: '연말 행사 준비', status: '시작 전', start: add(1), end: add(20) },
      { id: 'q4', url: 'https://www.notion.so/demo4', name: '복리후생 안내 문서화', status: '시작 전', start: null, end: null },
    ],
    weeks: [
      { id: 'w0', url: 'https://www.notion.so/w0', name: '지난주 운영성 업무', start: pday(0), end: pday(4), days: {
        [pday(0)]: [t('주간 회의 준비', true), t('비품 주문', true)], [pday(1)]: [t('뉴스 큐레이션', true)],
        [pday(2)]: [t('뉴스 큐레이션', true), t('계약서 검토', true)], [pday(3)]: [t('뉴스 큐레이션', true)], [pday(4)]: [t('주간 보고', true), t('정산', false)] } },
      { id: 'w1', url: 'https://www.notion.so/w1', name: '이번 주 운영성 업무', start: day(0), end: day(4), days: {
        [day(0)]: [t('뉴스 큐레이션', true), t('온보딩 자료 전달', true), t('조직도 수정', true)],
        [day(1)]: [t('커피 주문', true), t('전체 회의 진행', true), t('지원금 이체 요청', true, [t('증빙 제출', true)]),
          t('계정 비밀번호 요청', true, [t('계정 백업', false)]), t('근로계약서 기본 정보 전달', false), t('점심 일정 조율', false)],
        [day(2)]: [t('지원사업 리서치', false), t('뉴스 큐레이션', false), t('정기 행사 문의', false, [t('계약서 작성 확인', false), t('드라이브 권한 요청', false)])],
        [day(3)]: [t('뉴스 큐레이션', false)], [day(4)]: [t('뉴스 큐레이션', false)] } },
    ],
  };
};
