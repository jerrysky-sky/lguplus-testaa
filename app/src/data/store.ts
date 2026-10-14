// 구독 신청 저장소 (harness/spec/spec.json storage, Q8·Q9·Q10)
// - 연결값 VITE_PUBLIC_SUPABASE_URL·VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 둘 다 있으면
//   Supabase DB 함수(rpc) create_subscription·get_subscription만 호출한다. 테이블 직접 접근 없음.
// - 하나라도 비어 있으면 같은 함수 모양의 브라우저 메모리 저장소를 쓴다.
// - /apply → /complete 전달은 이 모듈의 handoff(앱 상태)로 { id, subscription_no }만 넘긴다.
//   URL 쿼리·sessionStorage·localStorage는 쓰지 않는다.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { findPlan } from './spec'

export type CreateSubscriptionInput = {
  planId: string
  name: string
  phone: string
  agreedPrivacy: boolean
}

export type CreatedSubscription = {
  id: string
  subscription_no: string
  created_at: string
}

export type SubscriptionView = {
  subscription_no: string
  plan_id: string
  plan_name: string
  monthly_price: number
  applicant_name_masked: string
  created_at: string
}

export type Handoff = { id: string; subscription_no: string }

// ---------- 앱 상태 전달 (handoff) ----------
let handoff: Handoff | null = null

export const setHandoff = (v: Handoff | null): void => {
  handoff = v ? { id: v.id, subscription_no: v.subscription_no } : null
}
export const getHandoff = (): Handoff | null => handoff

// ---------- Supabase ----------
const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL
const key = import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const firstRow = <T,>(data: unknown): T | null => {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null
  return (data as T | null) ?? null
}

async function remoteCreate(input: CreateSubscriptionInput): Promise<CreatedSubscription> {
  const { data, error } = await (supabase as SupabaseClient).rpc('create_subscription', {
    p_plan_id: input.planId,
    p_name: input.name,
    p_phone: input.phone,
    p_agreed_privacy: input.agreedPrivacy,
  })
  if (error) throw new Error(error.message)
  const row = firstRow<CreatedSubscription>(data)
  if (!row) throw new Error('save_failed')
  return { id: row.id, subscription_no: row.subscription_no, created_at: row.created_at }
}

async function remoteGet(id: string): Promise<SubscriptionView | null> {
  const { data, error } = await (supabase as SupabaseClient).rpc('get_subscription', { p_id: id })
  if (error) throw new Error(error.message)
  return firstRow<SubscriptionView>(data)
}

// ---------- 브라우저 메모리 저장소 (연결값이 비었을 때) ----------
type MemoryRow = {
  id: string
  subscription_no: string
  plan_id: string
  plan_name: string
  monthly_price: number
  name: string
  phone: string
  agreed_privacy: boolean
  created_at: string
}

const memory = new Map<string, MemoryRow>()
const seqByDay = new Map<string, number>()

const NAME_RE = /^[가-힣a-zA-Z]{2,20}$/
const PHONE_RE = /^010\d{8}$/
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 한국 시간 기준 YYYYMMDD */
const kstYmd = (at: Date): string => {
  const k = new Date(at.getTime() + KST_OFFSET_MS)
  const y = k.getUTCFullYear()
  const m = String(k.getUTCMonth() + 1).padStart(2, '0')
  const d = String(k.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** spec.json format.subscription_id: UP{YYYYMMDD}-{2자리 순번}, 날짜별 순번, 100건 이상이면 세 자리 */
const nextSubscriptionNo = (at: Date): string => {
  const ymd = kstYmd(at)
  const n = (seqByDay.get(ymd) ?? 0) + 1
  seqByDay.set(ymd, n)
  return `UP${ymd}-${String(n).padStart(2, '0')}`
}

/** 첫 글자 + 나머지 `*` */
const maskName = (name: string): string => {
  const chars = Array.from(name)
  return chars.length === 0 ? '' : chars[0] + '*'.repeat(chars.length - 1)
}

async function memoryCreate(input: CreateSubscriptionInput): Promise<CreatedSubscription> {
  await Promise.resolve()
  const name = input.name.trim()
  if (!NAME_RE.test(name)) throw new Error('name_invalid')
  if (!PHONE_RE.test(input.phone)) throw new Error('phone_invalid')
  if (input.agreedPrivacy !== true) throw new Error('agreed_privacy_required')
  const plan = findPlan(input.planId)
  if (!plan) throw new Error('plan_not_found')
  const at = new Date()
  const row: MemoryRow = {
    id: crypto.randomUUID(),
    subscription_no: nextSubscriptionNo(at),
    plan_id: plan.id,
    plan_name: plan.name,
    monthly_price: plan.monthly_price,
    name,
    phone: input.phone,
    agreed_privacy: true,
    created_at: at.toISOString(),
  }
  memory.set(row.id, row)
  return { id: row.id, subscription_no: row.subscription_no, created_at: row.created_at }
}

async function memoryGet(id: string): Promise<SubscriptionView | null> {
  await Promise.resolve()
  const row = memory.get(id)
  if (!row) return null
  return {
    subscription_no: row.subscription_no,
    plan_id: row.plan_id,
    plan_name: row.plan_name,
    monthly_price: row.monthly_price,
    applicant_name_masked: maskName(row.name),
    created_at: row.created_at,
  }
}

// ---------- 공개 함수 ----------
/** create_subscription. 실패하면 오류 코드(error.message)를 그대로 담아 reject */
export const createSubscription = (input: CreateSubscriptionInput): Promise<CreatedSubscription> =>
  supabase ? remoteCreate(input) : memoryCreate(input)

/** get_subscription. 1건 또는 null. 휴대폰 번호는 돌려주지 않는다 */
export const getSubscription = (id: string): Promise<SubscriptionView | null> =>
  supabase ? remoteGet(id) : memoryGet(id)
