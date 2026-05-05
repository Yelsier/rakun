'use client'

import type { ListLiteralsOutput } from '@rakun/core'
import { AlertTriangle, Info, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { formatList } from '@/helpers/format-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

const placeholderHint = (name: string, kind: string) => {
  if (kind === 'plural') {
    return `{${name}, plural, =0 {...} one {...} other {...}}`
  }
  if (kind === 'select') {
    return `{${name}, select, option {...} other {...}}`
  }
  if (kind === 'selectordinal') {
    return `{${name}, selectordinal, one {...} two {...} few {...} other {...}}`
  }
  return `{${name}}`
}

const getPluralCategory = (locale: string, value: number) =>
  new Intl.PluralRules(locale).select(value)

const getLiteralNamespace = (key: string) => key.split('.')[0] || key

const getLiteralDisplayKey = (key: string) => {
  const firstDot = key.indexOf('.')
  if (firstDot === -1) return key
  return key.slice(firstDot + 1)
}

const renderIcuPreview = ({
  message,
  locale,
  values,
}: {
  message: string
  locale: string
  values: Record<string, string>
}) => {
  const resolveComplex = message.replace(
    /\{(\w+),\s*(plural|select|selectordinal),\s*((?:[^{}]|\{[^{}]*\})*)\}/g,
    (_full, varName: string, kind: string, rawOptions: string) => {
      const options = new Map<string, string>()
      const optionRegex = /(=\d+|zero|one|two|few|many|other|\w+)\s*\{([^}]*)\}/g

      for (const match of rawOptions.matchAll(optionRegex)) {
        if (match[1] && match[2]) {
          options.set(match[1], match[2])
        }
      }

      const rawValue = values[varName] ?? ''
      if (kind === 'select') {
        return options.get(rawValue) ?? options.get('other') ?? ''
      }

      const numeric = Number(rawValue || 0)
      const exactKey = `=${numeric}`
      const category = getPluralCategory(locale, numeric)
      const selected =
        options.get(exactKey) ??
        options.get(category) ??
        options.get('other') ??
        ''

      return selected.replace(/#/g, String(numeric))
    },
  )

  return resolveComplex.replace(/\{(\w+)\}/g, (_full, varName: string) => {
    return values[varName] ?? `{${varName}}`
  })
}

export const ManagerSettingsLiteralsScreen = () => {
  const [locale, setLocale] = useState('')
  const [selectedNamespace, setSelectedNamespace] = useState('')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const { hasPermissions } = useSession()
  const listQuery = useManagerQuery({
    name: 'manager.literals.list',
    input: locale ? { locale } : {},
  })
  const upsertMutation = useManagerMutation('manager.literals.upsert')

  useEffect(() => {
    if (!listQuery.data) return
    if (!locale) {
      setLocale(listQuery.data.selectedLocale)
      return
    }

    const localeExists = listQuery.data.locales.some((language) => language.code === locale)
    if (!localeExists) {
      setLocale(listQuery.data.selectedLocale)
    }
  }, [listQuery.data, locale])

  const namespaces = useMemo(() => {
    if (!listQuery.data) return []
    return Array.from(
      new Set(listQuery.data.items.map((item) => getLiteralNamespace(item.key))),
    )
  }, [listQuery.data])

  useEffect(() => {
    if (namespaces.length === 0) return
    if (!selectedNamespace || !namespaces.includes(selectedNamespace)) {
      const firstNamespace = namespaces[0]
      if (firstNamespace) {
        setSelectedNamespace(firstNamespace)
      }
    }
  }, [namespaces, selectedNamespace])

  const filteredItems = useMemo(() => {
    if (!listQuery.data) return []
    const value = search.trim().toLowerCase()
    const namespaceFiltered = selectedNamespace
      ? listQuery.data.items.filter(
          (item) => getLiteralNamespace(item.key) === selectedNamespace,
        )
      : listQuery.data.items

    if (!value) return namespaceFiltered

    return namespaceFiltered.filter((item) => {
      const displayKey = getLiteralDisplayKey(item.key).toLowerCase()
      return (
        item.key.toLowerCase().includes(value) ||
        displayKey.includes(value) ||
        item.description.toLowerCase().includes(value) ||
        item.usedBy.some((usage) => usage.toLowerCase().includes(value))
      )
    })
  }, [listQuery.data, search, selectedNamespace])

  useEffect(() => {
    if (filteredItems.length === 0) return
    if (!filteredItems.some((item) => item.key === selectedKey)) {
      const firstItem = filteredItems[0]
      if (firstItem) {
        setSelectedKey(firstItem.key)
      }
    }
  }, [filteredItems, selectedKey])

  const selectedLiteral = useMemo(
    () => filteredItems.find((item) => item.key === selectedKey) || null,
    [filteredItems, selectedKey],
  )

  useEffect(() => {
    if (!selectedLiteral) return
    setMessageDraft(selectedLiteral.translation || selectedLiteral.defaultMessage)
    setPreviewValues(
      Object.fromEntries(
        selectedLiteral.variables.map((variable) => [
          variable.name,
          variable.kind === 'plural' || variable.kind === 'selectordinal'
            ? '1'
            : variable.kind === 'select'
              ? 'other'
              : 'example',
        ]),
      ),
    )
  }, [selectedLiteral])

  if (!hasPermissions(['manager.literals.readAny'])) {
    return (
      <UnauthorizedMessage neededPermission={['manager.literals.readAny']} />
    )
  }

  if (listQuery.isLoading || !listQuery.data || !locale) {
    return (
      <div className='container mx-auto grid gap-4 px-4 py-10'>
        <Skeleton className='h-16 w-full' />
        <Skeleton className='h-96 w-full' />
      </div>
    )
  }

  const data = listQuery.data as ListLiteralsOutput
  const hasDraftChanges =
    !!selectedLiteral &&
    messageDraft !== (selectedLiteral.translation || selectedLiteral.defaultMessage)

  const onSave = async () => {
    if (!selectedLiteral) return

    try {
      await upsertMutation.mutateAsync({
        key: selectedLiteral.key,
        locale,
        message: messageDraft,
      })
      toast.success('Literal translation saved')
      await listQuery.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving literal')
    }
  }

  return (
    <div className='container mx-auto flex flex-col gap-4 px-4 py-10'>
      <Card>
        <CardHeader>
          <CardTitle>Literals</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center gap-3'>
          <label className='text-sm font-medium'>Locale</label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className='w-60'>
              <SelectValue placeholder='Select locale' />
            </SelectTrigger>
            <SelectContent>
              {data.locales.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.name} ({language.code})
                  {language.default ? ' • default' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder='Search by key, description or module'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='max-w-sm'
          />
          <Badge variant='outline'>Default locale: {data.defaultLocale}</Badge>
          <Badge variant='secondary'>{filteredItems.length} literals</Badge>
        </CardContent>
      </Card>

      <div className='grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]'>
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle>Namespaces</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3'>
            <Tabs
              value={selectedNamespace}
              onValueChange={setSelectedNamespace}
              orientation='vertical'
            >
              <TabsList className='grid h-auto grid-cols-1'>
                {namespaces.map((namespace) => (
                  <TabsTrigger
                    key={namespace}
                    value={namespace}
                    className='justify-start'
                  >
                    {namespace}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <div className='grid gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>Keys</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-2'>
              {filteredItems.map((item) => (
                <button
                  key={item.key}
                  type='button'
                  className={`rounded-md border px-3 py-2 text-left ${
                    item.key === selectedKey ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setSelectedKey(item.key)}
                >
                  <div className='font-medium'>{getLiteralDisplayKey(item.key)}</div>
                  <div className='text-muted-foreground text-xs'>{item.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedLiteral ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedLiteral.key}</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  {selectedLiteral.hasTranslation ? (
                    <Badge>Translated</Badge>
                  ) : (
                    <Badge variant='secondary'>Using default</Badge>
                  )}
                  {!selectedLiteral.validation.isValid ? (
                    <Badge variant='destructive'>Needs review</Badge>
                  ) : null}
                </div>
                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Description</label>
                  <p className='text-muted-foreground text-sm'>
                    {selectedLiteral.description}
                  </p>
                </div>
                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Default message</label>
                  <Textarea value={selectedLiteral.defaultMessage} readOnly />
                </div>
                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Translation</label>
                  <Textarea
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    disabled={!hasPermissions(['manager.literals.updateAny'])}
                  />
                </div>
                <div className='grid gap-3'>
                  <div className='flex items-center gap-2'>
                    <Info size={16} />
                    <span className='text-sm font-medium'>Variables</span>
                  </div>
                  {selectedLiteral.variables.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>No variables.</p>
                  ) : (
                    selectedLiteral.variables.map((variable) => (
                      <div key={variable.name} className='grid gap-2'>
                        <label className='text-sm font-medium'>
                          {variable.name}
                        </label>
                        <Input
                          value={previewValues[variable.name] || ''}
                          placeholder={placeholderHint(variable.name, variable.kind)}
                          onChange={(event) =>
                            setPreviewValues((current) => ({
                              ...current,
                              [variable.name]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
                {!selectedLiteral.validation.isValid ? (
                  <Card className='border-destructive'>
                    <CardContent className='flex flex-col gap-3 pt-6 text-sm'>
                      <div className='flex items-center gap-2 text-destructive'>
                        <AlertTriangle size={16} />
                        Validation issues
                      </div>
                      {selectedLiteral.validation.missing.length ? (
                        <p>
                          Missing: {formatList(selectedLiteral.validation.missing, locale)}
                        </p>
                      ) : null}
                      {selectedLiteral.validation.kindMismatch.length ? (
                        <p>
                          Kind mismatch:{' '}
                          {formatList(selectedLiteral.validation.kindMismatch, locale)}
                        </p>
                      ) : null}
                      {selectedLiteral.validation.extra.length ? (
                        <p>
                          Extra: {formatList(selectedLiteral.validation.extra, locale)}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Preview</label>
                  <Card>
                    <CardContent className='pt-6 text-sm'>
                      {renderIcuPreview({
                        message: messageDraft,
                        locale,
                        values: previewValues,
                      })}
                    </CardContent>
                  </Card>
                </div>
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='secondary'
                    onClick={() =>
                      setMessageDraft(
                        selectedLiteral.translation || selectedLiteral.defaultMessage,
                      )
                    }
                    disabled={!hasDraftChanges}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={() => void onSave()}
                    loading={upsertMutation.isPending}
                    disabled={
                      !hasDraftChanges || !hasPermissions(['manager.literals.updateAny'])
                    }
                  >
                    <Save />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
