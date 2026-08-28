'use client'

import { useState } from 'react'
import { useClientT } from '@rakun-kit/react'

import type { Props } from '../rakun'

export default function Counter({ initial = 0 }: Props<'Counter'>) {
  const [value, setValue] = useState(initial)
  const t = useClientT()

  return (
    <section className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <span className="text-stone-700">{t({ key: 'starter.counter.label' })}</span>
      <button
        type="button"
        className="rounded-xl bg-stone-950 px-4 py-2 font-bold text-white"
        onClick={() => setValue((current) => current + 1)}
      >
        + {value}
      </button>
    </section>
  )
}
