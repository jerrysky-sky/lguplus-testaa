// S5: G1~G7을 모두 돌리고 harness/report/report.json 한 파일로 합친다. 스크린샷 4장도 저장한다.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { P, exists, readJson } from './lib/common.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const node = (f, ...a) => spawnSync(process.execPath, [path.join(here, f), ...a], { stdio: 'inherit', env: process.env }).status

// 이전 결과를 지우고 새로 센다
fs.rmSync(path.join(P.reportDir, 'gates'), { recursive: true, force: true })

node('gate-spec.mjs')
node('gate-pages.mjs')
node('gate-tokens.mjs')
// G5·G6는 앱 전체 대상, 통과하면 G7 전체 체크 + 스크린샷
const g56 = spawnSync(process.execPath, [path.join(here, 'gate-screen.mjs')], { stdio: 'inherit', env: { ...process.env, HARNESS_SKIP_G7: '1' } }).status
if (g56 === 0) node('render-check.mjs', '--screens')

const dir = path.join(P.reportDir, 'gates')
const gates = exists(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(dir, f))) : []
const results = gates.flatMap((g) => g.results.map((x) => ({ gate: g.gate, ...x })))
const fails = results.filter((x) => x.status === 'fail')
const pendings = results.filter((x) => x.status === 'pending')
const ran = new Set(gates.map((g) => g.gate.split('-')[0]))
const missing = ['G1', 'G2', 'G3', 'G5', 'G6', 'G7'].filter((g) => !ran.has(g))
const ORDER = ['S1', 'S2', 'S3', 'S4', 'S5']
const report = {
  generatedAt: new Date().toISOString(),
  status: fails.length || missing.length ? 'fail' : pendings.length ? 'partial' : 'complete',
  returnTo: fails.map((f) => f.returnTo).sort((a, b) => ORDER.indexOf(a.split(':')[0]) - ORDER.indexOf(b.split(':')[0]))[0] ?? null,
  notRun: missing,
  summary: { pass: results.filter((x) => x.status === 'pass').length, fail: fails.length, pending: pendings.length },
  pending: pendings.map((p) => ({ id: p.id, question: p.question })),
  results,
}
fs.writeFileSync(path.join(P.reportDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\n== 전체 ==\n상태: ${report.status} / 통과 ${report.summary.pass} · 실패 ${report.summary.fail} · 보류 ${report.summary.pending}${missing.length ? ' / 실행 안 됨: ' + missing.join(',') : ''}${report.returnTo ? ' / 복귀: ' + report.returnTo : ''}`)
process.exit(report.status === 'fail' ? 1 : 0)
