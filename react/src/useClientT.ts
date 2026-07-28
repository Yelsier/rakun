'use client'

import type { LiteralKey } from '@rakun-kit/core/literals'

import { tFromInfo, type TFromInfoArgs } from './format'
import { useClientPageInfo } from './PageInfoClientProvider'

export const useClientT = () => {
  const info = useClientPageInfo()

  return <K extends LiteralKey>(input: Omit<TFromInfoArgs<K>, 'info'>) =>
    tFromInfo({
      info,
      ...input,
    })
}
