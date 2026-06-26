interface StartScreenProps {
  onStart: () => void
  onUpload: () => void
}

const STEPS = [
  { n: 1, label: 'Point at equipment' },
  { n: 2, label: 'See the safety verdict' },
  { n: 3, label: 'Follow the drill' },
]

export function StartScreen({ onStart, onUpload }: StartScreenProps) {
  return (
    <div className="start">
      <main className="start__inner" role="main">
        <div className="start__brand">
          <span className="start__logo" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7" />
              <circle cx="12" cy="12.5" r="3.2" />
            </svg>
          </span>
          <h1 className="start__name">FieldLens</h1>
        </div>

        <p className="start__tagline">
          Point your phone at any HVAC component for an instant safety check and a step-by-step inspection.
        </p>

        <nav className="start__how" aria-label="How it works">
          {STEPS.map((s, i) => (
            <div className="start__step" key={s.n}>
              <span className="start__step-num">{s.n}</span>
              <span className="start__step-label">{s.label}</span>
              {i < STEPS.length - 1 && <span className="start__arrow" aria-hidden>{'>'}</span>}
            </div>
          ))}
        </nav>

        <div className="start__cta-group">
          <button className="start__cta" onClick={onStart} type="button">
            Start inspection
          </button>
          <button className="start__secondary" onClick={onUpload} type="button">
            Upload a photo instead
          </button>
        </div>

        <p className="start__trust" role="contentinfo">
          AI-generated guidance — always verify with equipment documentation and a qualified supervisor.
        </p>
      </main>
    </div>
  )
}
