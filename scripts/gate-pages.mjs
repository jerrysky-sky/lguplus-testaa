// G2: pages.json이 라우트 4개·screens.md 구성 요소·Design.md 컴포넌트·이동 규칙을 지키는지 센다. 실패 → S2
import { P, exists, readJson, screensComponents, designComponents, normRoute } from './lib/common.mjs'
import { Report, loadRules } from './lib/report.mjs'

const r = new Report('G2-pages')
const S2 = 'S2'
const rules = loadRules()

if (!exists(P.spec)) r.fail('spec-exists', 'spec.json 없음 (S1 먼저)', 'S1')
if (!exists(P.pages)) r.fail('pages-exists', 'harness/pages/pages.json 없음', S2)

if (exists(P.spec) && exists(P.pages)) {
  const spec = readJson(P.spec)
  let pages
  try { pages = readJson(P.pages).pages } catch (e) { r.fail('pages-json', 'JSON 파싱 실패: ' + e.message, S2) }
  if (pages) {
    const routes = spec.screens.map((s) => s.route)
    const got = pages.map((p) => p.route)
    r.check('route-count', got.length === routes.length && routes.every((x) => got.includes(x)),
      `기대 ${routes.length}개(${routes.join(' ')}) / pages ${got.length}개(${got.join(' ')})`, S2)

    const design = new Set(designComponents())
    const screens = screensComponents()
    const overrides = rules.componentOverrides || {}

    for (const p of pages) {
      const names = (p.components || []).map((c) => c.name)
      const unknown = names.filter((n) => !design.has(n))
      r.check(`components-known ${p.route}`, unknown.length === 0, unknown.length ? `Design.md에 없는 컴포넌트: ${unknown.join(', ')}` : `${names.length}개`, S2)

      const need = (screens[p.route] || []).map((n) => overrides[p.route]?.[n] ?? n)
      const lack = need.filter((n) => !names.includes(n))
      r.check(`components-cover ${p.route}`, lack.length === 0, lack.length ? `screens.md 구성 요소 빠짐: ${lack.join(', ')}` : '', S2)

      r.check(`header ${p.route}`, names.filter((n) => n === 'Header').length === 1 || !!p.header, 'Header 1개', S2)

      const badNav = (p.navigation || []).filter((n) => !routes.includes(normRoute(n.to)))
      r.check(`navigation ${p.route}`, badNav.length === 0, badNav.length ? `4개 라우트 밖 이동: ${badNav.map((n) => n.to).join(', ')}` : `${(p.navigation || []).length}개`, S2)

      const needMarkers = (rules.contract?.markers || []).filter((m) => m.route === p.route).map((m) => m.marker)
      const lackM = needMarkers.filter((m) => !(p.markers || []).includes(m))
      r.check(`markers ${p.route}`, lackM.length === 0, lackM.length ? `계약 마커 빠짐: ${lackM.join(', ')}` : '', S2)
    }
  }
}

process.exit(r.finish().code)
