// G1: spec.json·open-questions.md가 PRD와 일치하는지 센다. 실패 → S1
import { P, exists, read, readJson, prdRoutes, prdPlans, prdRules, prdErrorMessages, prdTbdLines } from './lib/common.mjs'
import { Report } from './lib/report.mjs'

const r = new Report('G1-spec')
const S1 = 'S1'

if (!exists(P.spec)) r.fail('spec-exists', 'harness/spec/spec.json 없음', S1)
if (!exists(P.questions)) r.fail('questions-exists', 'harness/spec/open-questions.md 없음', S1)

if (exists(P.spec)) {
  let spec
  try { spec = readJson(P.spec) } catch (e) { r.fail('spec-json', 'JSON 파싱 실패: ' + e.message, S1) }
  if (spec) {
    // 라우트: PRD 화면 구조 표와 정확히 일치
    const want = prdRoutes().map((x) => x.route)
    const got = (spec.screens || []).map((s) => s.route)
    r.check('routes', JSON.stringify(want) === JSON.stringify(got), `기대 ${want.join(' ')} / spec ${got.join(' ')}`, S1)

    // 요금제 데이터: PRD 표의 모든 값과 일치
    const wantPlans = prdPlans()
    const gotPlans = spec.plans || []
    r.check('plans-count', wantPlans.length === gotPlans.length, `기대 ${wantPlans.length}개 / spec ${gotPlans.length}개`, S1)
    for (const w of wantPlans) {
      const g = gotPlans.find((p) => p.id === w.id)
      if (!g) { r.fail(`plan-${w.id}`, 'spec에 없음', S1); continue }
      const diff = Object.keys(w).filter((k) => JSON.stringify(w[k]) !== JSON.stringify(g[k]))
      r.check(`plan-${w.id}`, diff.length === 0, diff.length ? `다른 필드: ${diff.map((k) => `${k}(PRD ${JSON.stringify(w[k])} / spec ${JSON.stringify(g[k])})`).join(', ')}` : '', S1)
    }

    // O/X 규칙: 개수와 문장이 글자 그대로
    const wantRules = prdRules()
    const gotRules = spec.rules || []
    const bad = wantRules.filter((w) => gotRules.find((g) => g.no === w.no)?.text !== w.text).map((w) => w.no)
    r.check('rules', wantRules.length === gotRules.length && bad.length === 0, `PRD ${wantRules.length}개 / spec ${gotRules.length}개${bad.length ? ' / 문장 다름: #' + bad.join(',#') : ''}`, S1)

    // 오류 안내 문구가 messages에 모두 있음
    const msgs = Object.values(spec.messages || {})
    const missing = prdErrorMessages().filter((m) => !msgs.includes(m.text)).map((m) => m.text)
    r.check('messages', missing.length === 0, missing.length ? `빠진 문구: ${missing.join(' / ')}` : `${msgs.length}개`, S1)
  }
}

// 확인 필요: PRD의 해당 줄이 모두 open-questions.md에 PRD:L<n>으로 인용됨
if (exists(P.questions)) {
  const q = read(P.questions)
  const cited = new Set([...q.matchAll(/PRD:L(\d+)/g)].map((m) => Number(m[1])))
  const tbd = prdTbdLines()
  const miss = tbd.filter((x) => !cited.has(x.line)).map((x) => 'L' + x.line)
  r.check('open-questions', miss.length === 0, `PRD "확인 필요" ${tbd.length}줄 / 빠진 줄: ${miss.join(',') || '없음'}`, S1)
}

process.exit(r.finish().code)
