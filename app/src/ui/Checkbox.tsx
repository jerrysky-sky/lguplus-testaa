import clsx from 'clsx'
import type { InputHTMLAttributes } from 'react'

// Design.md 4장 Checkbox: State = default | active, 24 × 24
// 독립적인 다중 선택(동의 등)에 사용한다. 체크 상태는 색 + 체크 표시(형태)로 함께 전달한다.
// 계약 마커: data-field(체크 입력 요소)
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  field?: string
  checked: boolean
}

export function Checkbox({ field, checked, className, ...rest }: CheckboxProps) {
  return (
    <span className={clsx('relative flex size-24 shrink-0 items-center justify-center', className)}>
      <input
        {...rest}
        type="checkbox"
        data-field={field}
        data-state={checked ? 'active' : 'default'}
        checked={checked}
        className={clsx(
          'size-24 cursor-pointer appearance-none rounded-4 border focus-visible:border-border-focus',
          checked ? 'border-fill-primary bg-fill-primary' : 'border-border-default bg-bg-surface',
        )}
      />
      {checked && (
        <svg
          className="pointer-events-none absolute inset-0 block size-24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="stroke-icon-on-dark"
            d="M7 12.5L10.5 16L17 9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  )
}
