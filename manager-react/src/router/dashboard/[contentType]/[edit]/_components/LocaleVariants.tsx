'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GitBranchPlus, Link2Off, Plus } from 'lucide-react'
import type { LocaleVariantListOutput } from '@rakun-kit/core/client'

import { useEditPageContext } from '../_context/EditPageContext'

import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useManagerNavigation } from '@/state/navigation'
import { useQueryClient } from '@tanstack/react-query'

export const LocaleVariants = () => {
  const {
    contentTypeId,
    contentTypeName,
    isTrashed,
    languageCode,
    languageList,
    localeVariantRoute,
  } = useEditPageContext()
  const navigation = useManagerNavigation()
  const queryClient = useQueryClient()
  const [createLanguage, setCreateLanguage] = useState<string>('')
  const [assignLanguageByDocument, setAssignLanguageByDocument] = useState<
    Record<string, string>
  >({})
  const listInput =
    contentTypeId && localeVariantRoute
      ? {
          contentType: contentTypeName,
          documentId: contentTypeId,
          routeKey: localeVariantRoute.key,
        }
      : undefined
  const variantsQuery = useManagerQuery({
    name: 'manager.localeVariants.list',
    input: listInput ?? ({ contentType: contentTypeName, documentId: '' } as never),
    enabled: Boolean(listInput && !isTrashed),
  })
  const createMutation = useManagerMutation('manager.localeVariants.create')
  const assignMutation = useManagerMutation('manager.localeVariants.assign')
  const unassignMutation = useManagerMutation('manager.localeVariants.unassign')
  const variants = variantsQuery.data as LocaleVariantListOutput | undefined
  const assignedLanguageCodes = useMemo(
    () => new Set((variants?.assignments ?? []).map((item) => item.language.code)),
    [variants?.assignments],
  )
  const unassignedLanguages = languageList.filter(
    (language) => !assignedLanguageCodes.has(language.code),
  )
  const hasUnassignedLanguages = unassignedLanguages.length > 0

  useEffect(() => {
    if (
      createLanguage &&
      !unassignedLanguages.some((language) => language.code === createLanguage)
    ) {
      setCreateLanguage('')
    }
  }, [createLanguage, unassignedLanguages])

  const invalidate = async () => {
    if (!listInput) return

    await queryClient.invalidateQueries({
      queryKey: createManagerQueryKey('manager.localeVariants.list', listInput),
    })
  }

  const createVariant = async () => {
    if (
      !contentTypeId ||
      !localeVariantRoute ||
      !createLanguage ||
      !unassignedLanguages.some((language) => language.code === createLanguage)
    ) {
      return
    }

    try {
      const result = await createMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        routeKey: localeVariantRoute.key,
        languageCodes: createLanguage ? [createLanguage] : [],
      })
      await invalidate()
      toast.success('Locale variant created')

      const nextId = result.document._id
      if (typeof nextId === 'string') {
        navigation.push?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: nextId,
        })
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not create locale variant'))
    }
  }

  const assignLanguage = async (documentId: string) => {
    const languageCode = assignLanguageByDocument[documentId]
    if (
      !languageCode ||
      !localeVariantRoute ||
      !unassignedLanguages.some((language) => language.code === languageCode)
    ) {
      return
    }

    try {
      await assignMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
        languageCodes: [languageCode],
      })
      await invalidate()
      setAssignLanguageByDocument((current) => ({ ...current, [documentId]: '' }))
      toast.success('Locale assigned')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not assign locale'))
    }
  }

  const unassignLanguage = async (documentId: string, languageCode: string) => {
    if (!localeVariantRoute) return

    try {
      await unassignMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
        languageCodes: [languageCode],
      })
      await invalidate()
      toast.success('Locale unassigned')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not unassign locale'))
    }
  }

  if (!contentTypeId || !localeVariantRoute) {
    return (
      <div className="text-muted-foreground text-sm">
        Locale variants are available for routeable content.
      </div>
    )
  }

  if (variantsQuery.isLoading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          value={createLanguage || undefined}
          onValueChange={setCreateLanguage}
          disabled={!hasUnassignedLanguages}
        >
          <SelectTrigger className="w-52">
            <SelectValue
              placeholder={
                hasUnassignedLanguages ? 'Assign locale' : 'All locales assigned'
              }
            />
          </SelectTrigger>
          {hasUnassignedLanguages ? (
            <SelectContent>
              {unassignedLanguages.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.code} {language.name}
                </SelectItem>
              ))}
            </SelectContent>
          ) : null}
        </Select>
        <Button
          loading={createMutation.isPending}
          disabled={!createLanguage}
          onClick={() => void createVariant()}
        >
          <GitBranchPlus />
          Create variant
        </Button>
      </div>
      <div className="grid gap-3">
        {(variants?.documents ?? []).map((document) => {
          const selectedLanguage = assignLanguageByDocument[document.documentId] ?? ''
          const selectedLanguageAvailable = unassignedLanguages.some(
            (language) => language.code === selectedLanguage,
          )
          const isCurrentDocument =
            document.documentId === variants?.currentDocumentId ||
            document.documentId === contentTypeId

          return (
            <Card
              key={document.documentId}
              className={`rounded-lg py-4 ${
                isCurrentDocument ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <CardHeader className="flex-row items-start justify-between gap-4 px-4">
                <div className="min-w-0">
                  <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="truncate">{document.label}</span>
                    {isCurrentDocument ? (
                      <Badge variant="default" className="shrink-0">
                        current
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <div className="text-muted-foreground mt-1 font-mono text-xs">
                    {document.documentId}
                  </div>
                </div>
                <Badge variant={document.role === 'primary' ? 'default' : 'secondary'}>
                  {document.role}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4">
                <div className="flex flex-wrap gap-2">
                  {document.assignedLanguages.length > 0 ? (
                    document.assignedLanguages.map((language) => (
                      <Button
                        key={language.code}
                        variant="outline"
                        size="sm"
                        disabled={unassignMutation.isPending}
                        onClick={() =>
                          void unassignLanguage(document.documentId, language.code)
                        }
                      >
                        <Link2Off />
                        {language.code}
                        {language.code === languageCode ? (
                          <Badge variant="secondary" className="ml-1">
                            current
                          </Badge>
                        ) : null}
                      </Button>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No explicit locale assignments.
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selectedLanguage || undefined}
                    disabled={!hasUnassignedLanguages}
                    onValueChange={(value) =>
                      setAssignLanguageByDocument((current) => ({
                        ...current,
                        [document.documentId]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue
                        placeholder={
                          hasUnassignedLanguages
                            ? 'Assign locale'
                            : 'All locales assigned'
                        }
                      />
                    </SelectTrigger>
                    {hasUnassignedLanguages ? (
                      <SelectContent>
                        {unassignedLanguages.map((language) => (
                          <SelectItem key={language.code} value={language.code}>
                            {language.code} {language.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    ) : null}
                  </Select>
                  <Button
                    variant="outline"
                    loading={assignMutation.isPending}
                    disabled={!selectedLanguageAvailable || !hasUnassignedLanguages}
                    onClick={() => void assignLanguage(document.documentId)}
                  >
                    <Plus />
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
