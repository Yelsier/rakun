'use client'

import { useTranslations } from '@/i18n'

export const ItemLimitStatus = ({
  count,
  minItems,
  maxItems,
}: {
  count: number
  minItems?: number
  maxItems?: number
}) => {
  const t = useTranslations()
  if (minItems === undefined && maxItems === undefined) return null

  const outsideLimit =
    (minItems !== undefined && count < minItems) ||
    (maxItems !== undefined && count > maxItems)

  return (
    <div
      className={
        outsideLimit
          ? 'text-xs text-destructive'
          : 'text-xs text-muted-foreground'
      }
    >
      {t('contentEdit.itemsCount', { count })}
      {minItems !== undefined
        ? ` · ${t('contentEdit.minimumItems', { count: minItems })}`
        : null}
      {maxItems !== undefined
        ? ` · ${t('contentEdit.maximumItems', { count: maxItems })}`
        : null}
    </div>
  )
}
