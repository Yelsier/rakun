import { useT } from '@rakun-kit/react'

export default function NotFound() {
  const t = useT()

  return (
    <section className="preview-card">
      <h1>{t({ key: 'previewBun.notFoundTitle' })}</h1>
      <nav>
        <a href="/en/">{t({ key: 'previewBun.homeLink' })}</a>
      </nav>
    </section>
  )
}
