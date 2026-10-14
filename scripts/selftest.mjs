// 하네스 자가 점검(테스트런). 실제 harness/·app/은 건드리지 않고 임시 폴더에서
// ① 훅 차단 ② 빈 상태 게이트 실패 ③ 정상 산출물 통과 ④ 일부러 어긴 산출물이 걸리는지 확인한다.
// 사용: node scripts/selftest.mjs [임시폴더]   (앱 의존성 설치에 몇 분 걸릴 수 있다)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ROOT, prdRoutes, prdPlans, prdRules, prdErrorMessages, prdTbdLines, screensComponents } from './lib/common.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(process.argv[2] || process.env.HARNESS_SELFTEST_DIR || path.join(os.tmpdir(), 'harness-selftest'))
const APP = path.join(DIR, 'selftest-app')
const env = {
  ...process.env,
  HARNESS_APP_DIR: APP,
  HARNESS_SPEC: path.join(DIR, 'spec.json'),
  HARNESS_QUESTIONS: path.join(DIR, 'open-questions.md'),
  HARNESS_PAGES: path.join(DIR, 'pages.json'),
  HARNESS_REPORT_DIR: path.join(DIR, 'report'),
}
fs.rmSync(path.join(DIR, 'report'), { recursive: true, force: true })
for (const f of ['spec.json', 'open-questions.md', 'pages.json']) fs.rmSync(path.join(DIR, f), { force: true })
fs.mkdirSync(DIR, { recursive: true })

const results = []
const expect = (name, code, want, out = '') => {
  const ok = want === 'fail' ? code !== 0 : code === want
  results.push({ name, ok, code })
  console.log(`${ok ? 'OK ' : 'NG '} ${name}  (exit ${code}, 기대 ${want})${ok ? '' : '\n' + out.split('\n').slice(-25).join('\n')}`)
}
const run = (script, args = [], extraEnv = {}) => {
  const p = spawnSync(process.execPath, [path.join(here, script), ...args], { env: { ...env, ...extraEnv }, encoding: 'utf8', input: extraEnv.__stdin })
  return { code: p.status, out: (p.stdout || '') + (p.stderr || '') }
}
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s) }

