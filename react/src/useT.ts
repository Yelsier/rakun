import type { LiteralKey } from '@rakun-kit/core/literals'

import { tFromInfo, type TFromInfoArgs } from './format'
import { getCurrentPageInfo } from './pageInfoStore'

export const useT = () => {
  return <K extends LiteralKey>(input: Omit<TFromInfoArgs<K>, 'info'>) => {
    const info = getCurrentPageInfo()

    return tFromInfo({
      info,
      ...input,
    })
  }
}
