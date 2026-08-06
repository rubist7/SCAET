import { useEffect, useRef } from 'react'

export function useFormErrorFocus(errorKey, getTarget, { focus = true } = {}) {
  const previousErrorKeyRef = useRef('')

  useEffect(() => {
    if (!errorKey) {
      previousErrorKeyRef.current = ''
      return undefined
    }

    if (previousErrorKeyRef.current === errorKey) {
      return undefined
    }

    previousErrorKeyRef.current = errorKey
    const target = getTarget()

    if (!target) {
      return undefined
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })

      if (focus && typeof target.focus === 'function') {
        window.requestAnimationFrame(() => target.focus({ preventScroll: true }))
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [errorKey, focus, getTarget])
}
