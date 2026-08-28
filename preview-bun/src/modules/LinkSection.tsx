import { Link } from '@rakun-kit/bun'

import type { Props } from '../rakun'

export default function LinkSection({ label, link }: Props<'LinkSection'>) {
  return (
    <section className="preview-card">
      <Link href={link.href}>{link.title || label}</Link>
    </section>
  )
}
