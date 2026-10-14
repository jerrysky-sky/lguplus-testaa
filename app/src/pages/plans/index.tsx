// /plans — 요금제 목록 (harness/pages/pages.json)
import { useMemo, useState } from 'react'
import { navigate } from '../../router.gen'
import { Button, Chip, FilterChip, Header, Logo, PlanCard, Tag } from '@/ui'
import {
  afterDiscountText,
  formatWon,
  hasDiscount,
  messages,
  plansByPrice,
  throttleText,
  type Plan,
} from '@/data/spec'

type Filter = { key: string; label: string; match: (p: Plan) => boolean }

// spec.json screens[/plans].features[필터].filters 순서 (단일 선택)
const FILTERS: Filter[] = [
  { key: 'all', label: messages.filter_all, match: () => true },
  // data_gb ≤ 10, data_gb가 null인 무제한은 제외
  { key: 'data_10gb_or_less', label: messages.filter_data_10gb_or_less, match: (p) => p.data_gb != null && p.data_gb <= 10 },
  // throttle_mbps가 없음
  { key: 'no_throttle', label: messages.filter_no_throttle, match: (p) => p.throttle_mbps == null },
]

export default function Page() {
  const [selected, setSelected] = useState<string>(FILTERS[0].key)
  const all = useMemo(() => plansByPrice(), [])
  const filter = FILTERS.find((f) => f.key === selected) ?? FILTERS[0]
  const visible = all.filter(filter.match)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
      <Header type="root" leading={<Logo />} title={messages.header_title_plans} />

      <div className="flex flex-col gap-16 px-16 pt-16 pb-32">
        <div className="flex gap-8 overflow-x-auto" role="group">
          {FILTERS.map((f) => (
            <FilterChip key={f.key} label={f.label} selected={f.key === selected} onClick={() => setSelected(f.key)} />
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="typo-body-medium py-40 text-center text-text-secondary">{messages.filter_empty}</p>
        ) : (
          <ul className="flex flex-col gap-16">
            {visible.map((p) => (
              <li key={p.id}>
                <PlanCard
                  data-plan-id={p.id}
                  name={p.name}
                  desc={`${p.data_label} · ${throttleText(p)}`}
                  priceLabel={messages.monthly_price_label}
                  price={formatWon(p.monthly_price)}
                  discount={afterDiscountText(p) ?? undefined}
                  badge={p.recommended ? <Tag data-tag="recommended">{messages.recommended_tag}</Tag> : undefined}
                  promo={hasDiscount(p) ? <Chip type="sale">{messages.discount_chip}</Chip> : undefined}
                  sale={hasDiscount(p)}
                  action={
                    <Button variant="Secondary" size="sm" onClick={() => navigate(`/plans/${p.id}`)}>
                      {messages.detail_button}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
