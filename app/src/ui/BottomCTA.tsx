import type { ReactNode } from 'react'

// Design.md 4장 BottomCTA: Layout = single | double | price, 폭 390
// single/double 97 = 상단 구분선 1px + 상 12 + 버튼 52 + 하 32
// price 139 = 상단 구분선 1px + 상 12 + 요약 행 26 + 간격 16 + 버튼 52 + 하 32
// 화면 하단에 붙는다(sticky). 좌우 16, 하단 32 안전 여백.
type BottomCTAProps = {
  layout?: 'single' | 'double' | 'price'
  amountLabel?: ReactNode
  amount?: ReactNode
  /** 핵심 액션 (Primary Button) */
  children: ReactNode
  /** double일 때 보조 액션 (Secondary Button) */
  secondary?: ReactNode
  /** 버튼 바로 위에 붙는 한 줄 (예: 저장 실패 문구) */
  notice?: ReactNode
}

export function BottomCTA({ layout = 'single', amountLabel, amount, children, secondary, notice }: BottomCTAProps) {
  return (
    <div className="sticky bottom-0 mt-auto w-full border-t border-border-subtle bg-bg-surface px-16 pt-12 pb-32">
      <div className="flex flex-col gap-16">
        {layout === 'price' && (
          <div className="flex items-center justify-between gap-12">
            <span className="typo-body-small-medium text-text-secondary">{amountLabel}</span>
            <strong className="typo-subtitle-bold text-text-primary">{amount}</strong>
          </div>
        )}
        {notice}
        {layout === 'double' ? (
          <div className="flex gap-8">
            <div className="flex flex-1 flex-col">{secondary}</div>
            <div className="flex flex-1 flex-col">{children}</div>
          </div>
        ) : (
          <div className="flex flex-col">{children}</div>
        )}
      </div>
    </div>
  )
}
