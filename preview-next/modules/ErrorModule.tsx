type ErrorModuleProps = {
  error?: string
  recived?: unknown
}

export default function ErrorModule({ error, recived }: ErrorModuleProps) {
  const moduleType =
    recived && typeof recived === 'object' && '_type' in recived
      ? String(recived._type)
      : 'Unknown module'

  return (
    <section className='border-y border-red-300 bg-red-50 px-6 py-10 text-red-950'>
      <div className='mx-auto max-w-5xl space-y-4'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-wide text-red-700'>
            Module validation failed
          </p>
          <h2 className='mt-1 text-xl font-semibold'>{moduleType}</h2>
        </div>
        <pre className='overflow-x-auto whitespace-pre-wrap rounded-md border border-red-200 bg-white/70 p-4 text-xs leading-5'>
          {error || 'The module did not match its output schema.'}
        </pre>
      </div>
    </section>
  )
}
