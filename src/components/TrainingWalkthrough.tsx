import type { TrainingModule } from '../training/types.ts'

interface TrainingWalkthroughProps {
  module: TrainingModule
  /** Current step index (controlled by the parent). */
  index: number
  completed: boolean
  onNext: () => void
  onBack: () => void
  onRestart: () => void
  onClose: () => void
}

/**
 * Runs a loaded module one step at a time over the live camera. Built for a
 * hands-busy technician: large type, one instruction in focus, distinct safety
 * call-out, clear progress, and an unmissable Next control.
 */
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
        <div className="wt__complete">
          <div className="wt__check" aria-hidden>
            ✓
          </div>
          <h2 className="wt__title">Module complete</h2>
          <p className="wt__instruction">
            You’ve completed the {module.component} walkthrough.
          </p>
          <div className="wt__controls">
            <button className="wt__btn wt__btn--ghost" onClick={onRestart}>
              Restart
            </button>
            <button className="wt__btn wt__btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="wt__head">
            <span className="wt__eyebrow">{module.component}</span>
            <span className="wt__counter">
              Step {index + 1} of {total}
            </span>
          </div>

          <h2 className="wt__title">{step.title}</h2>
          <p className="wt__instruction">{step.instruction}</p>

          {step.safetyNote && (
            <div className="wt__safety" role="note">
              <span className="wt__safety-tag">⚠ Safety</span>
              <span className="wt__safety-text">{step.safetyNote}</span>
            </div>
          )}

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
        ✦ AI-generated training guidance — verify against equipment
        documentation.
      </p>
    </section>
  )
}
