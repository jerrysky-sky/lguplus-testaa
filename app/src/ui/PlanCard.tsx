import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

// Design.md 4장 Card/Plan: State = default | selected, 폭 358
// 속성: Name, Desc, Price, Discount(Text) / Badge, Promo, Sale(Boolean)
// 정가 속성은 이 서비스에서 쓰지 않는다(spec: 정가·할인가·프로모션가 동시 표시 금지) → 아예 두지 않는다.
// - badge: 넘기면 표시(Badge on), 없으면 off
// - promo: 넘기면 표시(Promo on), 없으면 off
// - sale: true면 금액을 강조색으로(Sale on)
// - discount: 할인 종료 후 금액 줄. 없으면 줄 자체를 그리지 않는다.
// - action: 카드 안 액션(예: '자세히' Button). 카드의 나머지 영역은 동작 없음.
type PlanCardProps = Omit<HTMLAttributes<HTMLElement>, 'onClick'> & {
  name: ReactNode
  desc?: ReactNode
  priceLabel?: ReactNode
  price: ReactNode
  discount?: ReactNode
  badge?: ReactNode
  promo?: ReactNode
  sale?: boolean
  state?: 'default' | 'selected'
  action?: ReactNode
}

export function PlanCard({
  name,
  desc,
  priceLabel,
  price,
  discount,
  badge,
  promo,
  sale = false,
  state = 'default',
  action,
  className,
  ...rest
}: PlanCardProps) {
  return (
    <article
      {...rest}
      className={clsx(
        'flex w-full flex-col gap-12 rounded-16 border bg-bg-surface p-20',
        state === 'selected' ? 'border-border-focus' : 'border-border-default',
        className,
      )}
    >
      {badge}
      <div className="flex flex-col gap-4">
        <h2 className="typo-heading-h4 text-text-primary">{name}</h2>
        {desc != null && <p className="typo-body-small-medium text-text-secondary">{desc}</p>}
      </div>
      <div className="flex items-end justify-between gap-12">
        <div className="flex min-w-0 flex-col gap-4">
          {priceLabel != null && <span className="typo-caption-medium text-text-tertiary">{priceLabel}</span>}
          <strong className={clsx('typo-subtitle-bold', sale ? 'text-text-accent' : 'text-text-primary')}>
            {price}
          </strong>
          {discount != null && <span className="typo-caption-medium text-text-secondary">{discount}</span>}
          {promo}
        </div>
        {action}
      </div>
    </article>
  )
}
