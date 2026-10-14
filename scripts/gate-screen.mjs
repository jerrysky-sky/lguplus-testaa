// 화면 1개 게이트: G5 정적 검사 → G6 build·tsc·oxfmt → G7 화면 판정(해당 라우트)
// 사용: node scripts/gate-screen.mjs /plans      (라우트 없이 실행하면 G7은 전체 체크)
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { APP_DIR, P, exists, read, readJson, walk, rel } from './lib/common.mjs'
import { scan, fmtHits } from './lib/scan.mjs'
import { Report, loadRules } from './lib/report.mjs'

const route = process.argv[2] || null
const rules = loadRules()
const spec = readJson(P.spec)
const routes = spec.screens.map((s) => s.route)
if (route && !routes.includes(route)) {
  console.error(`모르는 라우트: ${route} (가능: ${routes.join(' ')})`)
  process.exit(2)
}
const S4 = route ? `S4:${route}` : 'S4'

// ---------- G5 정적 검사 ----------
const g5 = new Report('G5-static', route)
const generated = [P.tokensCss, P.routerGen].map((f) => path.resolve(f))
const files = walk(P.appSrc).filter((f) => !generated.includes(path.resolve(f)))
let hits = 0
for (const f of files) {
  const h = scan(read(f), f, { allowedImports: rules.allowedImports })
  if (h.length) { hits += h.length; console.log(fmtHits(rel(f), h)) }
}
g5.check('token-and-import', hits === 0, `${files.length}개 파일, 위반 ${hits}건`, S4)

if (exists(P.routerGen)) {
  const gen = read(P.routerGen).match(/export const ROUTES = (\[.*\]) as const/)?.[1]
  const got = gen ? JSON.parse(gen) : []
  g5.check('route-count', JSON.stringify(got) === JSON.stringify(routes), `라우터 ${got.length}개 / spec ${routes.length}개`, 'S3')
} else g5.fail('route-count', 'router.gen.tsx 없음', 'S3')

for (const sr of rules.staticChecks || []) {
  const re = new RegExp(sr.pattern, 'g')
  const found = files.flatMap((f) => [...read(f).matchAll(re)].map(() => rel(f)))
  g5.check(sr.id, found.length === 0, `${sr.desc}: ${found.length}건${found.length ? ' (' + [...new Set(found)].join(', ') + ')' : ''}`, S4)
}
const r5 = g5.finish()
if (r5.code) process.exit(r5.code)

// ---------- G6 build·lint ----------
const g6 = new Report('G6-build', route)
// 판정용 빌드는 Supabase 연결값을 비워 메모리 저장소로 돈다(G7 신청 흐름이 실제 DB에 쌓이지 않게).
// Vite는 이미 있는 환경변수를 .env.local보다 먼저 쓴다.
const offline = { VITE_PUBLIC_SUPABASE_URL: '', VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' }
const sh = (cmd) => {
  const p = spawnSync(cmd, { cwd: APP_DIR, shell: true, encoding: 'utf8', env: { ...process.env, ...offline } })
  return { ok: p.status === 0, out: (p.stdout + p.stderr).trim().split('\n').slice(-15).join('\n') }
}
if (!exists(path.join(APP_DIR, 'node_modules'))) {
  g6.fail('install', 'app/node_modules 없음 (S3에서 npm install --prefix app)', 'S3')
} else {
  // oxfmt 0.2는 TS 타입 리터럴의 ';'를 지워 코드를 깨뜨리므로(reference App.tsx에도 같은 흔적) lint에서 뺐다
  for (const [id, cmd] of [['tsc', 'npx --no-install tsc --noEmit'], ['vite-build', 'npx --no-install vite build']]) {
    const res = sh(cmd)
    if (!res.ok) console.log(`--- ${id} ---\n${res.out}`)
    g6.check(id, res.ok, cmd, S4)
  }
}
const r6 = g6.finish()
if (r6.code) process.exit(r6.code)

// ---------- G7 화면 판정 ----------
if (process.env.HARNESS_SKIP_G7 === '1') process.exit(0)
const here = path.dirname(fileURLToPath(import.meta.url))
const g7 = spawnSync(process.execPath, [path.join(here, 'render-check.mjs'), ...(route ? ['--route', route] : [])], { stdio: 'inherit', env: process.env })
process.exit(g7.status ?? 1)
