import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

// Design.md 4장 Button: Type = Primary | Secondary, Size = sm(40) | lg(48) | xl(52), State = Default | Hover | Disabled
// xl 52 = 줄높이 26 + 상하 12 + 테두리 1px × 2
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: 'Primary' | 'Secondary'
  size?: 'sm' | 'lg' | 'xl'
  htmlType?: 'button' | 'submit'
  fullWidth?: boolean
}

const SIZE = {
  sm: 'h-40 px-16 rounded-12 typo-body-small-strong',
  lg: 'h-48 px-20 rounded-12 typo-body-strong',
  xl: 'py-12 px-20 rounded-16 typo-subtitle-default',
} as const

export function Button({
  variant = 'Primary',
  size = 'lg',
  htmlType = 'button',
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={htmlType}
      disabled={disabled}
      className={clsx(
        'flex shrink-0 items-center justify-center gap-4 border',
        SIZE[size],
        fullWidth && 'w-full',
        disabled
          ? 'cursor-not-allowed border-fill-disabled bg-fill-disabled text-text-on-disabled'
          : variant === 'Primary'
            ? 'border-fill-primary bg-fill-primary text-text-on-dark hover:border-fill-primary-hover hover:bg-fill-primary-hover'
            : 'border-border-default bg-bg-surface text-text-primary hover:bg-bg-subtle',
        className,
      )}
    >
      {children}
    </button>
  )
}
