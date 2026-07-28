import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    mediaQuery.addEventListener('change', update)
    update()

    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isMobile
}
