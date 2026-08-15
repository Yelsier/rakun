'use client'

import type { LiteralKey } from '@rakun-kit/core/literals'

import { tFromInfo, type TFromInfoArgs } from './format'
import {
  useClientPageInfo,
  useClientPageLiterals,
} from './PageInfoClientProvider'

export const useClientT = () => {
  const info = useClientPageInfo()
  const literals = useClientPageLiterals()

  return <K extends LiteralKey>(
    input: Omit<TFromInfoArgs<K>, 'info' | 'literals'>,
  ) =>
    tFromInfo({
      info,
      literals,
      ...input,
    })
}
