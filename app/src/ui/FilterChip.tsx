import clsx from 'clsx'

// Design.md 4장 FilterChip: State = default | selected, 높이 40, 너비 Hug
// 계약 마커: data-filter-chip, aria-pressed
type FilterChipProps = {
  label: string
  selected?: boolean
  onClick?: () => void
}

export function FilterChip({ label, selected = false, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      data-filter-chip=""
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'typo-body-small-strong flex h-40 shrink-0 items-center rounded-full border px-16',
        selected
          ? 'border-border-strong bg-fill-secondary text-text-on-dark'
          : 'border-border-default bg-bg-surface text-text-secondary',
      )}
    >
      {label}
    </button>
  )
}