// ---------- 1. 훅 ----------
console.log('\n# 1. G4 훅')
const hook = (name, payload, want) => {
  const p = spawnSync(process.execPath, [path.join(here, 'hooks', 'guard.mjs')], { input: JSON.stringify({ cwd: ROOT, ...payload }), encoding: 'utf8' })
  expect(`훅: ${name}`, p.status, want, p.stderr)
}
const W = (file, content, agent) => ({ tool_name: 'Write', agent_type: agent, tool_input: { file_path: file, content } })
const B = (command) => ({ tool_name: 'Bash', tool_input: { command } })
hook('메인 → docs/PRD.md 차단', W('docs/PRD.md', 'x'), 2)
hook('메인 → reference/ 차단', W('reference/x.txt', 'x'), 2)
hook('메인 → app/src 차단', W('app/src/a.tsx', 'x'), 2)
hook('메인 → harness/spec 차단', W('harness/spec/spec.json', '{}'), 2)
hook('메인 → scripts/ 허용', W('scripts/tmp.mjs', 'x'), 0)
hook('spec-writer → harness/spec 허용', W('harness/spec/spec.json', '{}', 'spec-writer'), 0)
hook('spec-writer → harness/pages 차단', W('harness/pages/pages.json', '{}', 'spec-writer'), 2)
hook('page-planner → harness/pages 허용', W('harness/pages/pages.json', '{}', 'page-planner'), 0)
hook('page-planner → harness/rules.json 차단', W('harness/rules.json', '{}', 'page-planner'), 2)
hook('judge → 어디든 차단', W('harness/report/note.md', 'x', 'judge'), 2)
hook('page-builder → tokens.css 차단', W('app/src/styles/tokens.css', 'x', 'page-builder'), 2)
hook('page-builder → router.gen.tsx 차단', W('app/src/router.gen.tsx', 'x', 'page-builder'), 2)
hook('page-builder → docs 차단', W('docs/Design.md', 'x', 'page-builder'), 2)
hook('page-builder #fff 차단', W('app/src/pages/a.tsx', 'const c = "#fff"', 'page-builder'), 2)
hook('page-builder rgb() 차단', W('app/src/a.css', '.a { color: rgb(0 0 0); }', 'page-builder'), 2)
hook('page-builder p-[13px] 차단', W('app/src/pages/a.tsx', '<div className="p-[13px]" />', 'page-builder'), 2)
hook('page-builder p-13 차단', W('app/src/pages/a.tsx', '<div className="p-13" />', 'page-builder'), 2)
hook('page-builder rounded-6 차단', W('app/src/pages/a.tsx', '<div className="rounded-6" />', 'page-builder'), 2)
hook('page-builder bg-white 차단', W('app/src/pages/a.tsx', '<div className="bg-white" />', 'page-builder'), 2)
hook('page-builder 13px 차단', W('app/src/a.css', '.a { padding: 13px; }', 'page-builder'), 2)
hook('page-builder style={{}} 숫자 차단', W('app/src/pages/a.tsx', '<div style={{ padding: 13 }} />', 'page-builder'), 2)
hook('page-builder var(--없는변수) 차단', W('app/src/a.css', '.a { color: var(--brand-x); }', 'page-builder'), 2)
hook('page-builder @make-kits/lg 차단', W('app/src/pages/a.tsx', 'import { Button } from "@make-kits/lg"', 'page-builder'), 2)
hook('page-builder @mui/material 차단', W('app/src/pages/a.tsx', 'import { Button } from "@mui/material"', 'page-builder'), 2)
hook('page-builder 토큰만 쓴 코드 허용', W('app/src/pages/a.tsx', 'import { useState } from "react"\nimport clsx from "clsx"\nimport { Button } from "@/ui"\nexport default () => <div className="p-16 gap-12 rounded-full bg-bg-surface text-text-primary border border-border-default typo-body-medium bottom-0" />', 'page-builder'), 0)
hook('Bash > docs/ 차단', B('echo hi > docs/x.md'), 2)
hook('Bash rm -rf app/src 차단', B('rm -rf app/src'), 2)
hook('Bash Set-Content reference 차단', B('Set-Content reference/x.txt "a"'), 2)
hook('Bash npm install --prefix app 허용', B('npm install --prefix app'), 0)
hook('Bash node 게이트 허용', B('node scripts/gate-spec.mjs 2>/dev/null'), 0)
hook('Bash git add 허용', B('git add app/src harness/spec'), 0)

// ---------- 2. 빈 상태 ----------
console.log('\n# 2. 산출물이 없을 때 게이트는 실패해야 한다')
let r = run('gate-spec.mjs'); expect('G1 빈 상태 실패(→S1)', r.code, 'fail', r.out); expect('G1 복귀 S1', /복귀: S1/.test(r.out) ? 0 : 1, 0, r.out)
r = run('gate-pages.mjs'); expect('G2 빈 상태 실패', r.code, 'fail', r.out)
fs.rmSync(APP + '/src/styles', { recursive: true, force: true })
r = run('gate-tokens.mjs'); expect('G3 빈 상태 실패(→S3)', r.code, 'fail', r.out); expect('G3 복귀 S3', /복귀: S3/.test(r.out) ? 0 : 1, 0, r.out)

// ---------- 3. S1 산출물 (spec-writer가 만들 결과를 흉내) ----------
console.log('\n# 3. S1 spec')
const keys = ['name_required', 'name_invalid', 'phone_invalid', 'save_failed']
const routes = prdRoutes()
const sc = screensComponents()
const spec = {
  source: { prd: 'docs/PRD.md', screens: 'docs/screens.md' },
  screens: routes.map((x) => ({ ...x, components: (sc[x.route] || []).map((n) => (x.route === '/plans/[id]' && n === 'OptionItem' ? 'List/Row' : n)), navigation: [] })),
  plans: prdPlans(),
  messages: Object.fromEntries(prdErrorMessages().map((m, i) => [keys[i] || `msg_${i}`, m.text])),
  rules: prdRules(),
}
write(env.HARNESS_SPEC, JSON.stringify(spec, null, 2))
write(env.HARNESS_QUESTIONS, prdTbdLines().map((x, i) => `## Q${i + 1}\n- 근거: PRD:L${x.line}\n- 답:\n`).join('\n'))
r = run('gate-spec.mjs'); expect('G1 정상 spec 통과', r.code, 0, r.out)
const bad = structuredClone(spec); bad.plans[2].monthly_price = 49000
write(env.HARNESS_SPEC, JSON.stringify(bad)); r = run('gate-spec.mjs'); expect('G1 p03 금액 틀림 → 실패', r.code, 'fail', r.out)
const bad2 = structuredClone(spec); bad2.screens.push({ order: 5, name: '추가', route: '/extra' })
write(env.HARNESS_SPEC, JSON.stringify(bad2)); r = run('gate-spec.mjs'); expect('G1 라우트 5개 → 실패', r.code, 'fail', r.out)
write(env.HARNESS_SPEC, JSON.stringify(spec, null, 2))
write(env.HARNESS_QUESTIONS, '## Q1\n- 근거: PRD:L91\n- 답:\n'); r = run('gate-spec.mjs'); expect('G1 확인 필요 줄 누락 → 실패', r.code, 'fail', r.out)
write(env.HARNESS_QUESTIONS, prdTbdLines().map((x, i) => `## Q${i + 1}\n- 근거: PRD:L${x.line}\n- 답:\n`).join('\n'))

