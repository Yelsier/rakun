import { Link } from '@rakun-kit/bun'

import type { Props } from '../rakun'

export default function LinkSection({ label, link }: Props<'LinkSection'>) {
  return (
    <section className="preview-card">
      <Link
        href={link.href}
        className="inline-flex rounded-md bg-preview-accent px-3 py-2 font-bold text-white!"
      >
        {link.title || label}
      </Link>
    </section>
  )
}
