# Open Questions (S1)

PRD에서 "확인 필요"가 적힌 줄과, PRD에 값이 없어 화면을 만들 수 없는 항목을 모았다. `답:`은 사람만 채운다.

## Q1. 필터 칩 라벨과 데이터량 구간 경계값
- 근거: PRD:L85, PRD:L272
- 영향: /plans, O/X #8
- 답: 데이터량 칩: 라벨 "10GB 이하", 조건 data_gb ≤ 10 / 속도 제한 칩: 라벨 "속도 제한 없음", 조건 throttle_mbps가 없음(무제한) / 칩 순서: '전체', '10GB 이하', '속도 제한 없음'

## Q2. 요금제 상세 기본 제공 항목의 그 밖의 행 (통화·문자 등)
- 근거: PRD:L115
- 영향: /plans/[id]
- 답: (기본값·사람 위임 2026-10-14) 통화·문자 등 그 밖의 행은 표시하지 않는다. 기본 제공 항목은 기본 데이터량, 소진 후 속도 2행만 둔다. (reference 화면의 통화·문자 값은 PRD 요금제 p01~p04 데이터에 없어 쓰지 않음)

## Q3. 포함 혜택(List/Row check) 내용과 섹션 제목
- 근거: PRD:L119, PRD:L275
- 영향: /plans/[id] (혜택이 없으면 섹션 전체 숨김)
- 답: (기본값·사람 위임 2026-10-14) p01~p04 모두 표시할 혜택 없음으로 보고, PRD 기본 상태대로 섹션 제목을 포함해 섹션 전체를 숨긴다. 나중에 혜택이 생기면 쓸 섹션 제목은 "포함 혜택"(screens.md·reference 문구).

## Q4. 개인정보 보관 기간
- 근거: PRD:L153, PRD:L276
- 영향: /apply ('내용 보기')
- 답: (기본값·사람 위임 2026-10-14) Supabase에 저장한다(연결값이 없으면 브라우저 메모리). 보관 기간은 정하지 않았고 '내용 보기'에 보관 기간 줄은 표시하지 않는다. — 정책 확인 필요

## Q5. 만 14세 미만 사용자의 처리 방식
- 근거: PRD:L154, PRD:L276
- 영향: /apply
- 답: (기본값·사람 위임 2026-10-14) 연령 확인·법정대리인 동의 화면을 추가하지 않고, '내용 보기'에도 관련 문구를 표시하지 않는다. — 정책 확인 필요

## Q6. 저장 응답을 기다리는 최대 시간
- 근거: PRD:L159, PRD:L277
- 영향: /apply, O/X #15
- 답: (기본값·사람 위임 2026-10-14) 별도 시간 제한을 두지 않는다. 저장소는 Supabase(Q9)이므로 저장 함수가 끝나거나 실패할 때까지 기다리고, 실패 시 PRD 저장 실패 처리를 따른다.

## Q7. 저장 실패 오류 영역 컴포넌트 (Design.md에 해당 컴포넌트 없음, Variant 추가 여부)
- 근거: PRD:L169
- 영향: /apply, O/X #14
- 답: (기본값·사람 위임 2026-10-14) 새 컴포넌트·Variant를 추가하지 않는다. '신청하기' 버튼 위에 오류 문구를 텍스트 한 줄로 표시하고 색은 Design.md `text/error` 토큰을 쓴다.

## Q8. `/apply`에서 `/complete`로 신청 값을 넘기는 방식
- 근거: PRD:L179, PRD:L277
- 영향: /apply, /complete, O/X #7, #12
- 답: (사람 결정 2026-10-14) 앱 상태로 `{ id(uuid), subscription_no }`만 넘긴다. URL 쿼리·sessionStorage·localStorage는 쓰지 않는다. /complete는 받은 id로 `get_subscription`을 호출해 1건만 다시 읽어 표시한다. 앱 상태에 값이 없으면(새로고침·주소 직접 진입) 기존대로 `/plans`로 이동한다(replace: true).

