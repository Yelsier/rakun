'use client'

import {
  GitBranch,
  Globe,
  LayoutPanelTop,
  LayoutTemplate,
  MapPinned,
  NotepadText,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'

import { useEditPageContext } from '../_context/EditPageContext'
import type { EditPageTab } from '../edit.types'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translateLayoutModuleLabel, useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'

type EditSection = {
  icon: LucideIcon
  label: string
  value: EditPageTab
  hasError?: boolean
}

const tabErrorClassName =
  '!text-destructive data-[state=active]:!text-destructive after:bg-destructive'

const EditSectionTab = ({
  orientation,
  section,
}: {
  orientation: 'horizontal' | 'vertical'
  section: EditSection
}) => {
  const Icon = section.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex size-9 shrink-0">
          <TabsTrigger
            value={section.value}
            aria-label={section.label}
            className={cn(
              'relative size-9 w-9 flex-none self-center justify-center! overflow-visible p-0 data-[state=active]:border-primary/20! data-[state=active]:bg-primary/10! data-[state=active]:text-primary! data-[state=active]:shadow-sm! data-[state=active]:after:bg-primary!',
              orientation === 'vertical'
                ? 'data-[state=active]:rounded-r-none'
                : 'data-[state=active]:rounded-b-none',
              section.hasError && tabErrorClassName
            )}
          >
            <Icon />
            <span className="sr-only">{section.label}</span>
            {section.hasError ? (
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive" />
            ) : null}
          </TabsTrigger>
        </span>
      </TooltipTrigger>
      <TooltipContent side={orientation === 'vertical' ? 'right' : 'bottom'} sideOffset={6}>
        {section.label}
      </TooltipContent>
    </Tooltip>
  )
}

export const EditSectionNavigation = () => {
  const t = useTranslations()
  const { isMobile } = useSidebar()
  const {
    contentTypeId,
    hasLocaleVariants,
    hasVersioning,
    routeLayout,
    sections,
    tabErrors,
    template,
  } = useEditPageContext()
  const editSections: EditSection[] = [
    ...(sections.hasNonIterables
      ? [
          {
            icon: NotepadText,
            label: t('contentEdit.tabInfo'),
            value: 'info',
            hasError: tabErrors.info,
          } satisfies EditSection,
        ]
      : []),
    ...(sections.hasIterables
      ? [
          {
            icon: ScrollText,
            label: t('contentEdit.tabContent'),
            value: 'content',
            hasError: tabErrors.content,
          } satisfies EditSection,
        ]
      : []),
    ...(template.enabled
      ? [
          {
            icon: LayoutTemplate,
            label: t('contentEdit.tabTemplate'),
            value: 'template',
            hasError: tabErrors.template,
          } satisfies EditSection,
        ]
      : []),
    ...(sections.hasSeo
      ? [
          {
            icon: Globe,
            label: t('contentEdit.tabSeo'),
            value: 'seo',
            hasError: tabErrors.seo,
          } satisfies EditSection,
        ]
      : []),
    ...routeLayout.routeLayoutModules.map(
      (layoutModule) =>
        ({
          icon: LayoutPanelTop,
          label: translateLayoutModuleLabel(t, layoutModule.key, layoutModule.contentType),
          value: `layout:${layoutModule._id}`,
        }) satisfies EditSection
    ),
    ...(hasLocaleVariants
      ? [
          {
            icon: MapPinned,
            label: t('contentEdit.tabVariants'),
            value: 'variants',
          } satisfies EditSection,
        ]
      : []),
    ...(hasVersioning && contentTypeId
      ? [
          {
            icon: GitBranch,
            label: t('contentEdit.tabHistory'),
            value: 'history',
          } satisfies EditSection,
        ]
      : []),
  ]

  return (
    <nav
      className="shrink-0 border-b bg-muted/20 md:flex md:min-h-0 md:w-14 md:flex-col md:border-r md:border-b-0 md:p-0"
      data-tour="content-edit-tabs"
    >
      {isMobile ? (
        <TabsList
          variant="line"
          className="flex h-13 w-full max-w-full flex-row items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-none px-3 py-2"
        >
          {editSections.map((section) => (
            <EditSectionTab key={section.value} orientation="horizontal" section={section} />
          ))}
        </TabsList>
      ) : (
        <TabsList
          variant="line"
          className="hidden h-auto w-full flex-1 flex-col items-center justify-start gap-1 overflow-y-auto rounded-none p-2 md:flex"
        >
          {editSections.map((section) => (
            <EditSectionTab key={section.value} orientation="vertical" section={section} />
          ))}
        </TabsList>
      )}
    </nav>
  )
}
