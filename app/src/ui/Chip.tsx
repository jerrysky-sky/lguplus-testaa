import clsx from 'clsx'
import type { ReactNode } from 'react'

// Design.md 4장 Chip: Type = benefit | package | sale, 높이 benefit/package 20, sale 24
// 짧은 범주·상태 정보의 보조 표시. 액션에 쓰지 않는다.
type ChipProps = { type?: 'benefit' | 'package' | 'sale'; children: ReactNode }

const TYPE = {
  benefit: 'h-20 typo-caption-small bg-fill-tertiary text-text-secondary',
  package: 'h-20 typo-caption-small bg-bg-inverse text-text-on-dark',
  sale: 'h-24 typo-caption-small-bold bg-bg-error-subtle text-text-error',
} as const

export function Chip({ type = 'benefit', children }: ChipProps) {
  return (
    <span className={clsx('inline-flex w-fit shrink-0 items-center rounded-4 px-8', TYPE[type])}>{children}</span>
  )
}
