// S3: docs/tokens.json → app/src/styles/tokens.css (Tailwind v4 @theme). 같은 입력이면 항상 같은 출력.
import fs from 'node:fs'
import path from 'node:path'
import { P, sha256, rel } from './lib/common.mjs'
import { loadTokens, varName } from './lib/tokens.mjs'

const t = loadTokens()
const px = (v) => `${v}px`
const lines = []

lines.push(`/* 자동 생성 파일 — 직접 수정 금지. node scripts/gen-tokens.mjs 로 다시 만든다. */`)
lines.push(`/* source: docs/tokens.json sha256:${sha256(P.tokens)} */`)
lines.push('')
lines.push('@theme static {')
// Tailwind 기본 팔레트·간격·모서리·글자 크기를 지워 토큰 이름만 남긴다
for (const ns of ['--color-*', '--spacing-*', '--radius-*', '--text-*', '--font-*']) lines.push(`  ${ns}: initial;`)

for (const tok of t.tokens) {
  const v = tok.values.Default
  let value
  if (tok.type === 'color') {
    value = typeof v === 'object' ? `var(${varName(t.byName.get(v.alias.split('/').slice(1).join('/')))})` : v
  } else if (tok.type === 'string') value = `"${v}", sans-serif`
  else value = px(v)
  lines.push(`  ${varName(tok)}: ${value};`)
}
lines.push('}')
lines.push('')

// 텍스트 스타일 → typo-* 유틸리티 (값은 tokens.json textStyles 그대로)
for (const s of t.json.textStyles || []) {
  const name = s.name.replace(/\//g, '-')
  const size = typeof s.fontSize === 'object'
    ? `var(${varName(t.byName.get(s.fontSize.variable.split('/').slice(1).join('/')))})`
    : px(s.fontSize)
  const family = `var(${varName(t.byName.get(s.fontFamily.variable.split('/').slice(1).join('/')))})`
  lines.push(`@utility typo-${name} {`)
  lines.push(`  font-family: ${family};`)
  lines.push(`  font-size: ${size};`)
  lines.push(`  line-height: ${px(s.lineHeight)};`)
  lines.push(`  font-weight: ${s.fontWeight};`)
  lines.push(`  letter-spacing: ${s.letterSpacing}%;`)
  lines.push('}')
}

fs.mkdirSync(path.dirname(P.tokensCss), { recursive: true })
fs.writeFileSync(P.tokensCss, lines.join('\n') + '\n')
console.log(`생성: ${rel(P.tokensCss)} (토큰 ${t.tokens.length}개, 텍스트 스타일 ${(t.json.textStyles || []).length}개)`)
