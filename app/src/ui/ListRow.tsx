import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'
import { IconCheck } from './icons'

// Design.md 4장 List/Row: Type = default | check, 358 × 46 (줄높이 21 + 상하 12 + 아래 구분선 1px)
// default: 라벨(왼쪽) + 값(오른쪽) 한 줄 비교
// check: icon/check + 라벨 (포함·완료 항목). 의미는 텍스트로도 전달한다.
type ListRowProps = HTMLAttributes<HTMLDivElement> & {
  type?: 'default' | 'check'
  label: ReactNode
  value?: ReactNode
}

export function ListRow({ type = 'default', label, value, className, ...rest }: ListRowProps) {
  return (
    <div
      {...rest}
      className={clsx('flex w-full items-center gap-12 border-b border-border-divider py-12', className)}
    >
      {type === 'check' ? (
        <>
          <span className="flex size-24 shrink-0 items-center justify-center">
            <IconCheck />
          </span>
          <span className="typo-body-small-medium flex-1 text-text-primary">{label}</span>
        </>
      ) : (
        <>
          <span className="typo-body-small-medium shrink-0 text-text-secondary">{label}</span>
          <span className="typo-body-small-strong flex-1 text-right text-text-primary">{value}</span>
        </>
      )}
    </div>
  )
}
