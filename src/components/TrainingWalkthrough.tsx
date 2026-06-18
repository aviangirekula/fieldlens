import { useEffect, useState, useCallback } from 'react'
import type { TrainingModule } from '../training/types.ts'

interface TrainingWalkthroughProps {
  module: TrainingModule
  index: number
  completed: boolean
  onNext: () => void
  onBack: () => void
  onRestart: () => void
  onClose: () => void
  /** Real local inspection count + general field guidance (no fake traction). */
  scanStats?: {
    timesInspected: number
    tips: string[]
    latestTip: string
    seniorTechQuote: string
  }
}

const VERDICT_COPY = {
  safe_to_inspect: {
    label: 'Safe to Inspect',
    icon: 'OK',
    tone: 'safe',
    detail: 'You can visually inspect this component. Do not touch anything until lockout/tagout and zero-energy verification are complete.',
  },
  caution: {
    label: 'Caution Required',
    icon: '!',
    tone: 'caution',
    detail: 'This component may be energized. Look only — do not touch without a qualified supervisor present.',
  },
  do_not_touch: {
    label: 'Do Not Touch',
    icon: 'X',
    tone: 'danger',
    detail: 'This appears dangerous. Do not touch anything. Get a qualified supervisor immediately.',
  },
  unknown: {
    label: 'Safety Unknown',
    icon: '?',
    tone: 'unknown',
    detail: 'Cannot determine from this image. Treat as energized until verified by a qualified supervisor.',
  },
} as const

