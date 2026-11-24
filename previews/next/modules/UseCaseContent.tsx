import RichText from './RichText'

type UseCaseContentProps = {
  eyebrow?: string
  title?: string
  body?: unknown
}

export default function UseCaseContent({
  eyebrow,
  title = 'Use case section',
  body,
}: UseCaseContentProps) {
  return (
    <section className="border-b border-zinc-200 py-10 first:pt-0 last:border-b-0 last:pb-0">
      {eyebrow ? (
        <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mb-5 text-3xl font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      <div className="text-base leading-7 text-zinc-700">
        <RichText value={body} />
      </div>
    </section>
  )
}
