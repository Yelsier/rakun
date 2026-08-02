import UseCaseContent from './UseCaseContent'

type UseCaseLayoutWithInfoProps = {
  asideEyebrow?: string
  asideTitle?: string
  asideBody?: string
  blocks?: unknown[]
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

export default function UseCaseLayoutWithInfo({
  asideEyebrow = 'Shared aside',
  asideTitle = 'About this implementation',
  asideBody,
  blocks = [],
}: UseCaseLayoutWithInfoProps) {
  const modules = blocks.map((entry) => asRecord(asRecord(entry).value))

  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {modules.map((module, index) =>
            module._type === 'UseCaseContent' ? (
              <UseCaseContent
                key={`${text(module._id) || 'content'}:${index}`}
                eyebrow={text(module.eyebrow)}
                title={text(module.title)}
                body={module.body}
              />
            ) : null,
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-emerald-200 bg-emerald-50 p-6 lg:sticky lg:top-6">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {asideEyebrow}
          </span>
          <h2 className="mt-3 text-xl font-semibold text-zinc-950">{asideTitle}</h2>
          {asideBody ? (
            <p className="mt-4 text-sm leading-6 text-zinc-700">{asideBody}</p>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
