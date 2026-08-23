'use client'

import { GitBranch } from 'lucide-react'
import { localeVariantsRealtimeTopic } from '@rakun-kit/core/client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select'

import { useManagerSyncQuery } from '@/client/react'
import { useTranslations } from '@/i18n'
import { useManagerNavigation } from '@/state/navigation'

export const VariantSelector = ({
  contentType,
  documentId,
  routeKey,
}: {
  contentType: string
  documentId: string
  routeKey?: string
}) => {
  const t = useTranslations()
  const navigation = useManagerNavigation()
  const input = routeKey
    ? {
        contentType,
        documentId,
        routeKey,
      }
    : undefined
  const variantsQuery = useManagerSyncQuery({
    name: 'manager.localeVariants.list',
    input:
      input ??
      ({
        contentType,
        documentId,
      } as never),
    enabled: Boolean(input),
    topic: localeVariantsRealtimeTopic(contentType),
  })
  const variants = variantsQuery.data?.documents ?? []

  if (variants.length <= 1) return null

  return (
    <Select
      value={documentId}
      onValueChange={(nextDocumentId) => {
        if (nextDocumentId === documentId) return

        navigation.push?.({
          name: 'content.edit',
          contentType,
          id: nextDocumentId,
        })
      }}
    >
      <SelectTrigger className="w-48 border-0 shadow-none">
        <GitBranch />
        <SelectValue placeholder={t('variantSelector.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('contentList.variants')}</SelectLabel>
          {variants.map((variant) => (
            <SelectItem key={variant.documentId} value={variant.documentId}>
              {variant.role === 'primary'
                ? t('variantSelector.defaultLabel', { label: variant.label })
                : variant.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