// ---------- 4. S2 산출물 ----------
console.log('\n# 4. S2 pages')
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'harness', 'rules.json'), 'utf8'))
const nav = { '/plans': ['/plans/[id]'], '/plans/[id]': ['/plans', '/apply'], '/apply': ['/plans/[id]', '/complete'], '/complete': ['/plans'] }
const pagesDoc = {
  pages: spec.screens.map((s) => ({
    route: s.route,
    header: { type: s.route === '/plans' ? 'root' : 'default' },
    query: s.route === '/apply' ? { plan: '요금제 id' } : {},
    components: s.components.map((name) => ({ name })),
    navigation: nav[s.route].map((to) => ({ to })),
    markers: rules.contract.markers.filter((m) => m.route === s.route).map((m) => m.marker),
  })),
}
write(env.HARNESS_PAGES, JSON.stringify(pagesDoc, null, 2))
r = run('gate-pages.mjs'); expect('G2 정상 pages 통과', r.code, 0, r.out)
const badP = structuredClone(pagesDoc); badP.pages[0].components.push({ name: 'Carousel' })
write(env.HARNESS_PAGES, JSON.stringify(badP)); r = run('gate-pages.mjs'); expect('G2 Design.md에 없는 컴포넌트 → 실패', r.code, 'fail', r.out)
const badP2 = structuredClone(pagesDoc); badP2.pages[3].navigation.push({ to: '/apply' }); badP2.pages[0].components = badP2.pages[0].components.filter((c) => c.name !== 'FilterChip')
write(env.HARNESS_PAGES, JSON.stringify(badP2)); r = run('gate-pages.mjs'); expect('G2 구성 요소 누락 → 실패', r.code, 'fail', r.out)
write(env.HARNESS_PAGES, JSON.stringify(pagesDoc, null, 2))

// ---------- 5. S3 ----------
console.log('\n# 5. S3 tokens + scaffold')
r = run('gen-tokens.mjs'); expect('gen-tokens 실행', r.code, 0, r.out)
r = run('scaffold-app.mjs'); expect('scaffold-app 실행', r.code, 0, r.out)
r = run('gate-tokens.mjs'); expect('G3 정상 통과', r.code, 0, r.out)
const css = fs.readFileSync(path.join(APP, 'src/styles/tokens.css'), 'utf8')
write(path.join(APP, 'src/styles/tokens.css'), css.replace('@theme static {', '@theme static {\n  --color-extra: #123456;'))
r = run('gate-tokens.mjs'); expect('G3 tokens.css 손 수정 → 실패', r.code, 'fail', r.out)
run('gen-tokens.mjs')

if (!fs.existsSync(path.join(APP, 'node_modules'))) {
  console.log('\n(앱 의존성 설치 중…)')
  const p = spawnSync('npm install --no-audit --no-fund', { cwd: APP, shell: true, encoding: 'utf8' })
  expect('app npm install', p.status, 0, p.stdout + p.stderr)
}

