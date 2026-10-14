// S3: app/ 뼈대를 만든다. 패키지 버전은 reference/make-export/package.json을 읽어 그대로 맞추고,
// 라우터(app/src/router.gen.tsx)는 spec.json의 라우트에서 생성한다. 화면 파일은 없을 때만 빈 틀을 만든다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, APP_DIR, P, exists, readJson, rel } from './lib/common.mjs'

const ref = readJson(path.join(ROOT, 'reference', 'make-export', 'package.json'))
const spec = readJson(P.spec)
const routes = spec.screens.map((s) => s.route)

const write = (p, s, { keep = false } = {}) => {
  const f = path.join(APP_DIR, p)
  if (keep && exists(f)) return
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, s)
  console.log('생성: ' + rel(f))
}

// @make-kits/lg는 공개 npm에 없다. UI는 Design.md 사양대로 app/src/ui/에 직접 만든다
const deps = { ...ref.dependencies }
delete deps['@make-kits/lg']
// 신청 저장소 (spec Q9). 판정 빌드에서는 연결값을 비워 메모리 저장소로 돈다(gate-screen.mjs)
deps['@supabase/supabase-js'] = '2.117.2'
write('package.json', JSON.stringify({
  name: 'harness-app',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', typecheck: 'tsc --noEmit' },
  dependencies: deps,
  devDependencies: ref.devDependencies,
}, null, 2) + '\n')

write('vite.config.ts', `// 자동 생성 (scripts/scaffold-app.mjs)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
`)

write('tsconfig.json', JSON.stringify({
  compilerOptions: {
    target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', baseUrl: '.',
    paths: { '@/*': ['./src/*'] }, allowImportingTsExtensions: true, resolveJsonModule: true,
    isolatedModules: true, noEmit: true, jsx: 'react-jsx', types: ['node'], strict: true,
    noFallthroughCasesInSwitch: true,
  },
  include: ['src', 'vite.config.ts'],
}, null, 2) + '\n')

write('index.html', `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${spec.screens[0]?.name ?? 'app'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`)

// Supabase 연결값 빈 틀. 값은 사람이 채우고 git에는 올리지 않는다(.gitignore의 .env*.local)
write('.env.local', `# Supabase 프로젝트 연결값 (Supabase 대시보드 > Project Settings > API)
# 브라우저에 노출되는 값이므로 publishable(anon) 키만 넣는다. secret·service_role 키는 넣지 않는다.
# 비워 두면 앱은 브라우저 메모리 저장소를 쓴다.
VITE_PUBLIC_SUPABASE_URL=
VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
`, { keep: true })

write('src/vite-env.d.ts', `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_SUPABASE_URL?: string
  readonly VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
`)
write('src/main.tsx', `// 자동 생성 (scripts/scaffold-app.mjs)
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Router } from './router.gen'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)
`)
write('src/index.css', `@import "tailwindcss";
@import "./styles/tokens.css";

body {
  margin: 0;
  background: var(--color-bg-default);
  color: var(--color-text-primary);
  font-family: var(--font-family-font);
}
`, { keep: true })

// 라우트 → 화면 파일 (pages.json의 file 규칙과 같다)
const fileOf = (r) => {
  const segs = r.split('/').filter(Boolean)
  return segs.length === 1 ? `pages/${segs[0]}/index.tsx` : `pages/${segs.slice(0, -1).join('/')}/${segs.at(-1)}.tsx`
}
routes.forEach((r) => write(`src/${fileOf(r)}`, `// ${r} — page-builder가 채운다\nexport default function Page() {\n  return <main data-stub="${r}" />\n}\n`, { keep: true }))

const imports = routes.map((r, i) => `import Page${i} from './${fileOf(r).replace(/\.tsx$/, '')}'`).join('\n')
const table = routes.map((r, i) => {
  const keys = [...r.matchAll(/\[(\w+)\]/g)].map((m) => m[1])
  const re = '^' + r.replace(/\[(\w+)\]/g, '([^/]+)').replace(/\//g, '\\/') + '$'
  return `  { route: '${r}', re: /${re}/, keys: ${JSON.stringify(keys)}, Component: Page${i} },`
}).join('\n')

write('src/router.gen.tsx', `// 자동 생성 — 직접 수정 금지. 라우트는 harness/spec/spec.json에서 온다 (scripts/scaffold-app.mjs)
import { useEffect, useState, type ComponentType } from 'react'
${imports}

export const ROUTES = ${JSON.stringify(routes)} as const

const TABLE: Array<{ route: string; re: RegExp; keys: string[]; Component: ComponentType }> = [
${table}
]

export type RouteMatch = { route: string; params: Record<string, string>; query: URLSearchParams }

function match(pathname: string, search: string): RouteMatch | null {
  for (const t of TABLE) {
    const m = pathname.match(t.re)
    if (m) return { route: t.route, params: Object.fromEntries(t.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])), query: new URLSearchParams(search) }
  }
  return null
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): RouteMatch {
  const [loc, setLoc] = useState(() => window.location.pathname + window.location.search)
  useEffect(() => {
    const on = () => setLoc(window.location.pathname + window.location.search)
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  const u = new URL(loc, window.location.origin)
  return match(u.pathname, u.search) ?? { route: '', params: {}, query: new URLSearchParams() }
}

export function Router() {
  const m = useRoute()
  const hit = TABLE.find((t) => t.route === m.route)
  useEffect(() => {
    if (!hit) navigate(ROUTES[0], { replace: true })
  }, [hit])
  if (!hit) return null
  const Page = hit.Component
  return <Page key={window.location.pathname} />
}
`)

console.log(`라우트 ${routes.length}개: ${routes.join(' ')}`)
