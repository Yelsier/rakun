import type { AnchorHTMLAttributes, ReactNode } from 'react'

export type BunLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode
  prefetch?: boolean
}

/**
 * An anchor that participates in Bun's client navigation prefetching.
 *
 * Prefetching is enabled by default for internal links. Set `prefetch={false}`
 * to keep normal client navigation while skipping the flight prefetch.
 */
export const Link = ({ children, prefetch = true, ...props }: BunLinkProps) => (
  <a {...props} data-rakun-prefetch={prefetch ? undefined : 'false'}>
    {children}
  </a>
)
