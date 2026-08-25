import './preview.css'

type PreviewPageProps = {
  badge: string
  description: string
  dynamicLink: string
  homeLink: string
  path: string
  routesLabel: string
  title: string
}

export default function PreviewPage({
  badge,
  description,
  dynamicLink,
  homeLink,
  path,
  routesLabel,
  title,
}: PreviewPageProps) {
  return (
    <section className="preview-card">
      <span className="preview-badge">{badge}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <code>{path}</code>
      <nav aria-label={routesLabel}>
        <a href="/">{homeLink}</a>
        <a href="/hello/bun">{dynamicLink}</a>
      </nav>
    </section>
  )
}
