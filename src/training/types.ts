// Shape of an AI-generated training walkthrough, after the server has
// normalized Gemini's response (snake_case → camelCase, boxes → 0–1 coords).

/** A region in the captured image, normalized to 0–1 (x, y = top-left). */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface TrainingStep {
  title: string
  instruction: string
  /** Safety-critical warning, or '' if none. */
  safetyNote: string
  /** Region of the image to look at for this step, or null if not visible. */
  box: Box | null
}

export interface WalkthroughData {
  component: string
  description: string
  /** Region of the overall component in the image, or null. */
  box: Box | null
  steps: TrainingStep[]
}

/** The walkthrough UI consumes this shape regardless of where it came from. */
export type TrainingModule = WalkthroughData
