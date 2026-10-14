// Design.md 4장 icon/*: 24 × 24 (doneMark는 64 × 64)
export function IconArrowLeft() {
  return (
    <svg className="block size-24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        className="stroke-icon-strong"
        d="M15 5L8 12L15 19"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** icon/doneMark: 64 × 64 (안쪽 여백 8 + 표시 48 + 8). 완료 상태를 대표하는 큰 확인 표시 */
export function IconDoneMark() {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-fill-primary p-8" aria-hidden="true">
      <svg className="block size-48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          className="stroke-icon-on-dark"
          d="M14 25L21 32L34 17"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function IconCheck() {
  return (
    <svg className="block size-24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        className="stroke-icon-accent"
        d="M6 12.5L10 16.5L18 8.5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
