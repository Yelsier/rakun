'use client'

import { Link2, Unlink } from 'lucide-react'

import { useEditPageContext } from '../_context/EditPageContext'

import { confirm } from '@/components/confirm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n'

export const LinkedIteratorControl = () => {
  const t = useTranslations()
  const { contentTypeId, contentTypeName, documentActions, linkedIterator } =
    useEditPageContext()
  const { state, mode } = linkedIterator

  const askInitialize = async () => {
    await confirm({
      title: t('contentEdit.useThisAsSharedTitle'),
      description: t('contentEdit.useThisAsSharedDescription'),
      confirmLabel: t('contentEdit.useSharedStructure'),
      onConfirm: async () => {
        await documentActions.handleInitializeLinkedIterator()
      },
    })
  }

  const askRelink = async () => {
    if (
      !(await confirm.yes({
        title: t('contentEdit.useSharedTitle'),
        description: t('contentEdit.useSharedDescription'),
        confirmLabel: t('contentEdit.useSharedStructure'),
      }))
    ) {
      return
    }

    linkedIterator.adoptShared()
  }

  if (!linkedIterator.enabled || !state) return null

  if (!state.configured && mode === 'unlinked') {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Badge variant="secondary">
            <Unlink />
            {t('contentEdit.localStructure')}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {t('contentEdit.localStructureUnconfiguredDescription')}
          </p>
        </div>
      </div>
    )
  }

  if (!state.configured) {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t('contentEdit.sharedStructureNotConfigured')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('contentEdit.chooseSharedStructureDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contentTypeId ? (
            <Button variant="outline" onClick={() => linkedIterator.setMode('unlinked')}>
              <Unlink />
              {t('contentEdit.keepThisEntryLocal')}
            </Button>
          ) : null}
          {state.canUpdateShared ? (
            <Button variant="outline" onClick={() => void askInitialize()}>
              <Link2 />
              {t('contentEdit.useThisStructure')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {contentTypeId
                ? t('contentEdit.updateAnyRequired')
                : t('contentEdit.firstEntryInitializes')}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'unlinked') {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Badge variant="secondary">
            <Unlink />
            {t('contentEdit.localStructure')}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {t('contentEdit.localStructureDescription')}
          </p>
        </div>
        <Button variant="outline" onClick={() => void askRelink()}>
          <Link2 />
          {t('contentEdit.useSharedStructure')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Badge>
          <Link2 />
          {t('contentEdit.sharedStructure')}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {state.canUpdateShared
            ? t('contentEdit.iteratorChangesApply', { contentType: contentTypeName })
            : t('contentEdit.sharedIteratorReadOnly')}
        </p>
      </div>
      {contentTypeId ? (
        <Button variant="outline" onClick={() => linkedIterator.setMode('unlinked')}>
          <Unlink />
          {t('contentEdit.unlinkThisEntry')}
        </Button>
      ) : null}
    </div>
  )
}
