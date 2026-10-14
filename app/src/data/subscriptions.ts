// 구독 신청 저장소 — 브라우저 메모리 가상 저장소 (spec.json decisions.storage, Q9)
// /apply → /complete 전달도 앱 상태(이 모듈의 메모리)로 한다 (Q8). URL 쿼리·sessionStorage·localStorage 사용 안 함.
// 새로고침하면 값이 사라지는 것이 의도된 동작이다 (/complete는 값이 없으면 /plans로 이동).

export type Subscription = {
  id: string
  name: string
  phone: string
  plan_id: string
  monthly_price: number
  agreed_privacy: boolean
  created_at: string
}

export type SubscriptionInput = Omit<Subscription, 'id' | 'created_at'>

const store: Subscription[] = []
let seq = 0
let lastSaved: Subscription | null = null

const pad2 = (n: number) => String(n).padStart(2, '0')

/** spec.json format.subscription_id: UP{YYYYMMDD}-{2자리 순번}, 순번은 저장소 안에서 01부터 1씩 증가 */
function nextId(at: Date): string {
  seq += 1
  const ymd = `${at.getFullYear()}${pad2(at.getMonth() + 1)}${pad2(at.getDate())}`
  return `UP${ymd}-${pad2(seq)}`
}

/** Subscription 1건 저장. 같은 번호·같은 요금제 반복 신청도 막지 않는다. 실패하면 reject */
export async function saveSubscription(input: SubscriptionInput): Promise<Subscription> {
  await Promise.resolve()
  if (!input.agreed_privacy) throw new Error('agreed_privacy must be true')
  const at = new Date()
  const sub: Subscription = { ...input, id: nextId(at), created_at: at.toISOString() }
  store.push(sub)
  lastSaved = sub
  return sub
}

/** 방금 저장한 Subscription (앱 상태). 없으면 null */
export const getLastSubscription = (): Subscription | null => lastSaved
