# 업무다이어리 (Work Diary)

노션 `경영지원_Tasks` DB를 읽어 와서 (체크박스는 앱에서 눌러도 노션에 반영) 오늘의 체크리스트·진행 중 퀘스트를 보여 주는 Electron 데스크탑 앱.
**설치·사용법은 [사용설명서.md](사용설명서.md)** 를 보세요.

## 구조
```
main/main.js       창·트레이·자동 실행·알림·2분 동기화·자정 넘김·정시 비서
main/notion.js     노션 API (data source 쿼리, 블록 트리 읽기, 체크리스트 파싱)
main/assistant.js  Claude Haiku 5.5 비서: 정시 체크 + 앱 안 대화 (키 없으면 규칙 기반 문장)
main/secrets.js    API 키 암호화 저장 (Electron safeStorage → Mac 키체인)
main/preload.js    화면에 노출하는 안전한 기능 목록
renderer/          화면 (HTML/CSS/JS, 번들러 없음)
  js/defaults.js   기본 꾸밈값
  js/theme.js      꾸밈값 → CSS / 배경 반영
  js/fonts.js      글씨체 (내장·시스템·업로드, 가변 글씨체 판별)
  js/settings.js   설정 패널 (실행 취소, 테마 저장/내보내기)
test/parse.test.js 실제 페이지 구조를 본뜬 블록으로 파싱 테스트
```

## 노션 페이지 구조 (2026-11 실제 페이지에서 확인)
`callout(인라인 DB)` → `column_list` → `column` → `heading "11/10 (화)"` + `to_do` (+ 하위 `to_do`).
제목을 읽지 못하면(예: API가 지원하지 않는 블록) 칼럼 순서대로 월~금을 배정합니다.

## 개발
```
npm install
npm start                 # 실행
DIARY_DEMO=1 npm start    # 노션 없이 가짜 데이터로 화면 확인
npm test
```
설치 파일은 `.github/workflows/build-diary.yml` 이 GitHub Actions에서 만듭니다 (Mac arm64/x64 .dmg, Windows .exe).
