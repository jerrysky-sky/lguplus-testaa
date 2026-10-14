// Design.md 4장 icon/*: 24 × 24 (doneMark는 64 × 64 — 필요한 화면에서 추가)
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
