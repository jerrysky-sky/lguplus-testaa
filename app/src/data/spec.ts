// 요금제 데이터·문구의 단일 출처: harness/spec/spec.json (여기서 값을 새로 적지 않는다)
import specJson from '../../../harness/spec/spec.json'

export type Plan = {
  id: string
  name: string
  monthly_price: number
  data_gb: number | null
  data_label: string
  throttle_mbps: number | null
  price_after_discount: number | null
  discount_months: number | null
  description: string
  recommended: boolean
}

export const plans: Plan[] = specJson.plans as Plan[]
export const messages: Record<string, string> = specJson.messages

export const findPlan = (id: string | null | undefined): Plan | undefined =>
  id ? plans.find((p) => p.id === id) : undefined

/** 요금제별 포함 혜택 (spec.json screens[/plans/[id]].features[].benefitsByPlan). 없으면 빈 배열 */
export const benefitsFor = (id: string): string[] => {
  for (const s of specJson.screens) {
    for (const f of s.features as Array<{ benefitsByPlan?: Record<string, string[]> }>) {
      if (f.benefitsByPlan) return f.benefitsByPlan[id] ?? []
    }
  }
  return []
}

/** 매달 내는 금액 낮은 순 */
export const plansByPrice = (): Plan[] => [...plans].sort((a, b) => a.monthly_price - b.monthly_price)

/** 천 단위 쉼표 + 원 */
export const formatWon = (n: number): string => `${n.toLocaleString('ko-KR')}원`

/** "소진 후 {값}Mbps로 제한" 또는 "속도 제한 없음" */
export const throttleText = (p: Plan): string =>
  p.throttle_mbps != null
    ? messages.throttle_limited.replace('{값}', String(p.throttle_mbps))
    : messages.throttle_none

export const hasDiscount = (p: Plan): boolean => p.discount_months != null && p.price_after_discount != null

/** "{discount_months + 1}개월째부터 {price_after_discount}원" — 할인 요금제만, 아니면 null */
export const afterDiscountText = (p: Plan): string | null =>
  hasDiscount(p)
    ? messages.price_after_discount
        .replace('{discount_months + 1}', String((p.discount_months as number) + 1))
        .replace('{price_after_discount}', (p.price_after_discount as number).toLocaleString('ko-KR'))
    : null
