import type { CapturedFrame } from './captureFrame.ts'
import type { WalkthroughData, VerdictPreview } from '../training/types.ts'

/**
 * Fast first phase: just the component + safety verdict (~2s). Used to show the
 * safety verdict the instant it's ready while the full drill is still loading.
 * Best-effort — callers should treat a rejection as "no preview yet".
 */
export async function fetchVerdict(frame: CapturedFrame): Promise<VerdictPreview> {
  const res = await fetch('/api/verdict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: frame.base64, mimeType: frame.mimeType }),
  })
  const body: unknown = await res.json()
  if (!res.ok || !body || typeof body !== 'object' || typeof (body as VerdictPreview).component !== 'string') {
    throw new Error('verdict unavailable')
  }
  return body as VerdictPreview
}

/**
 * Send a captured frame to our server proxy and get back a normalized
 * walkthrough. Throws an Error with a user-friendly message on any failure
 * (network, server, API, or parse) so callers can show it without crashing.
 */
export async function generateWalkthrough(
  frame: CapturedFrame,
): Promise<WalkthroughData> {
  let res: Response
  try {
    res = await fetch('/api/generate-walkthrough', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: frame.base64, mimeType: frame.mimeType }),
    })
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error('The server returned an unexpected response.')
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status}).`
    throw new Error(message)
  }

  // Defensive client-side validation (the server already normalizes the shape).
  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as WalkthroughData).component !== 'string' ||
    !Array.isArray((body as WalkthroughData).steps)
  ) {
    throw new Error('The AI response was not in the expected format.')
  }

  return body as WalkthroughData
}
