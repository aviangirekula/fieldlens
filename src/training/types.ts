// Shape of an AI-generated training walkthrough, after the server has
// normalized Gemini's response (snake_case → camelCase).

/** A region in the captured image, normalized to 0–1 (x, y = top-left). */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface TrainingStep {
  title: string
  action: string
  check: string
  expectedResult: string
  why: string
  instruction: string
  safetyNote: string
  /** Real-world insight from experienced techs */
  fieldTip: string
  /** Specific mistake juniors make on this step */
  commonMistake: string
  /** Visible sign this step matters (e.g., "brown residue on terminals") */
  visualIndicator: string
  box: Box | null
}

export interface WalkthroughData {
  component: string
  description: string
  safetyVerdict: 'safe_to_inspect' | 'caution' | 'do_not_touch' | 'unknown'
  safetySummary: string
  confidence: 'high' | 'medium' | 'low'
  trainingGoal: string
  visibleEvidence: string[]
  notVisible: string[]
  /** Most common ways this part fails in the field */
  commonFailures: string[]
  box: Box | null
  steps: TrainingStep[]
}

export type TrainingModule = WalkthroughData

/** Fast first-phase result: just the component + safety verdict (shown ~2s in). */
export interface VerdictPreview {
  component: string
  safetyVerdict: WalkthroughData['safetyVerdict']
  safetySummary: string
  confidence: WalkthroughData['confidence']
}
