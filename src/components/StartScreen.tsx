interface StartScreenProps {
  onStart: () => void
  onUpload: () => void
}

const STEPS = [
  { n: 1, label: 'Point at a component' },
  { n: 2, label: 'Identify it' },
  { n: 3, label: 'Guided training walkthrough' },
]

export function StartScreen({ onStart, onUpload }: StartScreenProps) {
  return (
    <div className="start">
      <div className="start__inner">
        <div className="start__brand">
          <span className="start__logo" aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l2-3h6l2 3h3a0 0 0 0 1 0 0v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7" />
              <circle cx="12" cy="12.5" r="3.2" />
            </svg>
          </span>
          <h1 className="start__name">FieldLens</h1>
        </div>

        <p className="start__tagline">
          AR training assistant for HVAC technicians — learn on the equipment,
          hands-free.
        </p>

        <ol className="start__how">
          {STEPS.map((s, i) => (
            <li className="start__step" key={s.n}>
              <span className="start__step-num">{s.n}</span>
              <span className="start__step-label">{s.label}</span>
              {i < STEPS.length - 1 && (
                <span className="start__arrow" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <button className="start__cta" onClick={onStart}>
          Start
        </button>
        <button className="start__secondary" onClick={onUpload}>
          Upload a photo instead
        </button>
        <p className="start__note">
          Uses your device camera. When you tap a component or upload a photo,
          that image is sent to Google Gemini to generate AI training guidance.
        </p>
      </div>
    </div>
  )
}
