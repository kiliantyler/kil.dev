import { useCallback, useEffect, useState } from 'react'

export function useHash() {
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash))

  const readHash = useCallback(() => {
    if (typeof window === 'undefined') return
    setHash(window.location.hash)
  }, [])

  useEffect(() => {
    readHash()
    const onHashChange = () => readHash()
    const onPopState = () => readHash()
    window.addEventListener('hashchange', onHashChange, { passive: true })
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onPopState)
    }
  }, [readHash])

  // Catch Next.js router navigations (pushState/replaceState) that won't trigger hashchange
  useEffect(() => {
    if (typeof window === 'undefined') return

    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)

    const patchedPushState: History['pushState'] = (...args) => {
      const result = originalPushState(...args)
      setTimeout(() => {
        readHash()
      }, 0)
      return result
    }

    const patchedReplaceState: History['replaceState'] = (...args) => {
      const result = originalReplaceState(...args)
      setTimeout(() => {
        readHash()
      }, 0)
      return result
    }

    window.history.pushState = patchedPushState
    window.history.replaceState = patchedReplaceState

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [readHash])

  return hash
}
