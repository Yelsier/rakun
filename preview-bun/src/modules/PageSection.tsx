import { useT } from '@rakun-kit/react'

import type { Props } from '../rakun'

export default function PageSection({ body, title }: Props<'PageSection'>) {
  const t = useT()

  return (
    <section className="preview-card">
      {title ? <h1>{title}</h1> : null}
      {body ? <p>{body}</p> : null}
      <nav aria-label={t({ key: 'previewBun.navigationLabel' })}>
        <a href="/">{t({ key: 'previewBun.homeLink' })}</a>
        <a href="/manager">{t({ key: 'previewBun.managerLink' })}</a>
      </nav>
    </section>
  )
}
