'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckIcon,
  ExternalLink,
  GitBranchPlus,
  Link2Off,
  Plus,
  Rocket,
} from 'lucide-react'
import type { ListContentVersionsOutput } from '@rakun-kit/core/client'

import { useEditPageContext } from '../_context/EditPageContext'
import { VariantNameDialog } from './VariantNameDialog'

import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@/components/ui/shadcn-io/tags'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useManagerNavigation } from '@/state/navigation'
import { useQueryClient } from '@tanstack/react-query'

const reviewBadgeVariant = (status?: string) => {
  if (status === 'approved') return 'default' as const
  if (status === 'changes_requested') return 'destructive' as const
  return 'secondary' as const
}

const LocaleMultiSelect = ({
  options,
  value,
  onValueChange,
}: {
  options: Array<{ value: string; label: string; active: boolean }>
  value: string[]
  onValueChange: (value: string[]) => void
}) => {
  const labelsByValue = new Map(options.map((option) => [option.value, option.label]))
  const remove = (removedValue: string) =>
    onValueChange(value.filter((item) => item !== removedValue))
  const toggle = (selectedValue: string) =>
    value.includes(selectedValue) ? remove(selectedValue) : onValueChange([...value, selectedValue])

  return (
    <Tags className="min-w-64 max-w-md">
      <TagsTrigger placeholder="Select locales...">
        {value.map((selectedValue) => (
          <TagsValue key={selectedValue} onRemove={() => remove(selectedValue)}>
            {labelsByValue.get(selectedValue) ?? selectedValue}
          </TagsValue>
        ))}
      </TagsTrigger>
      <TagsContent>
        <TagsInput placeholder="Search locale..." />
        <TagsList>
          <TagsEmpty>No locales found.</TagsEmpty>
          <TagsGroup>
            {options.map((option) => (
              <TagsItem key={option.value} value={option.value} onSelect={toggle}>
                <span>
                  {option.label}
                  {option.active ? (
                    <span className="text-muted-foreground"> · currently active</span>
                  ) : null}
                </span>
                {value.includes(option.value) ? (
                  <CheckIcon className="text-muted-foreground" size={14} />
                ) : null}
              </TagsItem>
            ))}
          </TagsGroup>
        </TagsList>
      </TagsContent>
    </Tags>
  )
}

