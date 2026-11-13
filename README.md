# Tidemark

기분·수면을 10초 만에 기록하는 개인용 웹앱(PWA). 서버 없이 기기 안에만 기록을 저장합니다.
진단 도구가 아니라 기록을 위한 참고용입니다.

아이폰 사파리로 열어 "홈 화면에 추가"해서 씁니다.

## 구조

```
mood/
  index.html            화면 틀
  app.css               디자인 (다크·라이트, 색, 글씨 크기는 변수로)
  sw.js                 오프라인 저장
  js/
    main.js             시작점: 누르기·입력 처리
    views/              화면별 (today, trend, insight, record, settings)
    store.js            저장 (localStorage) · analysis.js 신호·인사이트 계산
    i18n.js             한국어/영어 · theme.js 색·글씨 · meds.js 약 · files.js 백업·캘린더
  tests/smoke.js        자동 확인 (node mood/tests/smoke.js)
```

작업 규칙은 `CLAUDE.md`에 있습니다.
