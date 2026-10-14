// G4(훅)와 G5(정적 검사)가 함께 쓰는 "토큰 밖 값·외부 import" 검출기
import path from 'node:path'
import { loadTokens } from './tokens.mjs'

const CSS_COLOR_NAMES =
  'white|black|red|blue|green|gray|grey|yellow|orange|purple|pink|brown|navy|silver|gold|teal|cyan|magenta|lime|maroon|olive|aqua|fuchsia'

const SPACING_UTIL =
  '(?:p|px|py|ps|pe|pt|pr|pb|pl|m|mx|my|ms|me|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|inset-x|inset-y|translate-x|translate-y|basis|scroll-m|scroll-p)'
const COLOR_UTIL =
  '(?:bg|text|border|border-t|border-r|border-b|border-l|border-x|border-y|ring|outline|fill|stroke|divide|placeholder|from|via|to|accent|caret|decoration|shadow)'
const NON_COLOR_SUFFIX =
  /^(left|right|center|justify|start|end|wrap|nowrap|ellipsis|clip|balance|pretty|none|solid|dashed|dotted|double|hidden|collapse|separate|inherit|current|transparent|x|y|t|r|b|l|0|auto|inset|offset-\d+)$/

let cache
const T = () => (cache ??= loadTokens())

// text: 파일 내용(또는 Edit의 새 문자열), file: 경로, opts.allowedImports
export function scan(text, file, opts = {}) {
  const t = T()
  const ext = path.extname(file)
  const isCss = ext === '.css'
  const out = []
  const lines = text.split(/\r?\n/)
  const hit = (rule, i, match, why) => out.push({ rule, line: i + 1, match, why })

  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '')

    // 1) 색 리터럴
    for (const m of code.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (!/^#[0-9a-fA-F]+$/.test(m[0])) continue
      hit('color-literal', i, m[0], '색은 토큰으로만 쓴다')
    }
    for (const m of code.matchAll(/\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/g))
      hit('color-literal', i, m[0], '색 함수 금지')
    if (isCss) {
      const re = new RegExp(`(?:color|background|background-color|border(?:-[a-z]+)?|fill|stroke|outline)\\s*:[^;]*\\b(${CSS_COLOR_NAMES})\\b`, 'gi')
      for (const m of code.matchAll(re)) hit('color-literal', i, m[1], '색 이름 금지')
    }

    // 2) Tailwind 임의 값
    for (const m of code.matchAll(/(?<![\w$])-?[a-z][a-z0-9-]*-\[[^\]\s"'`]+\]/g)) hit('tw-arbitrary', i, m[0], 'Tailwind 임의 값 [..] 금지')
    for (const m of code.matchAll(/(?<=["'`\s])\[[a-z-]+:[^\]\s]+\]/g)) hit('tw-arbitrary', i, m[0], 'Tailwind 임의 속성 [..] 금지')
    for (const m of code.matchAll(/(?<![\w$])-?[a-z][a-z0-9-]*-\(--[\w-]+\)/g)) hit('tw-arbitrary', i, m[0], 'Tailwind 변수 단축 (..) 금지')

    // 3) Tailwind 클래스 값이 토큰 이름인지
    if (!isCss) {
      const sp = new RegExp(`(?<![\\w-])-?${SPACING_UTIL}-([0-9]+(?:\\.[0-9]+)?|px)(?![\\w-])`, 'g')
      for (const m of code.matchAll(sp))
        if (m[1] !== '0' && !t.spacingNames.includes(m[1])) hit('tw-spacing', i, m[0], `spacing 토큰 아님 (허용: ${t.spacingNames.join(',')})`)
      for (const m of code.matchAll(/(?<![\w-])rounded(?:-(?:t|r|b|l|tl|tr|br|bl|s|e|ss|se|es|ee))?-([a-z0-9]+)(?![\w-])/g))
        if (m[1] !== 'none' && !t.radiusNames.includes(m[1])) hit('tw-radius', i, m[0], `radius 토큰 아님 (허용: ${t.radiusNames.join(',')})`)
      const cr = new RegExp(`(?<![\\w-])${COLOR_UTIL}-([a-z][a-z0-9-]*)(?:\\/\\d+)?(?![\\w-])`, 'g')
      for (const m of code.matchAll(cr)) {
        const v = m[1]
        if (NON_COLOR_SUFFIX.test(v)) continue
        if (m[0].startsWith('text-') && t.fontSizeNames.includes(v)) continue
        if (/^border/.test(m[0]) && /^\d+$/.test(v)) continue // 두께는 아래에서
        if (t.semanticColorNames.includes(v)) continue
        if (/^(xs|sm|base|lg|[2-9]?xl)$/.test(v) || /-\d{2,3}$/.test(v) || CSS_COLOR_NAMES.split('|').includes(v))
          hit('tw-color', i, m[0], 'Tailwind 기본 팔레트·크기 금지. semantic 토큰 이름을 쓴다')
      }
      for (const m of code.matchAll(/(?<![\w-])border(?:-[trblxy])?-(\d+)(?![\w-])/g))
        if (m[1] !== '0') hit('tw-border-width', i, m[0], '테두리 두께는 border(1px) 또는 border-0만')
      for (const m of code.matchAll(/(?<![\w-])(leading|text)-(\d+)(?![\w-])/g))
        hit('tw-typo', i, m[0], '글자 크기·줄높이는 typo-* 클래스로')
    }

    // 4) px·rem·em·% 숫자 (CSS 속성이 보이면 그 종류의 토큰 값만)
    const kindOf = (prop) => /radius/.test(prop) ? 'radius'
      : /^font-size$/.test(prop) ? 'fontSize'
      : /^line-height$/.test(prop) ? 'lineHeight'
      : /^(padding|margin|gap|row-gap|column-gap|width|height|min-|max-|top|right|bottom|left|inset|flex-basis)/.test(prop) ? 'spacing'
      : null
    for (const m of code.matchAll(/(?<![\w.#-])(-?\d*\.?\d+)(px|rem|em)\b/g)) {
      const n = Math.abs(Number(m[1]))
      const prop = isCss ? code.slice(0, m.index).match(/([a-z-]+)\s*:[^;:{}]*$/)?.[1] || '' : ''
      const kind = kindOf(prop)
      if (m[2] !== 'px') { if (n !== 0) hit('unit', i, m[0], 'rem·em 금지 (px 토큰 값만)'); continue }
      if (n === 1 && /border/.test(code)) continue
      const set = kind ? t.pxByKind[kind] : t.allowedPx
      if (!set.has(n)) hit('unit', i, m[0], kind ? `${prop}에 쓸 수 있는 ${kind} 토큰 값이 아님` : 'tokens.json에 없는 px 값')
    }
    if (isCss) for (const m of code.matchAll(/(?<![\w.-])(\d*\.?\d+)%/g)) if (!['0', '100'].includes(m[1])) hit('unit', i, m[0], '%는 0·100%만')

    // 5) var()는 tokens.css에 있는 이름만
    for (const m of code.matchAll(/var\(\s*(--[\w-]+)/g))
      if (!t.varNames.has(m[1])) hit('unknown-var', i, m[1], 'tokens.css에 없는 변수')
  })

  // 6) style={{ }} 에 숫자·색 직접 쓰기
  for (const m of text.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
    const body = m[1]
    if (/:\s*-?\d/.test(body) || /['"`][^'"`]*\d[^'"`]*['"`]/.test(body)) {
      const line = text.slice(0, m.index).split('\n').length - 1
      hit('inline-style', line, m[0].slice(0, 60), 'style에 숫자·색 직접 쓰기 금지')
    }
  }

  // 7) import 허용 목록 (CSS의 @import는 대상 아님)
  const allowed = opts.allowedImports || []
  if (!isCss) for (const m of text.matchAll(/(?:import\s[^'"]*?from\s*|import\s*\(?\s*|require\(\s*)['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    if (spec.startsWith('.') || spec.startsWith('@/')) continue
    if (allowed.some((a) => spec === a || spec.startsWith(a + '/'))) continue
    const line = text.slice(0, m.index).split('\n').length - 1
    hit('import', line, spec, `허용되지 않은 import (허용: ${allowed.join(', ')})`)
  }

  return out
}

export const fmtHits = (file, hits) => hits.map((h) => `${file}:${h.line}  [${h.rule}] ${h.match} — ${h.why}`).join('\n')
