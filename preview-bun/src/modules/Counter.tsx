'use client'

import { useState } from 'react'

type CounterProps = {
  initial?: number
  label: string
}

export default function Counter({ initial = 0, label }: CounterProps) {
  const [value, setValue] = useState(initial)

  return (
    <section className="preview-counter">
      <span>{label}</span>
      <button type="button" onClick={() => setValue((current) => current + 1)}>
        + {value}
      </button>
    </section>
  )
}
