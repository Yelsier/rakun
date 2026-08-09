'use client'

import type { RouteSchema } from '@rakun-kit/core/internal-content-types'
import type { EncodedContentType, LinkfieldValue } from '@rakun-kit/core/client'
import { getListField } from '@rakun-kit/core/client'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, FileText, Home, Link2, LoaderCircle, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { LinkPropsRef } from '.'
import { errorStyle } from '../../edit.styles'
import { useFieldValues } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { useTRPC } from '@/components/trpc-provider'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'
import { resolveLucideIcon } from '@/helpers/resolve-lucide-icon'
import { useTranslations } from '@/i18n'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

type InternalLinkValue = Extract<LinkfieldValue, { routeId: string }>
type DirectLinkValue = Extract<LinkfieldValue, { href: string }>

type LinkDocument = Record<string, unknown> & {
  _id: string
}

const EMPTY_LINK: DirectLinkValue = {
  href: '',
  title: '',
}

const isInternalLinkValue = (value: LinkfieldValue): value is InternalLinkValue =>
  typeof value === 'object' && value !== null && 'routeId' in value && 'contentTypeId' in value

const isDirectLinkValue = (value: LinkfieldValue): value is DirectLinkValue =>
  typeof value === 'object' && value !== null && 'href' in value

const getLinkTitle = (value: LinkfieldValue) =>
  typeof value === 'object' && value !== null && 'title' in value ? (value.title ?? '') : ''