export const ContentVariants = () => {
  const {
    contentTypeId,
    contentTypeName,
    handleVisibilityChange,
    isTrashed,
    languageCode,
    languageList,
    localeVariantRoute,
  } = useEditPageContext()
  const navigation = useManagerNavigation()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [localesByDocument, setLocalesByDocument] = useState<Record<string, string[]>>({})
  const listInput =
    contentTypeId && localeVariantRoute
      ? {
          contentType: contentTypeName,
          documentId: contentTypeId,
          routeKey: localeVariantRoute.key,
        }
      : undefined
  const versionsQuery = useManagerQuery({
    name: 'manager.contentVersions.list',
    input: listInput ?? ({ contentType: contentTypeName, documentId: '' } as never),
    enabled: Boolean(listInput && !isTrashed),
  })
  const createMutation = useManagerMutation('manager.contentVersions.create')
  const promoteMutation = useManagerMutation('manager.contentVersions.promote')
  const assignMutation = useManagerMutation('manager.localeVariants.assign')
  const unassignMutation = useManagerMutation('manager.localeVariants.unassign')
  const versions = versionsQuery.data as ListContentVersionsOutput | undefined
  const hasPublishedVersion = (versions?.documents ?? []).some(
    (document) => document.visibility === 'published',
  )
  const assignedLanguageCodes = useMemo(
    () =>
      new Set(
        (versions?.documents ?? []).flatMap((document) =>
          document.assignedLanguages.map((language) => language.code),
        ),
      ),
    [versions?.documents],
  )

  const invalidate = async () => {
    if (!listInput) return
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: createManagerQueryKey('manager.contentVersions.list', listInput),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [, name, input] = query.queryKey as [
            string?,
            string?,
            { contentType?: string }?,
          ]
          return (
            name === 'manager.localeVariants.list' &&
            input?.contentType === contentTypeName
          )
        },
      }),
    ])
  }

  const createVersion = async (name: string) => {
    if (!contentTypeId || !localeVariantRoute) return
    try {
      const result = await createMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        name,
        routeKey: localeVariantRoute.key,
      })
      await invalidate()
      setCreateDialogOpen(false)
      toast.success('Draft variant created')
      const nextId = result.document._id
      if (typeof nextId === 'string') {
        navigation.push?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: nextId,
        })
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not create draft variant'))
    }
  }

  const moveLocale = async (
    documentId: string,
    approved: boolean,
    initialPublication: boolean,
    assignedLocales: string[],
  ) => {
    const selectedLocales = localesByDocument[documentId] ?? []
    const languageCodes = initialPublication
      ? assignedLocales.length
        ? assignedLocales
        : [languageCode]
      : selectedLocales
    if (!languageCodes.length || !localeVariantRoute) return
    try {
      if (approved) {
        await promoteMutation.mutateAsync({
          contentType: contentTypeName,
          documentId,
          routeKey: localeVariantRoute.key,
          languageCodes,
        })
        if (documentId === contentTypeId) {
          handleVisibilityChange('published')
        }
        toast.success(initialPublication ? 'Page published' : 'Variant promoted')
      } else {
        await assignMutation.mutateAsync({
          contentType: contentTypeName,
          documentId,
          routeKey: localeVariantRoute.key,
          languageCodes,
        })
        toast.success('Locale moved')
      }
      setLocalesByDocument((current) => ({ ...current, [documentId]: [] }))
      await invalidate()
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not move locale'))
    }
  }

  const unassignLanguage = async (documentId: string, locale: string) => {
    if (!localeVariantRoute) return
    try {
      await unassignMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
        languageCodes: [locale],
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
        Variants are available for routeable content.
      </div>
    )
  }
  if (versionsQuery.isLoading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <VariantNameDialog
        open={createDialogOpen}
        loading={createMutation.isPending}
        onOpenChange={setCreateDialogOpen}
        onConfirm={createVersion}
      />
      <div>
        <Button
          loading={createMutation.isPending}
          onClick={() => setCreateDialogOpen(true)}
        >
          <GitBranchPlus />
          Create draft variant
        </Button>
      </div>
      <div className="grid gap-3">
        {(versions?.documents ?? []).map((document) => {
          const selectedLocales = localesByDocument[document.documentId] ?? []
          const isCurrent = document.documentId === contentTypeId
          const approved = document.reviewStatus === 'approved'
          const reviewPending =
            document.reviewStatus === 'pending' ||
            document.reviewStatus === 'changes_requested' ||
            document.reviewStatus === 'outdated'
          const reviewBlocked = document.reviewRequired && !approved
          const initialPublication =
            approved && document.visibility === 'draft' && !hasPublishedVersion
          const assignedLocales = document.assignedLanguages.map((language) => language.code)

          return (
            <Card
              key={document.documentId}
              className={`rounded-lg py-4 ${isCurrent ? 'border-primary bg-primary/5' : ''}`}
            >
              <CardHeader className="flex-row items-start justify-between gap-4 px-4">
                <div className="min-w-0">
                  <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <span className="truncate">{document.label}</span>
                    {isCurrent ? <Badge>current</Badge> : null}
                    {document.visibility ? (
                      <Badge variant="outline">{document.visibility}</Badge>
                    ) : null}
                    {document.reviewStatus ? (
                      <Badge variant={reviewBadgeVariant(document.reviewStatus)}>
                        {document.reviewStatus.replaceAll('_', ' ')}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <div className="text-muted-foreground mt-1 font-mono text-xs">
                    {document.documentId}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigation.push?.({
                          name: 'content.edit',
                          contentType: contentTypeName,
                          id: document.documentId,
                        })
                      }
                    >
                      <ExternalLink />
                      Open
                    </Button>
                  ) : null}
                  <Badge variant={document.role === 'primary' ? 'default' : 'secondary'}>
                    {document.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4">
                <div className="flex flex-wrap gap-2">
                  {document.assignedLanguages.length ? (
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
                      No locale assignments.
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!initialPublication ? (
                    <div className="flex min-w-64 flex-col gap-1">
                      <LocaleMultiSelect
                        options={languageList.map((language) => ({
                          value: language.code,
                          label: `${language.code} ${language.name}`,
                          active: assignedLanguageCodes.has(language.code),
                        }))}
                        value={selectedLocales}
                        onValueChange={(value) =>
                          setLocalesByDocument((current) => ({
                            ...current,
                            [document.documentId]: value,
                          }))
                        }
                      />
                      {assignedLanguageCodes.size ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="self-start"
                          onClick={() =>
                            setLocalesByDocument((current) => ({
                              ...current,
                              [document.documentId]: Array.from(assignedLanguageCodes),
                            }))
                          }
                        >
                          Select all active locales
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex items-center text-sm">
                      This is a new page. It will be published in {languageCode}.
                    </div>
                  )}
                  <Button
                    variant={approved ? 'default' : 'outline'}
                    loading={promoteMutation.isPending || assignMutation.isPending}
                    disabled={
                      (!initialPublication && !selectedLocales.length) ||
                      reviewPending ||
                      reviewBlocked
                    }
                    onClick={() =>
                      void moveLocale(
                        document.documentId,
                        approved,
                        initialPublication,
                        assignedLocales,
                      )
                    }
                  >
                    {approved ? <Rocket /> : <Plus />}
                    {approved
                      ? initialPublication
                        ? 'Publish page'
                        : 'Promote'
                      : reviewBlocked
                        ? 'Review required'
                        : 'Move locale'}
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