// ---------- 6. S4 정상 화면 (page-builder가 만들 결과를 흉내, @make-kits/lg 대신 기본 태그) ----------
console.log('\n# 6. S4 정상 화면 → G5·G6·G7 통과해야 한다')
const F = (rel, s) => write(path.join(APP, 'src', rel), s)
const writeGood = () => {
  F('data.ts', `export type Plan = { id: string; name: string; monthly_price: number; data_label: string; throttle_mbps: number | null; price_after_discount: number | null; discount_months: number | null; recommended: boolean }
export const plans: Plan[] = ${JSON.stringify(spec.plans.map(({ description, data_gb, ...p }) => p))}
export const won = (n: number) => n.toLocaleString('ko-KR') + '원'
export const throttle = (p: Plan) => (p.throttle_mbps != null ? \`소진 후 \${p.throttle_mbps}Mbps로 제한\` : '속도 제한 없음')
export const after = (p: Plan) => (p.discount_months != null && p.price_after_discount != null ? \`\${p.discount_months + 1}개월째부터 \${won(p.price_after_discount)}\` : null)
export const byId = (id: string | null | undefined) => plans.find((p) => p.id === id)
export type Sub = { id: string; plan: Plan; name: string; created_at: string }
export const store: { last: Sub | null } = { last: null }
`)
  F('ui.tsx', `import type { ReactNode } from 'react'
import { navigate } from './router.gen'
type HeaderProps = {
  title: string
  back?: () => void
}
export function Header({ title, back }: HeaderProps) {
  return <header className="flex items-center gap-8 p-16 bg-bg-surface">{back && <button data-nav="back" aria-label="뒤로" onClick={back} className="typo-body-strong">←</button>}<h1 className="typo-heading-h4 text-text-primary">{title}</h1></header>
}
export function NotFound() {
  return <main className="flex flex-col gap-16 p-16"><p className="typo-body-medium">${rules.labels.notFound}</p><button className="p-12 rounded-12 bg-fill-primary text-text-on-dark" onClick={() => navigate('/plans')}>${rules.labels.toList}</button></main>
}
export function Cta({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-8 p-16 bg-bg-surface border-t border-border-subtle">{children}</div>
}
`)
  F('pages/plans/index.tsx', `import { useState } from 'react'
import { navigate } from '../../router.gen'
import { plans, won, throttle, after } from '../../data'
import { Header } from '../../ui'
const chips = [{ label: '전체', f: () => true }, { label: '속도 제한 없음', f: (p: (typeof plans)[number]) => p.throttle_mbps == null }]
export default function Page() {
  const [sel, setSel] = useState(0)
  const list = [...plans].sort((a, b) => a.monthly_price - b.monthly_price).filter(chips[sel].f)
  return (
    <main className="flex flex-col gap-16 bg-bg-default">
      <Header title="요금제" />
      <div className="flex gap-8 p-16">{chips.map((c, i) => <button key={c.label} data-filter-chip aria-pressed={sel === i} onClick={() => setSel(i)} className="p-8 rounded-full border border-border-default">{c.label}</button>)}</div>
      {list.length === 0 && <p>조건에 맞는 요금제가 없어요.</p>}
      {list.map((p) => (
        <article key={p.id} data-plan-id={p.id} className="flex flex-col gap-8 p-20 rounded-16 bg-bg-surface">
          {p.recommended && <span data-tag="recommended" className="typo-caption-bold text-text-accent">추천</span>}
          {p.discount_months != null && <span className="typo-caption-medium">24개월 할인</span>}
          <h2 className="typo-subtitle-bold">{p.name}</h2>
          <p className="typo-body-medium">{p.data_label}</p>
          <p className="typo-body-small-medium text-text-secondary">{throttle(p)}</p>
          <p className="typo-heading-h4">{won(p.monthly_price)}</p>
          {after(p) && <p className="typo-caption-medium text-text-tertiary">{after(p)}</p>}
          <button onClick={() => navigate(\`/plans/\${p.id}\`)} className="p-12 rounded-12 bg-fill-primary text-text-on-dark">자세히</button>
        </article>
      ))}
    </main>
  )
}
`)
  F('pages/plans/[id].tsx', `import { navigate, useRoute } from '../../router.gen'
import { byId, won, throttle, after } from '../../data'
import { Header, NotFound, Cta } from '../../ui'
export default function Page() {
  const p = byId(useRoute().params.id)
  if (!p) return <NotFound />
  return (
    <main className="flex flex-col gap-16">
      <Header title={p.name} back={() => navigate('/plans')} />
      {p.recommended && <span data-tag="recommended">추천</span>}
      <section className="flex flex-col gap-4 p-20 rounded-16 bg-bg-surface"><p>매달 내는 금액</p><p className="typo-heading-h3">{won(p.monthly_price)}</p>{after(p) && <p>{after(p)}</p>}</section>
      <div className="flex justify-between p-16"><span>기본 데이터</span><span>{p.data_label}</span></div>
      <div className="flex justify-between p-16"><span>소진 후 속도</span><span>{throttle(p)}</span></div>
      <Cta><p>{won(p.monthly_price)}</p><button onClick={() => navigate(\`/apply?plan=\${p.id}\`)} className="p-12 rounded-12 bg-fill-primary text-text-on-dark">구독 신청하기</button></Cta>
    </main>
  )
}
`)
  F('pages/apply/index.tsx', `import { useState } from 'react'
import { navigate, useRoute } from '../../router.gen'
import { byId, won, after, store } from '../../data'
import { Header, NotFound, Cta } from '../../ui'
const nameOk = (v: string) => /^[가-힣a-zA-Z]{2,20}$/.test(v.trim())
const phoneOk = (v: string) => /^010\\d{8}$/.test(v)
export default function Page() {
  const p = byId(useRoute().query.get('plan'))
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState<{ name?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)
  if (!p) return <NotFound />
  const checkName = () => setErr((e) => ({ ...e, name: name.trim() === '' ? ${JSON.stringify(spec.messages.name_required)} : nameOk(name) ? undefined : ${JSON.stringify(spec.messages.name_invalid)} }))
  const checkPhone = () => setErr((e) => ({ ...e, phone: phoneOk(phone) ? undefined : ${JSON.stringify(spec.messages.phone_invalid)} }))
  const submit = () => {
    if (saving || !nameOk(name) || !phoneOk(phone)) { checkName(); checkPhone(); return }
    setSaving(true)
    setTimeout(() => { store.last = { id: 'S' + Date.now(), plan: p, name: name.trim(), created_at: new Date().toISOString() }; navigate('/complete', { replace: true }) }, 200)
  }
  return (
    <main className="flex flex-col gap-16">
      <Header title="구독 신청" back={() => navigate(\`/plans/\${p.id}\`)} />
      <div className="flex justify-between p-16"><span>{p.name}</span><span>{won(p.monthly_price)}</span></div>
      {after(p) && <div className="p-16">{after(p)}</div>}
      <label className="flex flex-col gap-4 p-16">이름<input data-field="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={checkName} className="p-12 rounded-12 border border-border-default" />{err.name && <span data-error-for="name" className="text-text-error">{err.name}</span>}</label>
      <label className="flex flex-col gap-4 p-16">휴대폰 번호<input data-field="phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\\D/g, '').slice(0, 11))} onBlur={checkPhone} className="p-12 rounded-12 border border-border-default" />{err.phone && <span data-error-for="phone" className="text-text-error">{err.phone}</span>}</label>
      <label className="flex gap-8 p-16"><input type="checkbox" data-field="agreed_privacy" checked={agree} onChange={(e) => setAgree(e.target.checked)} />개인정보 수집·이용 동의</label>
      <Cta><button disabled={!name || !phone || !agree || saving} onClick={submit} className="p-12 rounded-12 bg-fill-primary text-text-on-dark disabled:bg-fill-disabled">{saving ? '신청 중이에요' : '신청하기'}</button></Cta>
    </main>
  )
}
`)
  F('pages/complete/index.tsx', `import { useEffect } from 'react'
import { navigate } from '../../router.gen'
import { store, won } from '../../data'
import { Header, Cta } from '../../ui'
export default function Page() {
  const s = store.last
  useEffect(() => { if (!s) navigate('/plans', { replace: true }) }, [s])
  if (!s) return null
  const masked = s.name[0] + '*'.repeat(s.name.length - 1)
  return (
    <main className="flex flex-col gap-16">
      <Header title="신청 완료" back={() => navigate('/plans', { replace: true })} />
      <p className="typo-heading-h3 p-16">구독 신청이 완료됐어요</p>
      <div className="flex justify-between p-16"><span>신청 번호</span><span>{s.id}</span></div>
      <div data-row="plan-name" className="flex justify-between p-16"><span>요금제</span><span>{s.plan.name}</span></div>
      <div data-row="monthly-price" className="flex justify-between p-16"><span>매달 내는 금액</span><span>{won(s.plan.monthly_price)}</span></div>
      <div className="flex justify-between p-16"><span>신청 일시</span><span>{s.created_at.slice(0, 10)}</span></div>
      <div data-row="applicant" className="flex justify-between p-16"><span>신청자</span><span>{masked}</span></div>
      <Cta><button onClick={() => navigate('/plans', { replace: true })} className="p-12 rounded-12 bg-fill-primary text-text-on-dark">요금제 더 보기</button></Cta>
    </main>
  )
}
`)
}
writeGood()
r = run('gate-screen.mjs'); expect('G5·G6·G7 정상 앱 통과(보류는 partial)', r.code, 0, r.out)
console.log(r.out.split('\n').filter((l) => /^(PASS|FAIL|HOLD)|결과:/.test(l)).join('\n'))

