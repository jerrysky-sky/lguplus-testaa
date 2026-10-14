// G4 훅 (PreToolUse): 에이전트별 편집 폴더 밖 쓰기, 금지 폴더 쓰기, 토큰 밖 값·외부 import가 든 저장을 막는다.
// 막을 때는 종료 코드 2 + stderr(이유)를 돌려준다. Claude Code가 이 이유를 에이전트에게 그대로 전달한다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/common.mjs'
import { scan, fmtHits } from '../lib/scan.mjs'

const block = (msg) => { process.stderr.write(`[G4 차단] ${msg}\n`); process.exit(2) }

let input
try { input = JSON.parse(fs.readFileSync(0, 'utf8')) } catch { process.exit(0) }

const actor = input.agent_type || 'main'
const tool = input.tool_name
const ti = input.tool_input || {}
const win = process.platform === 'win32'
const norm = (p) => { const s = p.split(path.sep).join('/'); return win ? s.toLowerCase() : s }

// 에이전트별 편집 폴더 (R6)
const ZONES = {
  'spec-writer': ['harness/spec/'],
  'page-planner': ['harness/pages/'],
  'page-builder': ['app/src/'],
  judge: [],
}
// 누구도 쓸 수 없는 파일·폴더
const NEVER = ['docs/', 'reference/', 'app/src/styles/tokens.css', 'app/src/router.gen.tsx']
// 메인(오케스트레이터)과 하네스 밖 에이전트가 쓸 수 없는 곳
const MAIN_FORBIDDEN = ['app/', 'harness/spec/', 'harness/pages/', 'harness/report/', ...NEVER]

const within = (r, list) => list.some((z) => r === z.replace(/\/$/, '') || r.startsWith(norm(z)))

function relOf(file) {
  const abs = path.resolve(input.cwd || ROOT, file)
  const r = path.relative(ROOT, abs)
  return { abs, r: norm(r), outside: r.startsWith('..') || path.isAbsolute(r) }
}

function checkWrite(file, newText) {
  const { abs, r, outside } = relOf(file)
  const isAgent = actor in ZONES

  if (!outside && within(r, NEVER)) block(`${r} 은(는) 누구도 수정할 수 없습니다. (docs/·reference/는 읽기 전용, tokens.css·router.gen.tsx는 스크립트가 생성)`)
  if (isAgent) {
    if (outside || !within(r, ZONES[actor]))
      block(`${actor} 의 편집 폴더는 ${ZONES[actor].join(', ') || '(없음 — 읽기 전용)'} 입니다. ${outside ? file : r} 에는 쓸 수 없습니다.`)
    if (r === 'harness/rules.json') block('harness/rules.json 은 승인된 판정 규칙이라 에이전트가 고칠 수 없습니다.')
  } else if (!outside && within(r, MAIN_FORBIDDEN)) {
    block(`오케스트레이터(${actor})는 ${r} 에 직접 쓰지 않습니다. 해당 단계 에이전트를 부르거나 스크립트를 실행하세요.`)
  }

  // app/src 코드 파일이면 토큰 밖 값·import 검사
  if (!outside && r.startsWith('app/src/') && /\.(tsx?|jsx?|css)$/.test(r) && newText != null) {
    const rulesFile = path.join(ROOT, 'harness', 'rules.json')
    const allowedImports = fs.existsSync(rulesFile) ? JSON.parse(fs.readFileSync(rulesFile, 'utf8')).allowedImports : []
    const hits = scan(newText, abs, { allowedImports })
    if (hits.length) block(`토큰 밖 값 또는 허용되지 않은 import ${hits.length}건 — 저장하지 않았습니다.\n${fmtHits(r, hits)}`)
  }
}

if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const file = ti.file_path || ti.notebook_path
  if (!file) process.exit(0)
  const text = tool === 'Write' ? ti.content
    : tool === 'Edit' ? ti.new_string
    : tool === 'MultiEdit' ? (ti.edits || []).map((e) => e.new_string).join('\n')
    : ti.new_source
  checkWrite(file, text)
  process.exit(0)
}

// Bash·PowerShell: 금지 폴더로 쓰는 명령을 막는다 (최선 노력 수준)
if (['Bash', 'PowerShell'].includes(tool)) {
  const cmd = String(ti.command || '')
  const zones = actor in ZONES ? NEVER : MAIN_FORBIDDEN
  const zoneRe = (z) => {
    const body = z.replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '[/\\\\]')
    return new RegExp(`(^|[\\s"'=(:/\\\\])${body}(?=[/\\\\\\s"')]|$)`, 'i')
  }
  const touched = zones.filter((z) => zoneRe(z).test(cmd))
  if (touched.length) {
    const redirect = [...cmd.matchAll(/(?:^|[^0-9&>])>>?\s*["']?([^\s"';|&]+)/g)].some((m) => zones.some((z) => zoneRe(z).test(' ' + m[1])))
    const writeVerb = /\b(tee|cp|mv|rm|rmdir|touch|mkdir|sed\s+-i|perl\s+-pi|Set-Content|Add-Content|Out-File|New-Item|Remove-Item|Copy-Item|Move-Item|Rename-Item|writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|writeFile)\b/i.test(cmd)
    if (redirect || writeVerb) block(`명령이 보호된 경로(${touched.join(', ')})에 쓰려고 합니다. 스크립트(node scripts/…)나 해당 단계 에이전트를 쓰세요.\n명령: ${cmd.slice(0, 200)}`)
  }
}
process.exit(0)
