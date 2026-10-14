import type { ReactNode } from 'react'
import { IconArrowLeft } from './icons'

// Design.md 4장 Header: Type = default | root, 390 × 56(상하 8 + 내용 40), 좌우 16, 화면당 1개
// default: 뒤로(icon/arrowLeft, 터치 영역 40 × 40, data-nav="back") + 제목
// root: 상위 진입점. leading(예: Logo) + 제목
type HeaderProps = {
  type?: 'default' | 'root'
  title?: ReactNode
  onBack?: () => void
  backLabel?: string
  leading?: ReactNode
}

export function Header({ type = 'default', title, onBack, backLabel = '뒤로', leading }: HeaderProps) {
  return (
    <header className="w-full bg-bg-surface px-16 py-8">
      <div className="flex h-40 items-center gap-8">
        {type === 'default' ? (
          <button
            type="button"
            data-nav="back"
            aria-label={backLabel}
            onClick={onBack}
            className="flex size-40 shrink-0 items-center justify-center rounded-full"
          >
            <IconArrowLeft />
          </button>
        ) : (
          leading != null && <div className="flex shrink-0 items-center">{leading}</div>
        )}
        {title != null && (
          <h1
            className={
              type === 'default'
                ? 'typo-subtitle-default flex-1 truncate text-center text-text-primary'
                : 'typo-subtitle-bold flex-1 truncate text-text-primary'
            }
          >
            {title}
          </h1>
        )}
        {type === 'default' && <span className="size-40 shrink-0" aria-hidden="true" />}
      </div>
    </header>
  )
}
