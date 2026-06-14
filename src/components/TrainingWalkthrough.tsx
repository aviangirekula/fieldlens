import type { TrainingModule } from '../training/types.ts'

interface TrainingWalkthroughProps {
  module: TrainingModule
  index: number
  completed: boolean
  onNext: () => void
  onBack: () => void
  onRestart: () => void
  onClose: () => void
}

const VERDICT_COPY = {
  safe_to_inspect: {
    label: 'Safe to look at',
    icon: '✓',
    tone: 'safe',
    detail: 'You can visually inspect this component. Do not touch anything yet.',
  },
  caution: {
    label: 'Be careful',
    icon: '⚠',
    tone: 'caution',
    detail: 'This component may be energized. Look only — do not touch without a supervisor.',
  },
  do_not_touch: {
    label: 'Do not touch',
    icon: '🛑',
    tone: 'danger',
    detail: 'This looks dangerous. Do not touch anything. Get a qualified supervisor first.',
  },
  unknown: {
    label: 'Safety unknown',
    icon: '?',
    tone: 'unknown',
    detail: 'Cannot tell from this photo. Treat as energized until verified.',
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
}: TrainingWalkthroughProps) {
  const total = module.steps.length
  const step = module.steps[index]
  const isLast = index === total - 1
  const progress = completed ? 100 : ((index + 1) / total) * 100
  const verdict = VERDICT_COPY[module.safetyVerdict ?? 'unknown']
  const doText = step?.action || step?.instruction

  return (
    <section
      className="wt"
      role="dialog"
      aria-label={`${module.component} training walkthrough`}
    >
      <div className="wt__bar">
        <div className="wt__bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <button className="wt__close" onClick={onClose} aria-label="End walkthrough">
        ✕
      </button>

      {completed ? (
        <div className="wt__body wt__body--complete">
          <div className="wt__complete">
            <div className="wt__check" aria-hidden>✓</div>
            <h2 className="wt__title">You're done</h2>
            <p className="wt__instruction">
              You've walked through the {module.component} inspection.
            </p>
            <div className="wt__controls">
              <button className="wt__btn wt__btn--ghost" onClick={onRestart}>
                Do it again
              </button>
              <button className="wt__btn wt__btn--primary" onClick={onClose}>
                Finish
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="wt__body">
            {/* Step 0: safety verdict, shown first, always */}
            {index === 0 && (
              <div className={`wt__verdict wt__verdict--${verdict.tone}`}>
                <span className="wt__verdict-icon">{verdict.icon}</span>
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
              <span className="wt__counter">
                {index + 1} / {total}
              </span>
            </div>

            {/* The main action — big, clear, unmissable */}
            <div className="wt__action-card">
              <span className="wt__action-num">{index + 1}</span>
              <div>
                <h2 className="wt__action-title">{step.title}</h2>
                <p className="wt__action-text">{doText}</p>
              </div>
            </div>

            {/* What to check */}
            {step.check && (
              <div className="wt__check-row">
                <span className="wt__check-label">Look at</span>
                <p>{step.check}</p>
              </div>
            )}

            {/* What normal looks like */}
            {step.expectedResult && (
              <div className="wt__check-row wt__check-row--expect">
                <span className="wt__check-label">Should look like</span>
                <p>{step.expectedResult}</p>
              </div>
            )}

            {/* Why */}
            {step.why && (
              <p className="wt__why">{step.why}</p>
            )}

            {/* Safety note */}
            {step.safetyNote && (
              <div className="wt__safety" role="note">
                <span className="wt__safety-tag">⚠ Safety</span>
                <span className="wt__safety-text">{step.safetyNote}</span>
              </div>
            )}

            {/* Step 0 extras: what we can and can't see */}
            {index === 0 && (
              <>
                {module.visibleEvidence.length > 0 && (
                  <div className="wt__evidence">
                    <span className="wt__evidence-title">What we can see</span>
                    <ul>
                      {module.visibleEvidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {module.notVisible.length > 0 && (
                  <div className="wt__evidence">
                    <span className="wt__evidence-title">Can't tell from photo</span>
                    <ul>
                      {module.notVisible.map((item) => (
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
            >
              Back
            </button>
            <button className="wt__btn wt__btn--primary" onClick={onNext}>
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
