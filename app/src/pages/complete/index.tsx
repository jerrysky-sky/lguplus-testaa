// /complete — 신청 완료 (harness/pages/pages.json)
import { useEffect, useState } from 'react'
import { navigate } from '../../router.gen'
import { BottomCTA, Button, Header, IconDoneMark, ListRow } from '@/ui'
import { formatWon, messages } from '@/data/spec'
import { getHandoff, getSubscription, type SubscriptionView } from '@/data/store'

// List/Row 라벨: pages.json /complete components[].props.Label 그대로
const LABEL_ID = '신청 번호'
const LABEL_PLAN = '요금제'
const LABEL_CREATED = '신청 일시'
const LABEL_APPLICANT = '신청자'

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
  // 앱 상태(메모리)로 받은 { id, subscription_no }. 새로고침·직접 진입이면 null
  const [handoff] = useState(() => getHandoff())
  const [sub, setSub] = useState<SubscriptionView | null>(null)

  useEffect(() => {
    if (!handoff) {
      navigate('/plans', { replace: true })
      return
    }
    let alive = true
    getSubscription(handoff.id)
      .then((row) => {
        if (!alive) return
        if (!row) navigate('/plans', { replace: true })
        else setSub(row)
      })
      .catch(() => {
        if (alive) navigate('/plans', { replace: true })
      })
    return () => {
      alive = false
    }
  }, [handoff])

  if (!handoff) return null

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
      <Header
        type="default"
        title={messages.header_title_complete}
        onBack={() => navigate('/plans', { replace: true })}
      />

      {sub && (
        <>
          <div className="flex flex-col gap-24 px-16 pt-40 pb-32">
            <section className="flex flex-col items-center gap-16">
              <IconDoneMark />
              <p className="typo-heading-h4 text-center text-text-primary">{messages.complete_title}</p>
            </section>

            <section className="flex flex-col rounded-16 bg-bg-surface px-20 py-8">
              <ListRow label={LABEL_ID} value={sub.subscription_no} />
              <ListRow data-row="plan-name" label={LABEL_PLAN} value={sub.plan_name} />
              <ListRow
                data-row="monthly-price"
                label={messages.monthly_price_label}
                value={formatWon(sub.monthly_price)}
              />
              <ListRow label={LABEL_CREATED} value={DATE_FMT.format(new Date(sub.created_at))} />
              <ListRow
                data-row="applicant"
                label={LABEL_APPLICANT}
                value={sub.applicant_name_masked}
                className="border-b-0"
              />
            </section>
          </div>

          <BottomCTA layout="single">
            <Button variant="Primary" size="xl" fullWidth onClick={() => navigate('/plans')}>
              {messages.more_plans_button}
            </Button>
          </BottomCTA>
        </>
      )}
    </main>
  )
}
