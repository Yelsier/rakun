import RichText from './RichText'

type PageSectionProps = {
  title?: unknown
  body?: unknown
}

const asText = (value: unknown) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if (record._tag === 'Translatable') {
      if (typeof record.en === 'string') return record.en
      const first = Object.entries(record).find(([key]) => key !== '_tag')
      return typeof first?.[1] === 'string' ? first[1] : ''
    }
  }
  return ''
}

export default function PageSection({ title, body }: PageSectionProps) {
  const heading = asText(title)

  return (
    <section className="border-y border-zinc-200 bg-white px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {heading ? (
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">{heading}</h2>
        ) : null}
        <RichText value={body} />
      </div>
    </section>
  )
}
