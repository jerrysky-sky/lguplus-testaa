import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

// Design.md 4장 Card/Price: 358 × 124, 레이블 + 강조 값 1개 + 보조 설명
// desc가 없으면 보조 설명 줄을 그리지 않는다.
type PriceCardProps = HTMLAttributes<HTMLElement> & {
  label: ReactNode
  value: ReactNode
  desc?: ReactNode
}

export function PriceCard({ label, value, desc, className, ...rest }: PriceCardProps) {
  return (
    <section
      {...rest}
      className={clsx('flex w-full flex-col gap-8 rounded-16 border border-border-default bg-bg-surface p-20', className)}
    >
      <span className="typo-body-small-medium text-text-secondary">{label}</span>
      <strong className="typo-heading-h3 text-text-primary">{value}</strong>
      {desc != null && <span className="typo-caption-medium text-text-secondary">{desc}</span>}
    </section>
  )
}
