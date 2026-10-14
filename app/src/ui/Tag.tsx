import type { HTMLAttributes, ReactNode } from 'react'

// Design.md 4장 Tag: 기본 높이 26(줄높이 16 + 상하 4 + 테두리 1px × 2), 내부 좌우 padding 12
// 짧은 분류·강조 레이블. 마커(data-tag 등)는 호출하는 쪽에서 넘긴다.
type TagProps = HTMLAttributes<HTMLSpanElement> & { children?: ReactNode }

export function Tag({ children, ...rest }: TagProps) {
  return (
    <span
      {...rest}
      className="typo-caption-small-bold inline-flex w-fit items-center self-start rounded-full border border-bg-accent-subtle bg-bg-accent-subtle px-12 py-4 text-text-accent"
    >
      {children}
    </span>
  )
}
