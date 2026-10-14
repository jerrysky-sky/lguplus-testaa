# Open Questions (S1)

PRD에서 "확인 필요"가 적힌 줄과, PRD에 값이 없어 화면을 만들 수 없는 항목을 모았다. `답:`은 사람만 채운다.

## Q1. 필터 칩 라벨과 데이터량 구간 경계값
- 근거: PRD:L85, PRD:L272
- 영향: /plans, O/X #8
- 답:

## Q2. 요금제 상세 기본 제공 항목의 그 밖의 행 (통화·문자 등)
- 근거: PRD:L115
- 영향: /plans/[id]
- 답:

## Q3. 포함 혜택(List/Row check) 내용과 섹션 제목
- 근거: PRD:L119, PRD:L275
- 영향: /plans/[id] (혜택이 없으면 섹션 전체 숨김)
- 답:

## Q4. 개인정보 보관 기간
- 근거: PRD:L153, PRD:L276
- 영향: /apply ('내용 보기')
- 답:

## Q5. 만 14세 미만 사용자의 처리 방식
- 근거: PRD:L154, PRD:L276
- 영향: /apply
- 답:

## Q6. 저장 응답을 기다리는 최대 시간
- 근거: PRD:L159, PRD:L277
- 영향: /apply, O/X #15
- 답:

## Q7. 저장 실패 오류 영역 컴포넌트 (Design.md에 해당 컴포넌트 없음, Variant 추가 여부)
- 근거: PRD:L169
- 영향: /apply, O/X #14
- 답:

## Q8. `/apply`에서 `/complete`로 신청 값을 넘기는 방식
- 근거: PRD:L179, PRD:L277
- 영향: /apply, /complete, O/X #7, #12
- 답:

## Q9. Subscription 저장소 (서버 또는 가상 저장소)
- 근거: PRD:L230, PRD:L277
- 영향: /apply
- 답:

## Q10. 신청 번호(Subscription.id) 형식
- 근거: PRD:L231, PRD:L277
- 영향: /complete
- 답:

## Q11. 신청 일시(created_at) 화면 표시 형식과 시간대
- 근거: PRD:L237, PRD:L277
- 영향: /complete
- 답:

## Q12. 추천 Tag 선정 기준 (현재는 p02로 확정)
- 근거: PRD:L271
- 영향: /plans, /plans/[id], O/X #2
- 답:

## Q13. 각 화면 Header 제목 문구와 추천 Tag 라벨 문구
- 근거: PRD:L98, PRD:L185, PRD:L90 (화면 제목·추천 Tag가 있다고만 적혀 있고 문구가 없음. /apply 헤더 제목도 screens.md에만 "화면 제목"으로 있음)
- 영향: /plans, /apply, /complete
- 답:

## Q14. '요금제 더 보기'와 값 없음 리다이렉트의 기록 대체(replace) 여부
- 근거: PRD:L68, PRD:L181, PRD:L219 (뒤로 아이콘만 "이전 기록을 대체"로 명시됨)
- 영향: /complete, O/X #11, #12
- 답:
