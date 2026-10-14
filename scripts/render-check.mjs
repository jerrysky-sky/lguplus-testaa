// G7: 빌드된 화면을 Playwright(390×844)로 열어 A·B·C와 PRD O/X 규칙을 센다.
// 사용: node scripts/render-check.mjs [--route /plans] [--screens]
// 판정 값(요금제·문구)은 spec.json, 판정 조건·마커·라벨은 harness/rules.json에서 읽는다.
import fs from 'node:fs'
import path from 'node:path'
import { APP_DIR, P, exists, readJson, fmtWon } from './lib/common.mjs'
import { Report, loadRules } from './lib/report.mjs'
import { serve } from './lib/serve.mjs'

const args = process.argv.slice(2)
const onlyRoute = args.includes('--route') ? args[args.indexOf('--route') + 1] : null
const shots = args.includes('--screens')

const rules = loadRules()
const spec = readJson(P.spec)
const pages = exists(P.pages) ? readJson(P.pages).pages : []
const plans = spec.plans
const L = rules.labels
const M = rules.contract.selectors
const T = rules.testInput
const r = new Report('G7-render', onlyRoute)

const dist = path.join(APP_DIR, 'dist')
if (!exists(path.join(dist, 'index.html'))) {
  r.fail('dist', 'app/dist 없음 (G6 build 먼저)', 'S4')
  process.exit(r.finish().code)
}

let chromium
try { ({ chromium } = await import('playwright')) } catch {
  r.fail('playwright', 'playwright 미설치 (루트에서 npm install)', 'S5')
  process.exit(r.finish().code)
}

// 번들 Chromium → 시스템 Edge → 시스템 Chrome 순으로 시도 (보안 정책상 AppData 실행이 막힌 PC 대비)
let browser
const tried = []
for (const channel of [process.env.HARNESS_BROWSER_CHANNEL, undefined, 'msedge', 'chrome'].filter((c, i, a) => a.indexOf(c) === i)) {
  try { browser = await chromium.launch(channel ? { channel } : {}); break } catch (e) { tried.push(`${channel || 'chromium'}: ${String(e.message).split('\n')[0]}`) }
}
if (!browser) {
  r.fail('browser', `브라우저 실행 실패 — ${tried.join(' / ')}`, 'S5')
  process.exit(r.finish().code)
}
const srv = await serve(dist)
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })
ctx.setDefaultTimeout(3000)

const AMOUNT = /\d{1,3}(?:,\d{3})+원|\d+원/g
const amounts = (s) => [...new Set(s.match(AMOUNT) || [])]
const throttleText = (p) => (p.throttle_mbps != null ? `소진 후 ${p.throttle_mbps}Mbps로 제한` : '속도 제한 없음')
const afterText = (p) => `${p.discount_months + 1}개월째부터 ${fmtWon(p.price_after_discount)}`
const hasDiscount = (p) => p.discount_months != null
const count = (s, sub) => s.split(sub).length - 1
const applyKey = Object.keys(pages.find((p) => p.route === '/apply')?.query || {})[0] || rules.defaultApplyQuery
const applyUrl = (id) => `/apply?${applyKey}=${encodeURIComponent(id)}`
const pathOf = (page) => new URL(page.url()).pathname

const opened = []
const closeAll = async () => { while (opened.length) await opened.pop().close().catch(() => {}) }
async function open(url) {
  const page = await ctx.newPage()
  opened.push(page)
  await page.goto(srv.url + url)
  await page.waitForLoadState('networkidle')
  return page
}

// 체크 실행기: rules.json의 checks 항목(id, route, returnTo, status)을 따른다
const impl = {}
async function run(c) {
  if (onlyRoute && c.route !== onlyRoute) return
  if (c.status === 'pending') return r.pending(c.id, c.desc, c.question)
  const f = impl[c.id]
  if (!f) return r.fail(c.id, '판정 구현 없음 (scripts/render-check.mjs)', 'S5')
  try {
    const res = await f(c)
    if (res === true) r.pass(c.id, c.desc)
    else r.fail(c.id, `${c.desc} — ${res}`, c.returnTo)
  } catch (e) {
    r.fail(c.id, `${c.desc} — 화면 요소를 찾지 못함: ${String(e.message).split('\n')[0]}`, c.returnTo)
  } finally {
    await closeAll()
  }
  if (c.partial) r.pending(c.id + ':보류', c.partial, c.question)
}

// ---------- /plans ----------
async function cards(page) {
  const els = await page.locator(M.planCard).all()
  return Promise.all(els.map(async (e) => ({ id: await e.getAttribute(M.planCardAttr), text: await e.innerText() })))
}
impl['ox1-card-count'] = async () => {
  const cs = await cards(await open('/plans'))
  const ids = cs.map((c) => c.id).sort().join(',')
  const want = plans.map((p) => p.id).sort().join(',')
  return ids === want || `카드 ${cs.length}개(${ids}) / 기대 ${plans.length}개(${want})`
}
impl['ox9-order'] = async () => {
  const got = (await cards(await open('/plans'))).map((c) => c.id).join(',')
  const want = [...plans].sort((a, b) => a.monthly_price - b.monthly_price).map((p) => p.id).join(',')
  return got === want || `순서 ${got} / 기대 ${want}`
}
impl['ox2-recommended'] = async () => {
  const page = await open('/plans')
  const n = await page.locator(M.recommendedTag).count()
  const rec = plans.filter((p) => p.recommended).map((p) => p.id)
  const inside = await page.locator(`${M.planCard}:has(${M.recommendedTag})`).evaluateAll((els, a) => els.map((e) => e.getAttribute(a)), M.planCardAttr)
  return (n === 1 && inside.join() === rec.join()) || `추천 Tag ${n}개(카드 ${inside.join(',') || '없음'}) / 기대 1개(${rec.join(',')})`
}
impl['A-price-card'] = async () => {
  const cs = await cards(await open('/plans'))
  const bad = []
  for (const p of plans) {
    const c = cs.find((x) => x.id === p.id)
    if (!c) { bad.push(`${p.id} 카드 없음`); continue }
    const a = amounts(c.text)
    const want = hasDiscount(p) ? 2 : 1
    if (a.length !== want) bad.push(`${p.id} 금액 ${a.length}개(${a.join(' ')}) / 기대 ${want}개`)
    if (!a.includes(fmtWon(p.monthly_price))) bad.push(`${p.id} 매달 내는 금액 ${fmtWon(p.monthly_price)} 없음`)
    const after = /\d+개월째부터/.test(c.text)
    if (hasDiscount(p) ? count(c.text, afterText(p)) !== 1 : after) bad.push(`${p.id} 할인 종료 후 금액 줄 ${after ? '있음' : '없음'}`)
  }
  return bad.length === 0 || bad.join(' / ')
}
impl['B-throttle-card'] = async () => {
  const cs = await cards(await open('/plans'))
  const bad = plans.filter((p) => p.name.includes(rules.unlimitedKeyword)).flatMap((p) => {
    const c = cs.find((x) => x.id === p.id)
    const n = c ? count(c.text, throttleText(p)) : 0
    return n === 1 ? [] : [`${p.id} "${throttleText(p)}" ${n}개 / 기대 1개`]
  })
  return bad.length === 0 || bad.join(' / ')
}
impl['ox8-filter'] = async () => {
  const page = await open('/plans')
  const chips = page.locator(M.filterChip)
  const n = await chips.count()
  if (n < 2) return `필터 칩 ${n}개`
  const selected = async () => page.locator(`${M.filterChip}[${M.selectedAttr}="true"]`).allInnerTexts()
  const s0 = await selected()
  if (s0.length !== 1 || !s0[0].includes(L.filterAll)) return `기본 선택 칩 ${JSON.stringify(s0)} / 기대 ['${L.filterAll}']`
  for (let i = 0; i < n; i++) {
    const label = (await chips.nth(i).innerText()).trim()
    await chips.nth(i).click()
    const s = await selected()
    if (s.length !== 1 || s[0].trim() !== label) return `'${label}' 누른 뒤 선택 칩 ${JSON.stringify(s)}`
  }
  await page.locator(M.filterChip, { hasText: L.filterAll }).first().click()
  const k = await page.locator(M.planCard).count()
  return k === plans.length || `'${L.filterAll}' 누른 뒤 카드 ${k}개 / 기대 ${plans.length}개`
}

// ---------- /plans/[id] ----------
impl['A-price-detail'] = async () => {
  const bad = []
  for (const p of plans) {
    const page = await open(`/plans/${p.id}`)
    const text = await page.locator('body').innerText()
    const a = amounts(text)
    const want = hasDiscount(p) ? 2 : 1
    if (a.length !== want) bad.push(`${p.id} 금액 ${a.length}종(${a.join(' ')}) / 기대 ${want}종`)
    if (!a.includes(fmtWon(p.monthly_price))) bad.push(`${p.id} 매달 내는 금액 없음`)
    const after = /\d+개월째부터/.test(text)
    if (hasDiscount(p) ? !text.includes(afterText(p)) : after) bad.push(`${p.id} 할인 종료 후 금액 줄 ${after ? '있음' : '없음'}`)
    await page.close()
  }
  return bad.length === 0 || bad.join(' / ')
}
impl['B-throttle-detail'] = async () => {
  const bad = []
  for (const p of plans.filter((x) => x.name.includes(rules.unlimitedKeyword))) {
    const page = await open(`/plans/${p.id}`)
    const n = count(await page.locator('body').innerText(), throttleText(p))
    if (n !== 1) bad.push(`${p.id} "${throttleText(p)}" ${n}개 / 기대 1개`)
    await page.close()
  }
  return bad.length === 0 || bad.join(' / ')
}
async function notFound(url) {
  const page = await open(url)
  const text = await page.locator('body').innerText()
  if (!text.includes(L.notFound)) return `${url}: "${L.notFound}" 없음`
  await page.getByRole('button', { name: L.toList }).click()
  await page.waitForURL(/\/plans$/)
  return true
}
impl['ox13-invalid-detail'] = async () => notFound('/plans/__none__')

// ---------- /apply ----------
const field = (page, name) => page.locator(`[${M.fieldAttr}="${name}"]`)
const ctaApply = (page) => page.getByRole('button', { name: L.submit, exact: true })
async function isDisabled(loc) {
  return (await loc.isDisabled()) || (await loc.getAttribute('aria-disabled')) === 'true'
}
impl['ox13-invalid-apply'] = async () => {
  const a = await notFound('/apply')
  if (a !== true) return a
  return notFound(applyUrl('__none__'))
}
impl['ox6-cta-disabled'] = async () => {
  const page = await open(applyUrl(plans[0].id))
  const btn = ctaApply(page)
  if (!(await isDisabled(btn))) return '빈 상태에서 신청하기가 활성'
  await field(page, 'name').fill(T.name)
  if (!(await isDisabled(btn))) return '이름만 입력했는데 활성'
  await field(page, 'phone').fill(T.phone)
  if (!(await isDisabled(btn))) return '동의 없이 활성'
  await field(page, 'agreed_privacy').click()
  if (await isDisabled(btn)) return '세 조건을 채웠는데 비활성'
  return true
}
impl['ox14-error-position'] = async () => {
  const page = await open(applyUrl(plans[0].id))
  const name = field(page, 'name')
  const phone = field(page, 'phone')
  const err = (k) => page.locator(`[${M.errorAttr}="${k}"]`)
  const below = async (e, inp, next) => {
    const eb = await e.boundingBox(); const ib = await inp.boundingBox(); const nb = next ? await next.boundingBox() : null
    return eb && ib && eb.y >= ib.y + ib.height - 1 && (!nb || eb.y < nb.y)
  }
  await name.focus(); await phone.focus()
  if (!(await err('name').innerText()).includes(spec.messages[rules.messageKeys.nameRequired])) return '이름 빈 값 오류 문구 없음'
  if (!(await below(err('name'), name, phone))) return '이름 오류 문구가 이름 입력란 아래가 아님'
  await name.fill(T.invalidName); await phone.focus()
  if (!(await err('name').innerText()).includes(spec.messages[rules.messageKeys.nameInvalid])) return '이름 형식 오류 문구 없음'
  await phone.fill(T.invalidPhone); await name.focus()
  if (!(await err('phone').innerText()).includes(spec.messages[rules.messageKeys.phoneInvalid])) return '휴대폰 번호 오류 문구 없음'
  if (!(await below(err('phone'), phone, null))) return '휴대폰 오류 문구가 휴대폰 입력란 아래가 아님'
  return true
}
impl['ox10-back-reset'] = async () => {
  const p = plans[0]
  const page = await open(`/plans/${p.id}`)
  await page.getByRole('button', { name: L.apply }).click()
  await field(page, 'name').fill(T.name)
  await page.locator(M.back).click()
  if (pathOf(page) !== `/plans/${p.id}`) return `뒤로 → ${pathOf(page)} / 기대 /plans/${p.id}`
  await page.getByRole('button', { name: L.apply }).click()
  const v = await field(page, 'name').inputValue()
  return v === '' || `다시 들어왔는데 이름 입력값이 남아 있음`
}
impl['ox15-saving'] = async () => {
  const page = await open(applyUrl(plans[0].id))
  await field(page, 'name').fill(T.name)
  await field(page, 'phone').fill(T.phone)
  await field(page, 'agreed_privacy').click()
  const btn = ctaApply(page)
  await btn.click()
  const lockedOrMoved = pathOf(page) !== '/apply' || (await isDisabled(btn).catch(() => true))
  await page.waitForURL(/\/complete$/)
  return lockedOrMoved || '첫 탭 직후 신청하기가 다시 눌리는 상태'
}

// ---------- /complete ----------
async function applyFlow(p) {
  const page = await open('/plans')
  await page.locator(`${M.planCard}[${M.planCardAttr}="${p.id}"]`).getByRole('button', { name: L.detail }).click()
  await page.getByRole('button', { name: L.apply }).click()
  await field(page, 'name').fill(T.name)
  await field(page, 'phone').fill(T.phone)
  await field(page, 'agreed_privacy').click()
  await ctaApply(page).click()
  await page.waitForURL(/\/complete$/)
  return page
}
const flowPlan = () => plans.find(hasDiscount) || plans[0]
impl['ox7-complete-match'] = async () => {
  const p = flowPlan()
  const page = await applyFlow(p)
  const name = await page.locator(M.rowPlanName).innerText()
  const price = await page.locator(M.rowMonthlyPrice).innerText()
  return (name.includes(p.name) && price.includes(fmtWon(p.monthly_price))) || `완료 화면 "${name}" "${price}" / 기대 ${p.name} ${fmtWon(p.monthly_price)}`
}
impl['C-mask'] = async () => {
  const page = await applyFlow(flowPlan())
  const body = await page.locator('body').innerText()
  const row = await page.locator(M.rowApplicant).innerText()
  const masked = new RegExp(`${T.name[0]}\\*{${T.name.length - 1}}`)
  const phoneShown = [T.phone, T.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')].some((x) => body.includes(x))
  if (body.includes(T.name)) return '신청자 이름 원문이 보임'
  if (!masked.test(row)) return `신청자 행이 "첫 글자 + *" 형식이 아님`
  if (phoneShown) return '휴대폰 번호가 보임'
  return true
}
impl['ox11-complete-nav'] = async () => {
  let page = await applyFlow(flowPlan())
  await page.locator(M.back).click()
  if (pathOf(page) !== '/plans') return `뒤로 → ${pathOf(page)} / 기대 /plans`
  await page.goBack().catch(() => {})
  if (pathOf(page) === '/apply') return '뒤로 이동 후 브라우저 뒤로가기로 /apply에 돌아감'
  page = await applyFlow(flowPlan())
  await page.getByRole('button', { name: L.morePlans }).click()
  return pathOf(page) === '/plans' || `'${L.morePlans}' → ${pathOf(page)} / 기대 /plans`
}
impl['ox12-complete-direct'] = async () => {
  const page = await open('/complete')
  await page.waitForURL(/\/plans$/).catch(() => {})
  return pathOf(page) === '/plans' || `직접 진입 → ${pathOf(page)} / 기대 /plans`
}

for (const c of rules.checks.filter((c) => c.gate === 'G7')) await run(c)

// 스크린샷 4장 (G8 사람 승인용)
if (shots) {
  const dir = path.join(P.reportDir, 'screens')
  fs.mkdirSync(dir, { recursive: true })
  const p = flowPlan()
  const targets = [['plans', '/plans'], ['plans_id', `/plans/${p.id}`], ['apply', applyUrl(p.id)]]
  for (const [n, u] of targets) {
    try { await (await open(u)).screenshot({ path: path.join(dir, `${n}.png`), fullPage: true }) } catch (e) { r.fail(`screenshot-${n}`, `${u} 스크린샷 실패: ${String(e.message).split('\n')[0]}`, 'S4') }
    await closeAll()
  }
  try { await (await applyFlow(p)).screenshot({ path: path.join(dir, 'complete.png'), fullPage: true }) } catch { r.fail('screenshot-complete', '/complete 스크린샷 실패 (흐름 진입 불가)', 'S4:/complete') }
  await closeAll()
  console.log('스크린샷: ' + dir)
}

await browser.close()
srv.close()
process.exit(r.finish().code)
