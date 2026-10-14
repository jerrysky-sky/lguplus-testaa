// 하네스 공통: 경로·파일 읽기·문서 파싱
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// 자가 점검(scripts/selftest.mjs)에서만 다른 위치를 쓴다
export const APP_DIR = process.env.HARNESS_APP_DIR
  ? path.resolve(process.env.HARNESS_APP_DIR)
  : path.join(ROOT, 'app')

export const P = {
  prd: path.join(ROOT, 'docs', 'PRD.md'),
  screens: path.join(ROOT, 'docs', 'screens.md'),
  design: path.join(ROOT, 'docs', 'Design.md'),
  tokens: path.join(ROOT, 'docs', 'tokens.json'),
  rules: path.join(ROOT, 'harness', 'rules.json'),
  spec: process.env.HARNESS_SPEC || path.join(ROOT, 'harness', 'spec', 'spec.json'),
  questions: process.env.HARNESS_QUESTIONS || path.join(ROOT, 'harness', 'spec', 'open-questions.md'),
  pages: process.env.HARNESS_PAGES || path.join(ROOT, 'harness', 'pages', 'pages.json'),
  reportDir: process.env.HARNESS_REPORT_DIR || path.join(ROOT, 'harness', 'report'),
  appSrc: path.join(APP_DIR, 'src'),
  tokensCss: path.join(APP_DIR, 'src', 'styles', 'tokens.css'),
  routerGen: path.join(APP_DIR, 'src', 'router.gen.tsx'),
}

export const read = (p) => fs.readFileSync(p, 'utf8')
export const exists = (p) => fs.existsSync(p)
export const readJson = (p) => JSON.parse(read(p))
export const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')

export function walk(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.css']) {
  if (!exists(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, exts))
    else if (exts.includes(path.extname(e.name))) out.push(p)
  }
  return out
}

export const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

// "39,000원" → 39000, "할인 없음" → null
export const won = (s) => {
  const m = String(s).match(/([\d,]+)원/)
  return m ? Number(m[1].replace(/,/g, '')) : null
}
export const fmtWon = (n) => n.toLocaleString('ko-KR') + '원'

// ---------- PRD 파싱 ----------
export function prdLines() {
  return read(P.prd).split(/\r?\n/)
}

export function prdRoutes() {
  const lines = prdLines()
  const i = lines.findIndex((l) => l.startsWith('### 화면 구조'))
  const out = []
  for (let k = i + 1; k < lines.length && !lines[k].startsWith('###'); k++) {
    const m = lines[k].match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/)
    if (m) out.push({ order: Number(m[1]), name: m[2], route: m[3] })
  }
  return out
}

export function prdPlans() {
  const lines = prdLines()
  const plans = []
  for (const l of lines) {
    if (!/^\|\s*p\d+\s*\|/.test(l)) continue
    const c = l.split('|').slice(1, -1).map((s) => s.trim())
    const [id, name, price, period, data, throttle, after, description] = c
    const dm = period.match(/(\d+)개월/)
    const gb = data.match(/(\d+)GB/)
    const mb = throttle.match(/(\d+)Mbps/)
    plans.push({
      id,
      name,
      monthly_price: won(price),
      data_gb: gb ? Number(gb[1]) : null,
      data_label: data,
      throttle_mbps: mb ? Number(mb[1]) : null,
      price_after_discount: won(after),
      discount_months: dm ? Number(dm[1]) : null,
      description,
    })
  }
  const rec = lines.join('\n').match(/recommended:.*?((?:p\d+[\s,]*)+)만 true/)
  const recIds = rec ? rec[1].match(/p\d+/g) : []
  for (const p of plans) p.recommended = recIds.includes(p.id)
  return plans
}

export function prdRules() {
  const lines = prdLines()
  const i = lines.findIndex((l) => l.startsWith('### 어기면 안 되는 것'))
  const out = []
  for (let k = i + 1; k < lines.length && !lines[k].startsWith('---'); k++) {
    const m = lines[k].match(/^(\d+)\.\s+(.*)$/)
    if (m) out.push({ no: Number(m[1]), text: m[2].trim() })
  }
  return out
}

export function prdErrorMessages() {
  const lines = prdLines()
  const i = lines.findIndex((l) => /^\|\s*상황\s*\|\s*안내 문구\s*\|/.test(l))
  const out = []
  for (let k = i + 2; k < lines.length && lines[k].startsWith('|'); k++) {
    const c = lines[k].split('|').slice(1, -1).map((s) => s.trim())
    out.push({ situation: c[0], text: c[1], where: c[2] })
  }
  return out
}

export function prdTbdLines() {
  return prdLines()
    .map((l, i) => ({ line: i + 1, text: l }))
    .filter((x) => x.text.includes('확인 필요'))
}

// ---------- screens.md / Design.md 파싱 ----------
export function screensComponents() {
  const lines = read(P.screens).split(/\r?\n/)
  const out = {}
  let route = null
  let section = null
  for (const l of lines) {
    if (l.startsWith('### ')) section = l.slice(4).trim()
    else if (section === '라우트' && l.trim().startsWith('/')) {
      route = l.trim()
      out[route] = []
    } else if (section === '구성 요소' && route && /^-\s+/.test(l)) {
      out[route].push(l.replace(/^-\s+/, '').split(':')[0].trim())
    }
  }
  return out
}

export function designComponents() {
  return [...read(P.design).matchAll(/^####\s+`([^`]+)`/gm)].map((m) => m[1])
}

export const normRoute = (to) => String(to).split('?')[0].replace(/\/p\d+$/, '/[id]')