export function TrainingWalkthrough({
  module,
  index,
  completed,
  onNext,
  onBack,
  onRestart,
  onClose,
  scanStats,
}: TrainingWalkthroughProps) {
  const total = module.steps.length
  const step = module.steps[index]
  const isLast = index === total - 1
  const progress = completed ? 100 : ((index + 1) / total) * 100
  const verdict = VERDICT_COPY[module.safetyVerdict ?? 'unknown']
  const doText = step?.action || step?.instruction

  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [index])

  const handleWindowKey = useCallback((e: globalThis.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      onNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onBack()
    } else if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'r' || e.key === 'R') {
      onRestart()
    }
  }, [onNext, onBack, onClose, onRestart])

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKey)
    return () => window.removeEventListener('keydown', handleWindowKey)
  }, [handleWindowKey])

  return (
    <section
      className="wt"
      role="dialog"
      aria-label={`${module.component} training walkthrough`}
      aria-modal="true"
      onKeyDown={handleWindowKey as unknown as React.KeyboardEventHandler<HTMLElement>}
    >
      <div className="wt__bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Walkthrough progress">
        <div className="wt__bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <button className="wt__close" onClick={onClose} aria-label="End walkthrough" title="End walkthrough (Esc)">
        X
      </button>

      {completed ? (
        <div className="wt__body wt__body--complete" key={animKey}>
          <div className="wt__complete">
            <div className="wt__check" aria-hidden>OK</div>
            <h2 className="wt__title">Walkthrough Complete</h2>
            <p className="wt__instruction">
              You've completed the {module.component} inspection drill.
            </p>

            {/* Field knowledge — general guidance, clearly NOT fabricated traction. */}
            {scanStats && (
              <div className="wt__scan-stats" role="region" aria-label="Field knowledge">
                {scanStats.seniorTechQuote && (
                  <div className="wt__senior-quote">
                    <span className="wt__senior-quote-tag">👨‍🔧 Rule of thumb</span>
                    <span className="wt__senior-quote-text">{scanStats.seniorTechQuote}</span>
                  </div>
                )}
                {scanStats.latestTip && (
                  <div className="wt__scan-insight">
                    <span className="wt__scan-insight-tag">💡 Field tip</span>
                    <span className="wt__scan-insight-text">{scanStats.latestTip}</span>
                  </div>
                )}
                <div className="wt__scan-stats-row wt__scan-stats-row--sub">
                  <span className="wt__scan-stats-text">
                    General guidance from HVAC technician communities &amp; service
                    manuals — verify against the unit's documentation.
                    {scanStats.timesInspected > 1
                      ? ` You've inspected this part ${scanStats.timesInspected}× on this device.`
                      : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Common failures — shown on completion so the tech knows what to watch for */}
            {module.commonFailures && module.commonFailures.length > 0 && (
              <div className="wt__failures">
                <span className="wt__failures-title">Common Failures for This Part</span>
                <ul>
                  {module.commonFailures.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="wt__controls">
              <button className="wt__btn wt__btn--ghost" onClick={onRestart}>
                Do It Again
              </button>
              <button className="wt__btn wt__btn--primary" onClick={onClose}>
                Finish
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="wt__body" key={animKey}>
            {/* Step 0: safety verdict, shown first, always */}
            {index === 0 && (
              <div className={`wt__verdict wt__verdict--${verdict.tone}`} role="alert">
                <span className="wt__verdict-icon" aria-hidden>{verdict.icon}</span>
                <div>
                  <strong className="wt__verdict-label">{verdict.label}</strong>
                  <p className="wt__verdict-detail">{verdict.detail}</p>
                </div>
              </div>
            )}

            {index === 0 && module.safetySummary && (
              <p className="wt__safety-summary">{module.safetySummary}</p>
            )}

            <div className="wt__head">
              <span className="wt__eyebrow">{module.component}</span>
              <span className="wt__counter" aria-label={`Step ${index + 1} of ${total}`}>
                {index + 1} / {total}
              </span>
            </div>

            {/* The main action — big, clear, unmissable */}
            <div className="wt__action-card">
              <span className="wt__action-num" aria-hidden>{index + 1}</span>
              <div>
                <h2 className="wt__action-title">{step.title}</h2>
                <p className="wt__action-text">{doText}</p>
              </div>
            </div>

            {/* Visual indicator — what to look for at this step */}
            {step.visualIndicator && (
              <div className="wt__visual-indicator" role="note">
                <span className="wt__visual-indicator-tag" aria-hidden>LOOK FOR</span>
                <span className="wt__visual-indicator-text">{step.visualIndicator}</span>
              </div>
            )}

            {/* What to check */}
            {step.check && (
              <div className="wt__check-row">
                <span className="wt__check-label">Look At</span>
                <p>{step.check}</p>
              </div>
            )}

            {/* What normal looks like */}
            {step.expectedResult && (
              <div className="wt__check-row wt__check-row--expect">
                <span className="wt__check-label">Should Look Like</span>
                <p>{step.expectedResult}</p>
              </div>
            )}

            {/* Why */}
            {step.why && (
              <p className="wt__why">{step.why}</p>
            )}

            {/* Field tip — real insight from experienced techs */}
            {step.fieldTip && (
              <div className="wt__field-tip" role="note">
                <span className="wt__field-tip-tag" aria-hidden>FIELD TIP</span>
                <span className="wt__field-tip-text">{step.fieldTip}</span>
              </div>
            )}

            {/* Safety note */}
            {step.safetyNote && (
              <div className="wt__safety" role="note">
                <span className="wt__safety-tag" aria-hidden>SAFETY</span>
                <span className="wt__safety-text">{step.safetyNote}</span>
              </div>
            )}

            {/* Common mistake — what juniors get wrong at this step */}
            {step.commonMistake && (
              <div className="wt__mistake" role="note">
                <span className="wt__mistake-tag" aria-hidden>COMMON MISTAKE</span>
                <span className="wt__mistake-text">{step.commonMistake}</span>
              </div>
            )}

            {/* Step 0 extras: what we can and can't see, plus common failures */}
            {index === 0 && (
              <>
                {module.visibleEvidence.length > 0 && (
                  <div className="wt__evidence">
                    <span className="wt__evidence-title">Visible in Image</span>
                    <ul>
                      {module.visibleEvidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {module.notVisible.length > 0 && (
                  <div className="wt__evidence">
                    <span className="wt__evidence-title">Cannot Verify from Photo</span>
                    <ul>
                      {module.notVisible.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {module.commonFailures && module.commonFailures.length > 0 && (
                  <div className="wt__evidence wt__evidence--failures">
                    <span className="wt__evidence-title">Common Failures</span>
                    <ul>
                      {module.commonFailures.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="wt__controls">
            <button
              className="wt__btn wt__btn--ghost"
              onClick={onBack}
              disabled={index === 0}
              aria-label="Previous step"
            >
              Previous
            </button>
            <button className="wt__btn wt__btn--primary" onClick={onNext} aria-label={isLast ? 'Finish walkthrough' : 'Next step'}>
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </>
      )}

      <p className="wt__ai">
        AI-generated guidance — always verify with a qualified supervisor.
      </p>
    </section>
  )
}