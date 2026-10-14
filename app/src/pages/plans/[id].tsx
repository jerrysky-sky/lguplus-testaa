// /plans/[id] — 요금제 상세 (harness/pages/pages.json)
import { navigate, useRoute } from '../../router.gen'
import { BottomCTA, Button, Header, ListRow, PriceCard, Tag } from '@/ui'
import { afterDiscountText, benefitsFor, findPlan, formatWon, messages, throttleText } from '@/data/spec'

export default function Page() {
  const { params } = useRoute()
  const plan = findPlan(params.id)
  const goList = () => navigate('/plans')

  if (!plan) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
        <Header type="default" onBack={goList} />
        <div className="flex flex-1 flex-col items-center justify-center gap-24 px-16 py-40">
          <p className="typo-body-medium text-center text-text-secondary">{messages.plan_not_found}</p>
          <Button variant="Primary" size="lg" onClick={goList}>
            {messages.back_to_list_button}
          </Button>
        </div>
      </main>
    )
  }

  const price = formatWon(plan.monthly_price)
  const afterDiscount = afterDiscountText(plan)
  const benefits = benefitsFor(plan.id)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
      <Header type="default" title={plan.name} onBack={goList} />

      <div className="flex flex-col gap-24 px-16 pt-16 pb-32">
        <div className="flex flex-col gap-12">
          {plan.recommended && <Tag data-tag="recommended">{messages.recommended_tag}</Tag>}
          <PriceCard label={messages.monthly_price_label} value={price} desc={afterDiscount ?? undefined} />
        </div>

        <section className="flex flex-col rounded-16 bg-bg-surface px-20 py-8">
          <ListRow label="기본 데이터량" value={plan.data_label} />
          <ListRow label="소진 후 속도" value={throttleText(plan)} className="border-b-0" />
        </section>

        {benefits.length > 0 && (
          <section className="flex flex-col gap-8">
            <h2 className="typo-body-strong text-text-primary">{messages.benefits_section_title}</h2>
            <div className="flex flex-col rounded-16 bg-bg-surface px-20 py-8">
              {benefits.map((b) => (
                <ListRow key={b} type="check" label={b} />
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomCTA layout="price" amountLabel={messages.monthly_price_label} amount={price}>
        <Button variant="Primary" size="xl" fullWidth onClick={() => navigate(`/apply?plan=${encodeURIComponent(plan.id)}`)}>
          {messages.apply_button}
        </Button>
      </BottomCTA>
    </main>
  )
}