## Q9. Subscription 저장소 (서버 또는 가상 저장소)
- 근거: PRD:L230, PRD:L277
- 영향: /apply
- 답: (사람 결정 2026-10-14) Supabase. 브라우저는 DB 함수 두 개만 호출한다.
  - `create_subscription(p_plan_id, p_name, p_phone, p_agreed_privacy)` → `{ id(uuid), subscription_no, created_at }`. 금액·요금제 이름·신청 번호는 서버가 정한다. 오류 메시지는 `name_invalid`, `phone_invalid`, `agreed_privacy_required`, `plan_not_found`.
  - `get_subscription(p_id uuid)` → 1건 `{ subscription_no, plan_id, plan_name, monthly_price, applicant_name_masked, created_at }`. 이름은 서버에서 첫 글자 + 나머지 `*`로 가려서 돌려주고, 휴대폰 번호는 돌려주지 않는다.
  - Supabase 연결값(VITE_PUBLIC_SUPABASE_URL, VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY)이 비어 있으면 같은 모양의 브라우저 메모리 저장소를 쓴다.

## Q10. 신청 번호(Subscription.id) 형식
- 근거: PRD:L231, PRD:L277
- 영향: /complete
- 답: (사람 결정 2026-10-14) 형식은 그대로 `UP{YYYYMMDD}-{2자리 순번}`(예: UP20261014-01). 발급은 서버가 한다(한국 시간 날짜별 순번). 100건 이상이면 세 자리.

## Q11. 신청 일시(created_at) 화면 표시 형식과 시간대
- 근거: PRD:L237, PRD:L277
- 영향: /complete
- 답: (기본값·사람 위임 2026-10-14) 저장은 ISO 8601. 화면 표시는 reference 화면과 같이 `Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })`, 시간대는 브라우저 로컬 시간대.

## Q12. 추천 Tag 선정 기준 (현재는 p02로 확정)
- 근거: PRD:L271
- 영향: /plans, /plans/[id], O/X #2
- 답: (기본값·사람 위임 2026-10-14) 선정 기준은 정하지 않는다. PRD 요금제 데이터의 `recommended` 값(p02만 true)을 그대로 쓴다.

## Q13. 각 화면 Header 제목 문구와 추천 Tag 라벨 문구
- 근거: PRD:L98, PRD:L185, PRD:L90 (화면 제목·추천 Tag가 있다고만 적혀 있고 문구가 없음. /apply 헤더 제목도 screens.md에만 "화면 제목"으로 있음)
- 영향: /plans, /apply, /complete
- 답: (기본값·사람 위임 2026-10-14) reference 화면 문구를 따른다. /plans "요금제", /apply "구독 신청", /complete "신청 완료" (/plans/[id]는 PRD대로 요금제 이름). 추천 Tag 라벨 "추천".

## Q14. '요금제 더 보기'와 값 없음 리다이렉트의 기록 대체(replace) 여부
- 근거: PRD:L68, PRD:L181, PRD:L219 (뒤로 아이콘만 "이전 기록을 대체"로 명시됨)
- 영향: /complete, O/X #11, #12
- 답: (기본값·사람 위임 2026-10-14) '요금제 더 보기'는 이전 기록을 대체하지 않는다(replace: false). 값 없음 리다이렉트는 뒤로가기 갇힘을 피하려고 이전 기록을 대체한다(replace: true).

## Q15. /complete에서 신청 내역을 읽는 동안·읽기 실패 시 처리
- 근거: PRD:L179, PRD:L181 (방금 저장한 값으로 채운다·값이 없으면 `/plans`로 이동한다고만 적혀 있음. Q8 결정으로 `get_subscription` 조회가 생겼으나 조회 중 표시와 조회 실패(1건 없음 포함) 시 처리가 PRD에 없음)
- 영향: /complete, O/X #7, #12
- 답: (기본값·사람 위임 2026-10-14) 읽는 동안에는 헤더와 화면 틀만 보이고 신청 내역 줄은 표시하지 않는다(새 컴포넌트·문구 없음). 읽기 실패나 결과 없음이면 값 없음과 같게 `/plans`로 이동한다(replace: true).
