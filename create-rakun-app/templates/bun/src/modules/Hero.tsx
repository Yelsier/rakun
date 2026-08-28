import type { Props } from '../rakun'

export default function Hero({ heading, text }: Props<'Hero'>) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-12">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{heading}</h1>
      {text ? <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">{text}</p> : null}
    </section>
  )
}
