// /complete — 신청 완료 (harness/pages/pages.json)
import { useEffect, useState } from 'react'
import { navigate } from '../../router.gen'
import { BottomCTA, Button, Header, IconDoneMark, ListRow } from '@/ui'
import { findPlan, formatWon, messages } from '@/data/spec'
import { getLastSubscription } from '@/data/subscriptions'

// List/Row 라벨: pages.json /complete components[].props.Label 그대로
const LABEL_ID = '신청 번호'
const LABEL_PLAN = '요금제'
const LABEL_CREATED = '신청 일시'
const LABEL_APPLICANT = '신청자'

/** spec.json format.applicant_name: 첫 글자만 보이고 나머지 글자 수만큼 `*` */
const maskName = (name: string): string => {
  const chars = Array.from(name.trim())
  if (chars.length === 0) return ''
  return chars[0] + '*'.repeat(chars.length - 1)
}

/** spec.json format.created_at: 브라우저 로컬 시간대 */
const DATE_FMT = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export default function Page() {
  // 앱 상태(메모리)로 받은 방금 저장한 값. 새로고침·직접 진입이면 null
  const [sub] = useState(() => getLastSubscription())
  const plan = sub ? findPlan(sub.plan_id) : undefined

  useEffect(() => {
    if (!sub || !plan) navigate('/plans', { replace: true })
  }, [sub, plan])

  if (!sub || !plan) return null

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
      <Header
        type="default"
        title={messages.header_title_complete}
        onBack={() => navigate('/plans', { replace: true })}
      />

      <div className="flex flex-col gap-24 px-16 pt-40 pb-32">
        <section className="flex flex-col items-center gap-16">
          <IconDoneMark />
          <p className="typo-heading-h4 text-center text-text-primary">{messages.complete_title}</p>
        </section>

        <section className="flex flex-col rounded-16 bg-bg-surface px-20 py-8">
          <ListRow label={LABEL_ID} value={sub.id} />
          <ListRow data-row="plan-name" label={LABEL_PLAN} value={plan.name} />
          <ListRow data-row="monthly-price" label={messages.monthly_price_label} value={formatWon(sub.monthly_price)} />
          <ListRow label={LABEL_CREATED} value={DATE_FMT.format(new Date(sub.created_at))} />
          <ListRow data-row="applicant" label={LABEL_APPLICANT} value={maskName(sub.name)} className="border-b-0" />
        </section>
      </div>

      <BottomCTA layout="single">
        <Button variant="Primary" size="xl" fullWidth onClick={() => navigate('/plans')}>
          {messages.more_plans_button}
        </Button>
      </BottomCTA>
    </main>
  )
}
