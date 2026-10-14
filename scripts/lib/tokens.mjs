// tokens.json(SSOT)에서 CSS 변수 이름과 허용 값을 매번 직접 읽어 온다. 값을 여기 적지 않는다.
import { P, readJson } from './common.mjs'

const slug = (s) => s.replace(/\//g, '-')

// 토큰 1개 → CSS 변수 이름 (Tailwind v4 테마 네임스페이스에 맞춤)
export function varName(t) {
  if (t.type === 'color') return `--color-${slug(t.name)}`
  if (t.name.startsWith('font-family/')) return `--font-${slug(t.name.slice('font-family/'.length))}`
  if (t.name.startsWith('font-size/')) return `--text-${slug(t.name.slice('font-size/'.length))}`
  if (t.collection === 'spacing') return `--spacing-${t.name.split('/')[1]}`
  if (t.collection === 'radius') return `--radius-${t.name.split('/')[1]}`
  return `--${slug(t.name)}`
}

export function loadTokens() {
  const json = readJson(P.tokens)
  const tokens = json.tokens
  const byName = new Map(tokens.map((t) => [t.name, t]))
  const num = (c) => tokens.filter((t) => t.collection === c).map((t) => t.values.Default)

  const spacingNames = tokens.filter((t) => t.collection === 'spacing').map((t) => t.name.split('/')[1])
  const radiusNames = tokens.filter((t) => t.collection === 'radius').map((t) => t.name.split('/')[1])
  const fontSizeNames = tokens.filter((t) => t.name.startsWith('font-size/')).map((t) => t.name.slice(10))
  // primitive 색은 화면에 직접 쓰지 않는다(Design.md 1장) → 클래스 허용 목록은 semantic만
  const semanticColorNames = tokens
    .filter((t) => t.type === 'color' && t.collection === 'semantic')
    .map((t) => slug(t.name))
  const textStyleNames = (json.textStyles || []).map((s) => slug(s.name))

  const fontSizes = tokens.filter((t) => t.name.startsWith('font-size/')).map((t) => t.values.Default)
  const textStyleNums = (json.textStyles || []).flatMap((s) => [
    typeof s.fontSize === 'object' ? s.fontSize.resolved : s.fontSize,
    s.lineHeight,
  ])
  // px로 쓸 수 있는 숫자 = tokens.json에 있는 값. CSS 속성을 알 수 있으면 그 종류의 토큰 값만 허용한다.
  const allowedPx = new Set([...num('spacing'), ...num('radius'), ...fontSizes, ...textStyleNums, 0])
  const pxByKind = {
    spacing: new Set([...num('spacing'), 0]),
    radius: new Set([...num('radius'), 0]),
    fontSize: new Set([...fontSizes, ...(json.textStyles || []).map((s) => (typeof s.fontSize === 'object' ? s.fontSize.resolved : s.fontSize))]),
    lineHeight: new Set((json.textStyles || []).map((s) => s.lineHeight)),
  }

  return {
    json,
    tokens,
    byName,
    varNames: new Set(tokens.map(varName)),
    spacingNames,
    radiusNames,
    fontSizeNames,
    semanticColorNames,
    textStyleNames,
    allowedPx,
    pxByKind,
  }
}
