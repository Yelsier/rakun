import type { LiteralKey } from '@rakun-kit/core/literals'

import { tFromInfo, type TFromInfoArgs } from './format'
import { getCurrentPageInfo, getCurrentPageLiterals } from './pageInfoStore'

export const useT = () => {
  return <K extends LiteralKey>(
    input: Omit<TFromInfoArgs<K>, 'info' | 'literals'>,
  ) => {
    const info = getCurrentPageInfo()
    const literals = getCurrentPageLiterals()

    return tFromInfo({
      info,
      literals,
      ...input,
    })
  }
}
