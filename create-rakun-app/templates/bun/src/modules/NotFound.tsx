import { useT } from '@rakun-kit/react'

export default function NotFound() {
  const t = useT()

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold">{t({ key: 'starter.notFound.title' })}</h1>
    </section>
  )
}