const LinkUI: React.FC<LinkPropsRef> = ({ id, ref, ...props }) => {
  const t = useTranslations()
  const trpc = useTRPC()
  const { getTranslation } = useLanguage()
  const [open, setOpen] = useState(false)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)
  const [pendingSelectedLabel, setPendingSelectedLabel] = useState<string | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [popoverWidth, setPopoverWidth] = useState<number>()

  const { value, errors, onValueChange, getValue, getState } = useFieldValues<LinkfieldValue>({
    id,
    isRequired: props.isRequired,
    isTranslatable: props.isTranslatable,
    defaultData: props.defaultData as LinkfieldValue,
    defaultValue: EMPTY_LINK,
    validateValue: (nextValue) => {
      if (typeof nextValue === 'string') return null
      if (isDirectLinkValue(nextValue)) {
        if (!nextValue.href) {
          return props.isRequired || nextValue.title ? t('linkPicker.destinationRequired') : null
        }
        return null
      }
      if (!nextValue.routeId && !nextValue.contentTypeId) {
        return props.isRequired || nextValue.title ? t('linkPicker.destinationRequired') : null
      }
      if (!nextValue.routeId) return t('linkPicker.routeRequired')
      if (!nextValue.contentTypeId) return t('linkPicker.itemRequired')
      return null
    },
  })

  const {
    data: routesData,
    error: routesError,
    isPending: routesPending,
  } = useQuery(
    trpc.manager.list.queryOptions({
      contentType: 'Route',
      query: {
        options: {
          limit: 'all',
        },
      },
    })
  )
  const {
    data: contentTypesData,
    error: contentTypesError,
    isPending: contentTypesPending,
  } = useQuery(trpc.manager.contentTypes.queryOptions())

  const routes = useMemo(
    () =>
      (
        ((routesData as { items?: RouteSchema[] } | undefined)?.items ?? []) as RouteSchema[]
      ).filter((route) => route.hasPage),
    [routesData]
  )
  const contentTypes = (contentTypesData ?? []) as EncodedContentType[]
  const contentTypesByName = useMemo(
    () => new Map(contentTypes.map((contentType) => [contentType.name, contentType])),
    [contentTypes]
  )
  const activeRoute = routes.find((route) => route._id === activeRouteId)
  const activeContentType = activeRoute
    ? contentTypesByName.get(activeRoute.contentType)
    : undefined
  const internalValue = isInternalLinkValue(value) ? value : null
  const directValue = isDirectLinkValue(value) ? value : null
  const linkTitle = getLinkTitle(value)
  const selectedRoute = internalValue
    ? routes.find((route) => route._id === internalValue.routeId)
    : undefined
  const selectedContentType = selectedRoute
    ? contentTypesByName.get(selectedRoute.contentType)
    : undefined

  const { data: selectedDocument } = useQuery({
    ...trpc.manager.get.queryOptions({
      contentType: selectedRoute?.contentType ?? 'Route',
      id: internalValue?.contentTypeId ?? '',
    }),
    enabled: Boolean(selectedRoute && internalValue?.contentTypeId),
  })

  const {
    data: routeItemsData,
    error: routeItemsError,
    isPending: routeItemsPending,
  } = useQuery({
    ...trpc.manager.list.queryOptions({
      contentType: activeRoute?.contentType ?? 'Route',
      query: {
        options: {
          limit: 'all',
        },
      },
    }),
    enabled: Boolean(activeRoute),
  })

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return

    const updateWidth = () => setPopoverWidth(anchor.offsetWidth)
    updateWidth()

    if (typeof ResizeObserver === 'undefined') return
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(anchor)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (selectedDocument) setPendingSelectedLabel(null)
  }, [selectedDocument])

  const getDocumentLabel = (document: LinkDocument, contentType?: EncodedContentType) => {
    const label = getListField(document, contentType?.listFields ?? [])
    return getTranslation(label) || document._id
  }

  const getRouteTitle = (route: RouteSchema) => {
    const contentType = contentTypesByName.get(route.contentType)
    return contentType?.menu?.title ? t(contentType.menu.title) : decodeCamelCase(route.contentType)
  }

  const selectedDocumentLabel = selectedDocument
    ? getDocumentLabel(selectedDocument as LinkDocument, selectedContentType)
    : null
  const requiresPublishedPage = props.parentContentType?.name === 'LlmsSettings'
  const selectedPageIsNotPublished = Boolean(
    requiresPublishedPage &&
      internalValue &&
      selectedContentType?.documentVisibility &&
      selectedDocument &&
      (selectedDocument as LinkDocument)._visibility !== 'published'
  )
  const displayValue =
    typeof value === 'string'
      ? value
      : directValue
        ? directValue.href
        : (selectedDocumentLabel ??
          pendingSelectedLabel ??
          (internalValue?.contentTypeId ? t('linkPicker.selected') : ''))
  const allRouteItems = ((routeItemsData as { items?: LinkDocument[] } | undefined)?.items ??
    []) as LinkDocument[]
  const routeItems =
    props.parentContentType?.name === 'LlmsSettings' && activeContentType?.documentVisibility
      ? allRouteItems.filter((document) => document._visibility === 'published')
      : allRouteItems
  const error = errors.find((item) => item.id === id)?.error

  const closePicker = () => {
    setOpen(false)
  }

  const openPicker = () => {
    if (!open) setActiveRouteId(null)
    setOpen(true)
  }

  const selectDirectUrl = (url: string) => {
    setPendingSelectedLabel(null)
    setActiveRouteId(null)
    onValueChange({ href: url, title: linkTitle })
  }

  const clearLink = () => {
    setPendingSelectedLabel(null)
    setActiveRouteId(null)
    onValueChange(EMPTY_LINK)
  }

  const updateTitle = (title: string) => {
    if (typeof value === 'string') {
      onValueChange({ href: value, title })
      return
    }

    onValueChange({ ...value, title })
  }

  const selectInternalLink = (document: LinkDocument) => {
    if (!activeRoute) return
    const label = getDocumentLabel(document, activeContentType)
    setPendingSelectedLabel(label)
    onValueChange({
      routeId: activeRoute._id,
      contentTypeId: document._id,
      title: linkTitle || label,
    })
    closePicker()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !open) setActiveRouteId(null)
    setOpen(nextOpen)
  }

  return (
    <FieldWrapper id={id} errors={errors} getValue={getValue} getState={getState} ref={ref}>
      <div className="grid gap-3">
        <Label className="grid gap-1.5">
          {t('linkPicker.title')}
          <Input
            onChange={(event) => updateTitle(event.target.value)}
            placeholder={t('linkPicker.titlePlaceholder')}
            value={linkTitle}
          />
        </Label>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">{t('linkPicker.destination')}</span>
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverAnchor asChild>
              <div ref={anchorRef} className="relative w-full">
                <Link2
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-invalid={Boolean(error)}
                  className={errorStyle({
                    error: Boolean(error),
                    className: 'pl-9 pr-9',
                  })}
                  onBlur={() => {
                    if (!internalValue && displayValue !== displayValue.trim()) {
                      selectDirectUrl(displayValue.trim())
                    }
                  }}
                  onChange={(event) => selectDirectUrl(event.target.value)}
                  onClick={openPicker}
                  onFocus={openPicker}
                  placeholder={props.dynamicFallbackPlaceholder ?? t('linkPicker.placeholder')}
                  value={displayValue}
                />
                {displayValue ? (
                  <Button
                    aria-label={t('linkPicker.clear')}
                    className="absolute right-0 top-0 text-muted-foreground hover:text-foreground"
                    onClick={clearLink}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
            </PopoverAnchor>
            <PopoverContent
              align="start"
              avoidCollisions={false}
              className="overflow-hidden p-0"
              onInteractOutside={(event) => {
                if (anchorRef.current?.contains(event.target as Node)) {
                  event.preventDefault()
                }
              }}
              onOpenAutoFocus={(event) => event.preventDefault()}
              side="top"
              style={popoverWidth ? { width: popoverWidth } : undefined}
            >
              {activeRoute ? (
                <div>
                  <div className="flex items-center gap-2 border-b p-2">
                    <Button
                      aria-label={t('linkPicker.back')}
                      onClick={() => setActiveRouteId(null)}
                      size="icon"
                      variant="ghost"
                    >
                      <ArrowLeft />
                    </Button>
                    <span className="truncate text-sm font-medium">
                      {getRouteTitle(activeRoute)}
                    </span>
                  </div>
                  {routeItemsError ? (
                    <p className="px-3 py-6 text-center text-sm text-destructive">
                      {t('linkPicker.loadError')}
                    </p>
                  ) : routeItemsPending ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      {t('common.loading')}
                    </div>
                  ) : (
                    <Command key={activeRoute._id}>
                      <CommandInput autoFocus placeholder={t('linkPicker.search')} />
                      <CommandList>
                        <CommandEmpty>{t('linkPicker.noResults')}</CommandEmpty>
                        <CommandGroup>
                          {routeItems.map((document) => {
                            const label = getDocumentLabel(document, activeContentType)
                            return (
                              <CommandItem
                                key={document._id}
                                keywords={[label, document._id]}
                                onSelect={() => selectInternalLink(document)}
                                value={`${label} ${document._id}`}
                              >
                                <FileText />
                                <span className="truncate">{label}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  )}
                </div>
              ) : (
                <div>
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium">{t('linkPicker.chooseDestination')}</p>
                    <p className="text-xs text-muted-foreground">{t('linkPicker.directHint')}</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1">
                    <button
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      onClick={() => {
                        onValueChange({
                          href: '/',
                          title: linkTitle || t('linkPicker.homepage'),
                        })
                        closePicker()
                      }}
                      type="button"
                    >
                      <span className="flex size-8 items-center justify-center rounded-md border bg-background">
                        <Home className="size-4" />
                      </span>
                      <span className="flex-1 font-medium">{t('linkPicker.homepage')}</span>
                    </button>
                    <p className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">
                      {t('linkPicker.routeTypes')}
                    </p>
                    {routesError || contentTypesError ? (
                      <p className="px-2 py-4 text-center text-sm text-destructive">
                        {t('linkPicker.loadError')}
                      </p>
                    ) : routesPending || contentTypesPending ? (
                      <div className="flex items-center justify-center gap-2 px-2 py-4 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin" />
                        {t('common.loading')}
                      </div>
                    ) : routes.length === 0 ? (
                      <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                        {t('linkPicker.noRoutes')}
                      </p>
                    ) : (
                      routes.map((route) => {
                        const contentType = contentTypesByName.get(route.contentType)
                        const RouteIcon = resolveLucideIcon(contentType?.menu?.icon) ?? FileText
                        return (
                          <button
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                            key={route._id}
                            onClick={() => setActiveRouteId(route._id)}
                            type="button"
                          >
                            <span className="flex size-8 items-center justify-center rounded-md border bg-background">
                              <RouteIcon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {getRouteTitle(route)}
                            </span>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {selectedPageIsNotPublished ? (
            <p className="text-sm text-destructive">{t('linkPicker.publishedRequired')}</p>
          ) : null}
        </div>
      </div>
    </FieldWrapper>
  )
}

export default LinkUI
