// 이어 하기: git log에서 마지막 [S…] 표시를 읽어 다음 단계를 알려 준다.
import { execSync } from 'node:child_process'
import { ROOT, P, exists, readJson } from './lib/common.mjs'

const log = (() => {
  try { return execSync('git log --format=%s -n 200', { cwd: ROOT, encoding: 'utf8' }).split('\n') } catch { return [] }
})()
const branch = (() => { try { return execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf8' }).trim() } catch { return '' } })()
const routes = exists(P.spec) ? readJson(P.spec).screens.map((s) => s.route) : ['/plans', '/plans/[id]', '/apply', '/complete']

const seq = ['S0', 'S1', 'S2', 'S3', ...routes.map((r) => `S4:${r}`), 'S5']
const last = log.map((s) => s.match(/^\[(S\d(?::[^\]\s]+(?:\])?)?)\]/)?.[1]).find(Boolean) ?? null
// "[S4:/plans/[id]]" 처럼 대괄호가 겹치는 경우를 정리
const lastNorm = last ? seq.find((s) => last.startsWith(s) && (last === s || last === s + ']')) ?? last : null
const idx = lastNorm ? seq.indexOf(lastNorm) : -1
const next = idx === -1 ? (branch.startsWith('harness/run-') ? 'S1' : 'S0') : seq[idx + 1] ?? 'done'

console.log(JSON.stringify({ branch, last: lastNorm, next }, null, 2))
console.log(next === 'done' ? '모든 단계가 끝났습니다.' : next === 'S0' ? 'run 브랜치가 없습니다. "시작"으로 harness/run-<날짜> 브랜치를 만드세요.' : `다음 단계: ${next}`)
