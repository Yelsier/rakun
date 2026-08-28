'use client'

import { useState } from 'react'
import { useClientT } from '@rakun-kit/react'

import type { Props } from '../rakun'

export default function Counter({ initial = 0 }: Props<'Counter'>) {
  const [value, setValue] = useState(initial)
  const t = useClientT()

  return (
    <section className="preview-counter">
      <span>{t({ key: 'previewBun.counterLabel' })}</span>
      <button type="button" onClick={() => setValue((current) => current + 1)}>
        + {value}
      </button>
    </section>
  )
}