// ---------- 7. 일부러 어긴 화면 ----------
console.log('\n# 7. 어기면 걸려야 한다')
const mutate = (rel, from, to) => { const f = path.join(APP, 'src', rel); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(from, to)) }
const caseOf = (name, rel, from, to, route, wantText) => {
  writeGood(); mutate(rel, from, to)
  const x = run('gate-screen.mjs', [route])
  expect(name, x.code, 'fail', x.out)
  expect(`${name} — 사유 "${wantText}"`, x.out.includes(wantText) ? 0 : 1, 0, x.out)
}
caseOf('G5 p-13 (토큰 밖 간격)', 'pages/plans/index.tsx', 'p-20 rounded-16', 'p-13 rounded-16', '/plans', 'tw-spacing')
caseOf('G5 Original 속성', 'pages/plans/index.tsx', '<h2 ', '<h2 Original="정가" ', '/plans', 'A-original-off')
caseOf('G7 ★A 카드에 정가 추가', 'pages/plans/index.tsx', '{won(p.monthly_price)}</p>', '{won(p.monthly_price)}</p><p>정가 {won(p.monthly_price + 10000)}</p>', '/plans', 'FAIL  A-price-card')
caseOf('G7 ★A 상세에 할인가 추가', 'pages/plans/[id].tsx', '<p>매달 내는 금액</p>', '<p>매달 내는 금액</p><p>{won(p.monthly_price + 5000)}</p>', '/plans/[id]', 'FAIL  A-price-detail')
caseOf('G7 ★B 카드 속도 문구 삭제', 'pages/plans/index.tsx', '<p className="typo-body-small-medium text-text-secondary">{throttle(p)}</p>', '', '/plans', 'FAIL  B-throttle-card')
caseOf('G7 ★C 신청자 이름 원문 노출', 'pages/complete/index.tsx', '<span>{masked}</span>', '<span>{s.name}</span>', '/complete', 'FAIL  C-mask')
caseOf('G7 O/X#9 정렬 뒤집힘', 'pages/plans/index.tsx', 'a.monthly_price - b.monthly_price', 'b.monthly_price - a.monthly_price', '/plans', 'FAIL  ox9-order')
caseOf('G7 O/X#6 버튼 항상 활성', 'pages/apply/index.tsx', 'disabled={!name || !phone || !agree || saving}', 'disabled={saving}', '/apply', 'FAIL  ox6-cta-disabled')
caseOf('G7 O/X#12 /complete 직접 진입 허용', 'pages/complete/index.tsx', 'if (!s) navigate', 'if (false) navigate', '/complete', 'FAIL  ox12-complete-direct')
writeGood()

// ---------- 8. 전체 게이트·스크린샷·이어 하기 ----------
console.log('\n# 8. gate-all (S5)')
r = run('gate-all.mjs'); expect('gate-all 통과 (partial 허용)', r.code, 0, r.out)
const rep = JSON.parse(fs.readFileSync(path.join(DIR, 'report', 'report.json'), 'utf8'))
expect(`report.json status=${rep.status}, 보류 ${rep.summary.pending}건`, rep.status === 'partial' ? 0 : 1, 0, JSON.stringify(rep.summary))
const shots = fs.existsSync(path.join(DIR, 'report', 'screens')) ? fs.readdirSync(path.join(DIR, 'report', 'screens')) : []
expect(`스크린샷 4장 (${shots.join(', ')})`, shots.length === 4 ? 0 : 1, 0)
r = run('resume.mjs'); expect('resume 실행', r.code, 0, r.out)

const ng = results.filter((x) => !x.ok)
console.log(`\n== 자가 점검: ${results.length - ng.length}/${results.length} 통과 ==`)
if (ng.length) console.log('실패: ' + ng.map((x) => x.name).join(' | '))
console.log(`임시 폴더: ${DIR}`)
process.exit(ng.length ? 1 : 0)
