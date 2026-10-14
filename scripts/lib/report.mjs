// 게이트 결과 기록: report.json 쓰기, returnTo 결정, 3회 연속 실패 세기
import fs from 'node:fs'
import path from 'node:path'
import { P, exists, readJson } from './common.mjs'

const ORDER = ['S1', 'S2', 'S3', 'S4', 'S5']
const STREAK_LIMIT = 3

export class Report {
  constructor(gate, route = null) {
    this.gate = gate
    this.route = route
    this.results = []
  }
  pass(id, detail = '') { this.results.push({ id, status: 'pass', detail }) }
  fail(id, detail, returnTo) { this.results.push({ id, status: 'fail', detail, returnTo }) }
  pending(id, detail, question = null) { this.results.push({ id, status: 'pending', detail, question }) }
  check(id, ok, detail, returnTo) { ok ? this.pass(id, detail) : this.fail(id, detail, returnTo) }

  get fails() { return this.results.filter((r) => r.status === 'fail') }

  // 콘솔 출력 + report.json 저장 + 종료 코드 반환
  finish({ write = true } = {}) {
    const fails = this.fails
    const pendings = this.results.filter((r) => r.status === 'pending')
    const returnTo = fails.length
      ? fails.map((f) => f.returnTo).sort((a, b) => ORDER.indexOf(a.split(':')[0]) - ORDER.indexOf(b.split(':')[0]))[0]
      : null
    const status = fails.length ? 'fail' : pendings.length ? 'partial' : 'complete'
    const streak = this.#streak(fails.length > 0)

    const doc = { gate: this.gate, route: this.route, generatedAt: new Date().toISOString(), status, returnTo, streak, results: this.results }
    if (write) {
      const dir = path.join(P.reportDir, 'gates')
      fs.mkdirSync(dir, { recursive: true })
      const name = this.route ? `${this.gate}${this.route.replace(/[\/\[\]]/g, '_')}.json` : `${this.gate}.json`
      fs.writeFileSync(path.join(dir, name), JSON.stringify(doc, null, 2))
    }

    const icon = { pass: 'PASS', fail: 'FAIL', pending: 'HOLD' }
    console.log(`\n== ${this.gate}${this.route ? ' ' + this.route : ''} ==`)
    for (const r of this.results) console.log(`${icon[r.status]}  ${r.id}  ${r.detail || ''}${r.returnTo ? '  → ' + r.returnTo : ''}${r.question ? '  (' + r.question + ')' : ''}`)
    console.log(`결과: ${status}${returnTo ? ' / 복귀: ' + returnTo : ''}${fails.length ? ` / 연속 실패 ${streak}회` : ''}`)
    if (fails.length && streak >= STREAK_LIMIT) {
      console.log(`STOP: 같은 게이트가 ${STREAK_LIMIT}번 연속 실패했습니다. 사람에게 넘기세요.`)
      return { code: 3, doc }
    }
    return { code: fails.length ? 1 : 0, doc }
  }

  #streak(failed) {
    const f = path.join(P.reportDir, 'streak.json')
    const s = exists(f) ? readJson(f) : {}
    const key = `${this.gate}${this.route ? ':' + this.route : ''}`
    s[key] = failed ? (s[key] || 0) + 1 : 0
    fs.mkdirSync(P.reportDir, { recursive: true })
    fs.writeFileSync(f, JSON.stringify(s, null, 2))
    return s[key]
  }
}

export function loadRules() {
  return readJson(P.rules)
}
