# 화면 구현 하네스 — 오케스트레이터 규칙

이 대화(메인)는 오케스트레이터다. **직접 구현하지 않는다.**
에이전트를 부르고, 게이트 스크립트를 돌리고, 결과를 사람에게 보여 주고, 통과한 단계만 커밋한다.

## 절대 규칙
1. 메인은 `app/`, `harness/spec/`, `harness/pages/`, `harness/report/`, `docs/`, `reference/`에 Write·Edit하지 않는다. (훅이 막는다)
2. 디자인 값의 SSOT는 `docs/tokens.json` 하나다. 토큰 밖의 값은 어떤 파일에도 쓰지 않는다.
3. PRD에 없는 값(라벨·숫자·문구)은 지어내지 않는다. `harness/spec/open-questions.md`에 질문으로 남긴다.
4. 게이트가 종료 코드 0이 아니면 커밋하지 않고, 다음 단계로 넘어가지 않는다.
5. 같은 게이트가 같은 화면에서 3번 연속 실패하면(스크립트가 `STOP`을 출력, 종료 코드 3) 멈추고, 실패 근거 3회분을 사람에게 보여 준다.
6. 하네스 파일(`.claude/`, `scripts/`, `CLAUDE.md`, `harness/rules.json`)은 사람이 "하네스 수정: <내용>"이라고 말하고 변경안을 승인했을 때만 고친다.
7. 사람은 `open-questions.md`의 `답:` 칸만 채운다. 그 밖의 산출물을 고쳐야 하면 해당 단계로 되돌린다.

## 문서 우선순위
화면 내용·동작: PRD.md > 디자인 값: tokens.json > 컴포넌트 사용법: Design.md > screens.md > reference/
(이미 정한 것: 포함 혜택 = List/Row(check), /complete에서 나가는 목적지 = /plans)

## 파이프라인
| 단계 | 실행 | 출력 | 게이트 | 커밋 |
|---|---|---|---|---|
| S1 | `spec-writer` 에이전트 | harness/spec/spec.json, open-questions.md | `node scripts/gate-spec.mjs` (G1) | `[S1]` |
| S2 | `page-planner` 에이전트 | harness/pages/pages.json | `node scripts/gate-pages.mjs` (G2) | `[S2]` |
| S3 | `node scripts/gen-tokens.mjs` → `node scripts/scaffold-app.mjs` → `npm install --prefix app` | app/src/styles/tokens.css, app/ 뼈대, app/src/router.gen.tsx | `node scripts/gate-tokens.mjs` (G3) | `[S3]` |
| S4 | `page-builder` 에이전트, 화면 1개씩: /plans → /plans/[id] → /apply → /complete | app/src/pages/** | `node scripts/gate-screen.mjs <라우트>` (G5·G6·G7) | `[S4:<라우트>]` |
| S5 | `node scripts/gate-all.mjs` → `judge` 에이전트가 리포트 해설 → 사람 승인(G8) | harness/report/report.json, screens/*.png | G1~G7 전부 + 사람 승인 | `[S5]` |

G4(토큰 밖 값·외부 UI 라이브러리·금지 폴더 쓰기 차단)는 훅(`scripts/hooks/guard.mjs`)으로 상시 동작한다.

## 실패 시 복귀
게이트 출력의 `복귀:` 값(report의 `returnTo`)을 그대로 따른다. 메인이 원인을 따로 추측하지 않는다.
- S1: spec이 PRD와 다름 / A·B·C 실패 원인이 spec 데이터 누락
- S2: 화면에 필요한 컴포넌트·상태·이동·계약 마커가 pages.json에 없음
- S3: tokens.css 해시 불일치, 라우터 불일치, node_modules 없음 (스크립트 재실행)
- S4:<라우트>: 토큰 밖 값, A·B·C 위반, PRD O/X 위반, build·lint 실패 (해당 화면만)

에이전트를 다시 부를 때는 `harness/report/gates/*.json`에서 해당 실패 항목만 잘라 전달한다.

## 어기면 안 되는 것 (G7 ★, 판정 기준은 harness/rules.json)
- A: 화면에 보이는 금액은 2개 이하, p01·p02·p04는 1개, Original 속성 0건, "25개월째부터"는 p03에서만
- B: p03에 "소진 후 5Mbps로 제한", p04에 "속도 제한 없음"이 카드와 상세에 각각 1개씩
- C: /complete에 신청자 이름 원문 0건, 이름은 첫 글자 + `*` 형식, 휴대폰 번호 표시 0건

## 부르는 말
- 시작: `harness/run-<날짜>` 브랜치를 만들고 하네스 파일을 `[S0] 하네스 설치`로 커밋한 뒤 S1부터 진행
- 이어서: `node scripts/resume.mjs` 결과에 나온 다음 단계부터 진행
- 검증: `node scripts/gate-screen.mjs`(라우트 없이 = 앱 전체 G5~G7)를 실행하고 요약해서 보여 줌
- 승인: `[S5]` 커밋. 판정 보류가 남아 있으면 `[S5] 부분 완료 (보류: #8, #15 …)`로 커밋하고 "부분 완료"로 보고
- 반려: <화면> <이유>: S4의 그 화면으로 복귀 (이유에 "PRD"가 들어가면 S1로 복귀)
- 답변 반영: open-questions.md를 읽고 영향받는 단계부터 다시 진행

## 사람 승인(G8)에서 보여 줄 것
1. harness/report/screens/의 390px 스크린샷 4장
2. 게이트별 통과 여부와 판정 보류 항목 (judge 해설)
3. open-questions.md의 남은 질문

## 하지 않는 것
push, 원격 작업, `docs/`·`reference/` 수정, prd-checker 호출, 앱 코드 직접 작성
