import { useT } from '@rakun-kit/next/web'

type HeaderProps = {
  brand?: string
  primaryLinkLabel?: string
  primaryLinkHref?: string
  internalLinkLabel?: string
  internalLink?: unknown
}

export default function Header({
  brand = 'Rakun Preview',
  primaryLinkLabel = 'Backend',
  primaryLinkHref = '/backend',
  internalLinkLabel,
  internalLink,
}: HeaderProps) {
  const t = useT()

  const internalLinkHref = typeof internalLink === 'string' ? internalLink : ''
  const internalLinkPreview =
    typeof internalLink === 'string'
      ? internalLink
      : internalLink
        ? JSON.stringify(internalLink)
        : ''
  const internalLinkContent = (
    <>
      <span>{internalLinkLabel || internalLinkPreview}</span>
      <span className="text-xs font-normal text-zinc-500">{internalLinkPreview}</span>
    </>
  )

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-zinc-950">{brand}</span>
          <span className="text-xs font-medium text-emerald-700">{t({ key: 'demo.welcome' })}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          {internalLinkPreview ? (
            internalLinkHref ? (
              <a
                className="flex flex-col items-end font-medium text-emerald-700"
                href={internalLinkHref}
              >
                {internalLinkContent}
              </a>
            ) : (
              <span className="flex flex-col items-end font-medium text-amber-700">
                {internalLinkContent}
              </span>
            )
          ) : null}
          <a className="font-medium text-zinc-700" href={primaryLinkHref}>
            {primaryLinkLabel}
          </a>
        </nav>
      </div>
    </header>
  )
}
