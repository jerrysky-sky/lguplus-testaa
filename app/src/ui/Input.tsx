import clsx from 'clsx'
import { useState, type InputHTMLAttributes, type ReactNode } from 'react'

// Design.md 4장 Input: State = default | focus | filled | caution | disabled
// 크기: 기본 358 × 58 (테두리 1px + 상하 16 + 줄높이 24), 주의 메시지 노출 시 아래에 오류 문구 한 줄
// 오류 메시지(errorMessage)는 caution 상태에서만 노출한다. 계약 마커: data-field(입력 요소), data-error-for(오류 문구)
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  field: string
  label?: ReactNode
  errorMessage?: string | null
}

export function Input({ field, label, errorMessage, disabled, value, id, onFocus, onBlur, className, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false)
  const inputId = id ?? `input-${field}`
  const hasValue = value != null && String(value) !== ''
  const state = disabled ? 'disabled' : errorMessage ? 'caution' : focused ? 'focus' : hasValue ? 'filled' : 'default'

  return (
    <div className={clsx('flex w-full flex-col gap-8', className)}>
      {label != null && (
        <label htmlFor={inputId} className="typo-body-small-strong text-text-primary">
          {label}
        </label>
      )}
      <div
        data-state={state}
        className={clsx(
          'flex h-58 w-full items-center rounded-12 border px-16',
          state === 'disabled' ? 'border-border-default bg-bg-subtle' : 'bg-bg-surface',
          state === 'caution' && 'border-border-error',
          state === 'focus' && 'border-border-focus',
          (state === 'default' || state === 'filled') && 'border-border-default',
        )}
      >
        <input
          {...rest}
          id={inputId}
          data-field={field}
          value={value}
          disabled={disabled}
          aria-invalid={state === 'caution'}
          aria-describedby={errorMessage ? `${inputId}-error` : undefined}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          className={clsx(
            'typo-body-medium w-full min-w-0 bg-bg-surface text-text-primary outline-none placeholder:text-text-placeholder',
            state === 'disabled' && 'bg-bg-subtle text-text-on-disabled',
          )}
        />
      </div>
      {errorMessage && (
        <p id={`${inputId}-error`} data-error-for={field} className="typo-body-small-medium text-text-error">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
