type UseCaseNewsletterProps = {
  eyebrow?: string
  title?: string
  body?: string
  buttonLabel?: string
  buttonHref?: string
}

export default function UseCaseNewsletter({
  eyebrow = 'Newsletter',
  title = 'Keep learning with Rakun',
  body,
  buttonLabel = 'Open the manager',
  buttonHref = '/backend',
}: UseCaseNewsletterProps) {
  return (
    <section className="bg-emerald-700 px-6 py-16 text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
            {eyebrow}
          </span>
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          {body ? <p className="leading-7 text-emerald-50">{body}</p> : null}
        </div>
        {buttonHref && buttonLabel ? (
          <a
            className="shrink-0 rounded-md bg-white px-5 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
            href={buttonHref}
          >
            {buttonLabel}
          </a>
        ) : null}
      </div>
    </section>
  )
}
