import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'streaming' | 'error'

export type CameraErrorKind =
  | 'denied' // user blocked permission
  | 'notfound' // no camera hardware
  | 'inuse' // camera held by another app
  | 'insecure' // not https / localhost — getUserMedia unavailable
  | 'unsupported' // browser lacks the API
  | 'unknown'

export interface CameraError {
  kind: CameraErrorKind
  message: string
}

export interface CameraDevice {
  deviceId: string
  label: string
}

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: CameraStatus
  error: CameraError | null
  devices: CameraDevice[]
  activeDeviceId: string | null
  /** true once we know more than one camera exists */
  canSwitch: boolean
  start: () => void
  /** release the camera and return to idle */
  stop: () => void
  /** cycle to the next available camera */
  switchCamera: () => void
  retry: () => void
}

function classifyError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return {
          kind: 'denied',
          message:
            'Camera access was blocked. Allow camera permission in your browser, then retry.',
        }
      case 'NotFoundError':
      case 'OverconstrainedError':
        return {
          kind: 'notfound',
          message: 'No camera was found on this device.',
        }
      case 'NotReadableError':
        return {
          kind: 'inuse',
          message:
            'The camera is in use by another app. Close it (e.g. Zoom, FaceTime) and retry.',
        }
    }
  }
  return {
    kind: 'unknown',
    message: err instanceof Error ? err.message : 'Could not access the camera.',
  }
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<CameraError | null>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // (Re)enumerate cameras. Labels are only populated after permission is
  // granted, so we call this again once a stream is live.
  const refreshDevices = useCallback(async (): Promise<CameraDevice[]> => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const cams = all
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }))
      setDevices(cams)
      return cams
    } catch {
      return []
    }
  }, [])

  // Open a stream. Pass a deviceId to target a specific camera; otherwise we
  // ask for the rear ('environment') camera, which is the sensible default for
  // a technician pointing the phone at equipment.
  const open = useCallback(
    async (deviceId?: string) => {
      if (!window.isSecureContext) {
        setStatus('error')
        setError({
          kind: 'insecure',
          message:
            'Camera access requires a secure connection (https or localhost).',
        })
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setError({
          kind: 'unsupported',
          message: 'This browser does not support camera access.',
        })
        return
      }

      setStatus('requesting')
      setError(null)
      stopStream()

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } },
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          // iOS Safari requires an explicit play() after assigning srcObject.
          await video.play().catch(() => {})
        }

        const settings = stream.getVideoTracks()[0]?.getSettings()
        setActiveDeviceId(settings?.deviceId ?? deviceId ?? null)
        setStatus('streaming')
        // Now that permission is granted, labels are available.
        await refreshDevices()
      } catch (err) {
        stopStream()
        setStatus('error')
        setError(classifyError(err))
      }
    },
    [refreshDevices, stopStream],
  )

  const start = useCallback(() => {
    void open()
  }, [open])

  const retry = useCallback(() => {
    void open(activeDeviceId ?? undefined)
  }, [open, activeDeviceId])

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return
    const idx = devices.findIndex((d) => d.deviceId === activeDeviceId)
    const next = devices[(idx + 1) % devices.length]
    if (next) void open(next.deviceId)
  }, [devices, activeDeviceId, open])

  // Release the camera (turns the hardware indicator off) and go back to idle —
  // used when returning to the start screen.
  const stop = useCallback(() => {
    stopStream()
    setError(null)
    setStatus('idle')
  }, [stopStream])

  // Clean up the stream when the component unmounts.
  useEffect(() => stopStream, [stopStream])

  return {
    videoRef,
    status,
    error,
    devices,
    activeDeviceId,
    canSwitch: devices.length > 1,
    start,
    stop,
    switchCamera,
    retry,
  }
}
