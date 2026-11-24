import { useT } from '@rakun-kit/next/web'
import type { Props } from '../server/content-types'

type HeaderProps = Props<'Header'>
type MenuItem = NonNullable<HeaderProps['navigation']>[number]

const MenuItems = ({ items, depth = 0 }: { items: MenuItem[]; depth?: number }) => (
  <ul className={depth === 0 ? 'flex flex-wrap items-start gap-x-4 gap-y-1' : 'grid gap-2'}>
    {items
      .filter((item) => Boolean(item.href))
      .map((item) => (
        <li
          className="relative md:[&>div]:hidden md:hover:[&>div]:block md:focus-within:[&>div]:block"
          key={`${String(item.href)}-${item.title}`}
        >
          <a className="font-medium text-emerald-700" href={item.href}>
            {item.title || String(item.href)}
          </a>
          {item.children.length > 0 ? (
            <div
              className={
                depth === 0
                  ? 'pt-1 md:absolute md:left-0 md:top-full md:z-10 md:min-w-48 md:rounded-md md:border md:border-zinc-200 md:bg-white md:p-3 md:shadow-lg'
                  : 'pl-3 md:absolute md:left-full md:top-0 md:z-10 md:min-w-48 md:rounded-md md:border md:border-zinc-200 md:bg-white md:p-3 md:shadow-lg'
              }
            >
              <MenuItems depth={depth + 1} items={item.children} />
            </div>
          ) : null}
        </li>
      ))}
  </ul>
)

export default function Header({
  brand = 'Rakun Preview',
  primaryLinkLabel = 'Backend',
  primaryLinkHref = '/backend',
  navigation = [],
}: HeaderProps) {
  const t = useT()

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-zinc-950">{brand}</span>
          <span className="text-xs font-medium text-emerald-700">{t({ key: 'demo.welcome' })}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          <MenuItems items={navigation} />
          <a className="font-medium text-zinc-700" href={primaryLinkHref}>
            {primaryLinkLabel}
          </a>
        </nav>
      </div>
    </header>
  )
}
