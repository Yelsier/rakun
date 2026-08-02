type UseCaseHeroProps = {
  eyebrow?: string
  title?: string
  summary?: string
}

export default function UseCaseHero({
  eyebrow = 'Use case',
  title = 'A cleaner shared template',
  summary,
}: UseCaseHeroProps) {
  return (
    <section className="bg-zinc-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {eyebrow}
        </span>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-6xl">
          {title}
        </h1>
        {summary ? (
          <p className="max-w-3xl text-lg leading-8 text-zinc-300">{summary}</p>
        ) : null}
      </div>
    </section>
  )
}
