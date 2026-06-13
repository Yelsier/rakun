'use client'

import type { EncodedListFieldItem, EncodedRelationField } from '@rakun-kit/core/client'
import { Box, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'
import { resolveLucideIcon } from '@/helpers/resolve-lucide-icon'
import { Badge } from '@/components/ui/badge'

const ALL_CATEGORIES = '__all__'
const FALLBACK_CATEGORY = 'Other'

type IteratorModuleDisplay = {
  category: string
  description?: string
  fieldName: string
  icon?: LucideIcon
  keywords: string[]
  props: ModuleProp[]
  technicalName: string
  title: string
}

type ModuleProp = {
  label: string
  name: string
  required: boolean
}

type ModulePickerMetadata = {
  title?: string
  description?: string
  category?: string
  icon?: string
  keywords?: string[]
}

type IteratorModuleContentType = EncodedRelationField['contentType'] & {
  modulePicker?: ModulePickerMetadata
}

const cleanText = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const getRelationField = (
  field: EncodedListFieldItem['field']
): EncodedRelationField | undefined =>
  field.config.type === 'Relation' ? (field as EncodedRelationField) : undefined

const uniqueText = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]))

const getModuleProps = (contentType: IteratorModuleContentType | undefined): ModuleProp[] =>
  Object.entries(contentType?.fields ?? {})
    .filter(([, field]) => field.visibility !== 'api')
    .map(([name, field]) => ({
      label: decodeCamelCase(name),
      name,
      required: field.isRequired,
    }))

export const getIteratorModuleDisplay = (entry: EncodedListFieldItem): IteratorModuleDisplay => {
  const relationField = getRelationField(entry.field)
  const contentType = relationField?.contentType as IteratorModuleContentType | undefined
  const modulePicker = contentType?.modulePicker
  const title =
    cleanText(modulePicker?.title) ??
    cleanText(contentType?.menu?.title) ??
    decodeCamelCase(entry.name)
  const category =
    cleanText(modulePicker?.category) ?? cleanText(contentType?.menu?.category) ?? FALLBACK_CATEGORY
  const description = cleanText(modulePicker?.description)
  const icon = resolveLucideIcon(modulePicker?.icon ?? contentType?.menu?.icon)
  const props = getModuleProps(contentType)
  const keywords = uniqueText([
    entry.name,
    contentType?.name,
    title,
    category,
    description,
    contentType?.menu?.title,
    contentType?.menu?.category,
    ...props.flatMap((prop) => [prop.name, prop.label]),
    ...(modulePicker?.keywords ?? []),
  ])

  return {
    category,
    description,
    fieldName: entry.name,
    icon,
    keywords,
    props,
    technicalName: entry.name,
    title,
  }
}

const getSearchText = (option: IteratorModuleDisplay) =>
  option.keywords.join(' ').toLocaleLowerCase()

const sortModules = (a: IteratorModuleDisplay, b: IteratorModuleDisplay) =>
  a.category.localeCompare(b.category) ||
  a.title.localeCompare(b.title) ||
  a.technicalName.localeCompare(b.technicalName)

const ModuleIcon = ({ icon: Icon }: { icon?: LucideIcon }) => {
  const ResolvedIcon = Icon ?? Box

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
      <ResolvedIcon className="size-5" />
    </div>
  )
}

export const IteratorModulePickerDialog = ({
  fields,
  onAdd,
}: {
  fields: EncodedListFieldItem[]
  onAdd: (fieldName: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const options = useMemo(() => fields.map(getIteratorModuleDisplay).sort(sortModules), [fields])
  const categories = useMemo(
    () =>
      Array.from(new Set(options.map((option) => option.category))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [options]
  )
  const searchTerm = search.trim().toLocaleLowerCase()
  const filteredOptions = useMemo(
    () =>
      options.filter((option) => {
        const matchesCategory =
          selectedCategory === ALL_CATEGORIES || option.category === selectedCategory
        const matchesSearch = searchTerm.length === 0 || getSearchText(option).includes(searchTerm)

        return matchesCategory && matchesSearch
      }),
    [options, searchTerm, selectedCategory]
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setSearch('')
      setSelectedCategory(ALL_CATEGORIES)
    }
  }

  const handleAdd = (fieldName: string) => {
    onAdd(fieldName)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          Add module
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-screen max-w-5xl! overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Add module</DialogTitle>
          <DialogDescription className="sr-only">
            Select a module to add to the iterator.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 px-6 pb-6">
          <div className="grid gap-3">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search modules"
            />
            {categories.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedCategory === ALL_CATEGORIES ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(ALL_CATEGORIES)}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <ScrollArea className="h-[58vh] rounded-md border">
            {filteredOptions.length > 0 ? (
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOptions.map((option) => (
                  <button
                    key={option.fieldName}
                    type="button"
                    className="group grid min-w-0 gap-3 rounded-md border bg-card p-4 text-left shadow-xs transition-colors hover:border-primary/50 hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-hidden"
                    onClick={() => handleAdd(option.fieldName)}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <ModuleIcon icon={option.icon} />
                      <div className="grid min-w-0 gap-1">
                        <span className="wrap-break-word text-sm font-medium leading-5">
                          {option.title}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {option.category}
                        </span>
                      </div>
                    </div>
                    {option.description ? (
                      <p className="wrap-break-word text-sm leading-5 text-muted-foreground">
                        {option.description}
                      </p>
                    ) : null}
                    {option.props.length > 0 ? (
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {option.props.map((prop) => (
                          <Badge key={prop.name} variant={'secondary'}>
                            <span className="truncate">{prop.label}</span>
                            {prop.required ? (
                              <>
                                <span aria-hidden="true" className="text-destructive">
                                  *
                                </span>
                                <span className="sr-only">required</span>
                              </>
                            ) : null}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                No modules found.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
