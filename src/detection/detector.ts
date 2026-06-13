import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

// ─────────────────────────────────────────────────────────────────────────────
// Detector abstraction.
//
// Everything downstream (tracking, smoothing, drawing) consumes the generic
// `Detection` shape below — it never imports coco-ssd directly. When we later
// swap in a custom-trained HVAC/electrical model (a TF.js graph model or an
// ONNX/YOLO model run via onnxruntime-web), we only reimplement `loadDetector`
// + `detect` to return the same `Detection[]`. The rest of the pipeline is
// model-agnostic.
// ─────────────────────────────────────────────────────────────────────────────

export interface Detection {
  /** [x, y, width, height] in the video's *intrinsic* pixel coordinates */
  bbox: [number, number, number, number]
  label: string
  score: number
}

/**
 * The single class we prove the pipeline on. COCO-SSD recognises "bottle"
 * reliably, it's visually distinct, and there's one on practically every desk —
 * so it's easy to point a webcam or phone at. Swap this constant (or remove the
 * filter) once a custom model is in place.
 */
export const TARGET_CLASS = 'bottle'

/** Detections below this score are ignored. */
export const MIN_SCORE = 0.45

export interface Detector {
  detect(input: HTMLVideoElement): Promise<Detection[]>
}

let detectorPromise: Promise<Detector> | null = null

/** Loads (once) and returns the active detector. Safe to call repeatedly. */
export function loadDetector(): Promise<Detector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      // WebGL is the broadly-supported GPU backend across laptop + mobile
      // browsers. It's what keeps inference off the CPU and in real-time range.
      await tf.setBackend('webgl')
      await tf.ready()

      // lite_mobilenet_v2 is the fastest COCO-SSD base — the right tradeoff for
      // real-time on phones. (Switch to 'mobilenet_v2' for a bit more accuracy
      // at a lower frame rate.)
      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })

      return {
        async detect(input) {
          const raw = await model.detect(input, 20)
          return raw.map((p) => ({
            bbox: p.bbox as [number, number, number, number],
            label: p.class,
            score: p.score,
          }))
        },
      }
    })()
  }
  return detectorPromise
}
