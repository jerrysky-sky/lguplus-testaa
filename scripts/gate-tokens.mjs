// G3: tokens.css가 tokens.json에서 그대로 만들어졌는지 센다. 실패 → S3 (스크립트 재실행)
import { P, exists, read, readJson, sha256 } from './lib/common.mjs'
import { loadTokens, varName } from './lib/tokens.mjs'
import { Report } from './lib/report.mjs'

const r = new Report('G3-tokens')
const S3 = 'S3'
const t = loadTokens()

if (!exists(P.tokensCss)) {
  r.fail('tokens-css-exists', 'app/src/styles/tokens.css 없음', S3)
} else {
  const css = read(P.tokensCss)
  const h = css.match(/sha256:([0-9a-f]{64})/)?.[1]
  r.check('hash', h === sha256(P.tokens), h ? '기록된 해시와 tokens.json 해시 비교' : '해시 주석 없음', S3)

  const declared = [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1])
  const want = t.tokens.map(varName)
  const extra = declared.filter((d) => !want.includes(d))
  const lack = want.filter((w) => !declared.includes(w))
  r.check('var-count', declared.length === want.length && !extra.length && !lack.length,
    `CSS 변수 ${declared.length}개 / 토큰 ${want.length}개${extra.length ? ' / 토큰 밖: ' + extra.join(',') : ''}${lack.length ? ' / 빠짐: ' + lack.join(',') : ''}`, S3)

  const styles = (t.json.textStyles || []).length
  const utils = [...css.matchAll(/^@utility typo-/gm)].length
  r.check('text-styles', utils === styles, `typo-* ${utils}개 / 텍스트 스타일 ${styles}개`, S3)
}

// 참고: tokens.json meta.tokenCount와 실제 개수가 다르면 알림(docs는 읽기 전용이라 실패 처리하지 않음)
const meta = readJson(P.tokens).meta?.tokenCount
if (meta != null && meta !== t.tokens.length) r.pass('meta-note', `참고: meta.tokenCount ${meta} ≠ 실제 ${t.tokens.length} (docs 수정은 사람 몫)`)

process.exit(r.finish().code)
