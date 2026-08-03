import { useT } from '@rakun-kit/next/web'
import type { Props } from '../server/content-types'

type HeaderProps = Props<'Header'>

export default function Header({
  brand = 'Rakun Preview',
  primaryLinkLabel = 'Backend',
  primaryLinkHref = '/backend',
  internalLinks = [],
}: HeaderProps) {
  const t = useT()

  const navigationLinks = internalLinks.filter(
    (link): link is NonNullable<typeof link> => Boolean(link?.href),
  )

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-zinc-950">{brand}</span>
          <span className="text-xs font-medium text-emerald-700">{t({ key: 'demo.welcome' })}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          {navigationLinks.map((link) => (
            <a className="font-medium text-emerald-700" href={link.href} key={link.href}>
              {link.title || link.href}
            </a>
          ))}
          <a className="font-medium text-zinc-700" href={primaryLinkHref}>
            {primaryLinkLabel}
          </a>
        </nav>
      </div>
    </header>
  )
}
