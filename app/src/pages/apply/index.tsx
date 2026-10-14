// /apply — 구독 신청 (harness/pages/pages.json)
import { useRef, useState } from 'react'
import { navigate, useRoute } from '../../router.gen'
import { BottomCTA, Button, Checkbox, Header, Input, ListRow } from '@/ui'
import { afterDiscountText, findPlan, formatWon, messages } from '@/data/spec'
import { saveSubscription } from '@/data/subscriptions'

// 입력란·동의 라벨: spec.json screens[/apply].features(3·4번)의 표시 항목 이름 그대로
const LABEL_PLAN = '요금제'
const LABEL_NAME = '이름'
const LABEL_PHONE = '휴대폰 번호'
const LABEL_PRIVACY = '개인정보 수집·이용 동의'

const NAME_RE = /^[가-힣a-zA-Z]{2,20}$/
const PHONE_RE = /^010\d{8}$/

/** 이름: 앞뒤 공백 제거 후 2~20자 한글 또는 영문 */
const nameError = (v: string): string | null => {
  const t = v.trim()
  if (t === '') return messages.name_required
  return NAME_RE.test(t) ? null : messages.name_invalid
}
/** 휴대폰: "010"으로 시작하는 숫자 11자리 */
const phoneError = (v: string): string | null => (PHONE_RE.test(v) ? null : messages.phone_invalid)
/** 숫자만 남김 (하이픈 붙여넣기 포함), 최대 11자리 */
const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 11)

export default function Page() {
  const { query } = useRoute()
  const plan = findPlan(query.get('plan'))

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [errName, setErrName] = useState<string | null>(null)
  const [errPhone, setErrPhone] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const savingRef = useRef(false)

  const goList = () => navigate('/plans')

  if (!plan) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
        <Header type="default" title={messages.header_title_apply} onBack={goList} />
        <div className="flex flex-1 flex-col items-center justify-center gap-24 px-16 py-40">
          <p className="typo-body-medium text-center text-text-secondary">{messages.plan_not_found}</p>
          <Button variant="Primary" size="lg" onClick={goList}>
            {messages.back_to_list_button}
          </Button>
        </div>
      </main>
    )
  }

  const afterDiscount = afterDiscountText(plan)
  const canSubmit = nameError(name) === null && phoneError(phone) === null && agreed && !saving

  // 뒤로 = 취소. 이 화면이 내려가면 입력값·동의는 함께 사라진다(앱 상태에 남기지 않음).
  const goBack = () => navigate(`/plans/${encodeURIComponent(plan.id)}`)

  const submit = async () => {
    if (savingRef.current || !canSubmit) return
    savingRef.current = true
    setSaving(true)
    setSaveFailed(false)
    try {
      await saveSubscription({
        name: name.trim(),
        phone,
        plan_id: plan.id,
        monthly_price: plan.monthly_price,
        agreed_privacy: agreed,
      })
      navigate('/complete')
    } catch {
      savingRef.current = false
      setSaving(false)
      setSaveFailed(true)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-390 flex-col bg-bg-default">
      <Header type="default" title={messages.header_title_apply} onBack={goBack} />

      <div className="flex flex-col gap-24 px-16 pt-16 pb-32">
        <section className="flex flex-col rounded-16 bg-bg-surface px-20 py-8">
          <ListRow label={LABEL_PLAN} value={plan.name} />
          <ListRow
            label={messages.monthly_price_label}
            value={formatWon(plan.monthly_price)}
            className={afterDiscount ? undefined : 'border-b-0'}
          />
          {afterDiscount && <ListRow label={null} value={afterDiscount} className="border-b-0" />}
        </section>

        <section className="flex flex-col gap-16">
          <Input
            field="name"
            name="name"
            label={LABEL_NAME}
            autoComplete="name"
            value={name}
            errorMessage={errName}
            onChange={(e) => {
              setName(e.target.value)
              if (errName) setErrName(nameError(e.target.value))
            }}
            onBlur={() => setErrName(nameError(name))}
          />
          <Input
            field="phone"
            name="phone"
            label={LABEL_PHONE}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            errorMessage={errPhone}
            onChange={(e) => {
              const v = digitsOnly(e.target.value)
              setPhone(v)
              if (errPhone) setErrPhone(phoneError(v))
            }}
            onBlur={() => setErrPhone(phoneError(phone))}
          />
        </section>

        <section className="flex flex-col gap-12 rounded-16 bg-bg-surface p-16">
          <div className="flex items-center gap-8">
            <label className="flex flex-1 cursor-pointer items-center gap-8">
              <Checkbox
                field="agreed_privacy"
                name="agreed_privacy"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="typo-body-small-strong text-text-primary">{LABEL_PRIVACY}</span>
            </label>
            <button
              type="button"
              aria-expanded={showDetail}
              aria-controls="privacy-detail"
              onClick={() => setShowDetail((v) => !v)}
              className="typo-body-small-medium flex h-40 shrink-0 items-center px-4 text-text-secondary underline"
            >
              {messages.privacy_view_detail}
            </button>
          </div>
          {showDetail && (
            <div id="privacy-detail" className="flex flex-col gap-4 rounded-12 bg-bg-subtle p-12">
              <p className="typo-body-small-medium text-text-secondary">{messages.privacy_collect_items}</p>
              <p className="typo-body-small-medium text-text-secondary">{messages.privacy_purpose}</p>
            </div>
          )}
        </section>
      </div>

      <BottomCTA
        layout="single"
        notice={
          saveFailed ? (
            <p role="alert" className="typo-body-small-medium text-text-error">
              {messages.save_failed}
            </p>
          ) : undefined
        }
      >
        <Button variant="Primary" size="xl" fullWidth disabled={!canSubmit} aria-busy={saving} onClick={submit}>
          {saving ? messages.submitting : messages.submit_button}
        </Button>
      </BottomCTA>
    </main>
  )
}
