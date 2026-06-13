export interface CapturedFrame {
  /** base64 (no data: prefix) */
  base64: string
  mimeType: string
  /** full data: URL of the same frame, for freezing/displaying it */
  dataUrl: string
}

/**
 * Grab the current video frame as a JPEG, downscaled so the upload is small and
 * the round-trip stays fast. Returns null if the video has no frame yet.
 */
export function captureFrame(
  video: HTMLVideoElement,
  maxSize = 1024,
): CapturedFrame | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null

  const scale = Math.min(1, maxSize / Math.max(vw, vh))
  const w = Math.round(vw * scale)
  const h = Math.round(vh * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, w, h)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  const base64 = dataUrl.split(',')[1] ?? ''
  return { base64, mimeType: 'image/jpeg', dataUrl }
}

/**
 * Turn a user-selected image File into the same frame format. Decodes the
 * image, downscales it, and re-encodes as JPEG so any upload behaves like a
 * captured camera frame. Rejects with a friendly message on bad input.
 */
export function imageFileToFrame(
  file: File,
  maxSize = 1024,
): Promise<CapturedFrame> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG, etc.).'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      if (!iw || !ih) {
        reject(new Error('Could not read that image.'))
        return
      }
      const scale = Math.min(1, maxSize / Math.max(iw, ih))
      const w = Math.round(iw * scale)
      const h = Math.round(ih * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process that image.'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      const base64 = dataUrl.split(',')[1] ?? ''
      resolve({ base64, mimeType: 'image/jpeg', dataUrl })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load that image. Try a JPG or PNG.'))
    }
    img.src = url
  })
}
