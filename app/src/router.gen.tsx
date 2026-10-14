// 자동 생성 — 직접 수정 금지. 라우트는 harness/spec/spec.json에서 온다 (scripts/scaffold-app.mjs)
import { useEffect, useState, type ComponentType } from 'react'
import Page0 from './pages/plans/index'
import Page1 from './pages/plans/[id]'
import Page2 from './pages/apply/index'
import Page3 from './pages/complete/index'

export const ROUTES = ["/plans","/plans/[id]","/apply","/complete"] as const

const TABLE: Array<{ route: string; re: RegExp; keys: string[]; Component: ComponentType }> = [
  { route: '/plans', re: /^\/plans$/, keys: [], Component: Page0 },
  { route: '/plans/[id]', re: /^\/plans\/([^\/]+)$/, keys: ["id"], Component: Page1 },
  { route: '/apply', re: /^\/apply$/, keys: [], Component: Page2 },
  { route: '/complete', re: /^\/complete$/, keys: [], Component: Page3 },
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
