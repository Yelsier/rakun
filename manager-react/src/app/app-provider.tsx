import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import type { LanguageSchema, ManagerUserSchema } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import { ManagerLinkProvider, type ManagerLinkComponent } from '@/link'
import { LanguageProvider } from '@/state/language'
import {
  ManagerMediaProvider,
  type ManagerMediaPickerRenderArgs,
} from '@/media'
import {
  ManagerNavigationProvider,
  type ManagerNavigation,
} from '@/state/navigation'
import { ManagerProvider, type ManagerProviderProps } from '@/client/react'
import { SessionProvider } from '@/state/session'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const formatIssuePath = (path: unknown) => {
  if (!Array.isArray(path) || path.length === 0) {
    return 'value'
  }

  return path.map(String).join('.')
}

const formatIssue = (issue: unknown) => {
  if (!isRecord(issue)) {
    return String(issue)
  }

  const message =
    typeof issue.message === 'string' ? issue.message : 'Invalid input'

  return `${formatIssuePath(issue.path)}: ${message}`
}

const getErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    return error.message
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message
  }

  if (
    isRecord(error) &&
    isRecord(error.cause) &&
    typeof error.cause.message === 'string'
  ) {
    return error.cause.message
  }

  return null
}

const getIssues = (error: unknown): unknown[] => {
  if (isRecord(error) && Array.isArray(error.issues)) {
    return error.issues
  }

  if (isRecord(error) && 'body' in error) {
    const body = error.body

    if (isRecord(body) && Array.isArray(body.issues)) {
      return body.issues
    }
  }

  const message = getErrorMessage(error)

  if (!message?.trim().startsWith('[')) {
    return []
  }

  try {
    const parsed = JSON.parse(message)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const formatQueryError = (error: unknown) => {
  const issues = getIssues(error)

  if (issues.length > 0) {
    return {
      description: issues.slice(0, 4).map(formatIssue).join('\n'),
    }
  }

  return {
    description: getErrorMessage(error) ?? 'Unknown error',
  }
}

const getQueryOperationName = (queryKey: readonly unknown[]) =>
  typeof queryKey[1] === 'string' ? queryKey[1] : 'manager query'

export const createManagerQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (
          (query.meta as { suppressErrorToast?: boolean } | undefined)
            ?.suppressErrorToast
        ) {
          return
        }

        const formatted = formatQueryError(error)

        toast.error(`${getQueryOperationName(query.queryKey)} failed`, {
          description: formatted.description,
        })
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })

export type ManagerAppProviderProps = {
  client: ManagerProviderProps['client']
  navigation: ManagerNavigation
  initialUser: ManagerUserSchema
  languages: LanguageSchema[]
  initialLanguage?: LanguageSchema
  queryClient?: QueryClient
  renderMediaPicker?: (args: ManagerMediaPickerRenderArgs) => ReactNode
  linkComponent?: ManagerLinkComponent
  children: ReactNode
}

export const ManagerAppProvider = ({
  client,
  navigation,
  initialUser,
  languages,
  initialLanguage,
  queryClient,
  renderMediaPicker,
  linkComponent,
  children,
}: ManagerAppProviderProps) => {
  const ownedQueryClient = useMemo(
    () => queryClient ?? createManagerQueryClient(),
    [queryClient],
  )
  const fallbackLanguage =
    initialLanguage ??
    languages.find((language) => language.default) ??
    languages[0]

  if (!fallbackLanguage) {
    throw new Error('ManagerAppProvider requires at least one language.')
  }

  const content = (
    <SessionProvider initialUser={initialUser}>
      <LanguageProvider
        languages={languages}
        initialLanguage={fallbackLanguage}
      >
        {children}
      </LanguageProvider>
    </SessionProvider>
  )

  return (
    <QueryClientProvider client={ownedQueryClient}>
      <ManagerProvider client={client}>
        <ManagerNavigationProvider navigation={navigation}>
          <ManagerLinkProvider component={linkComponent}>
            {renderMediaPicker ? (
              <ManagerMediaProvider renderPicker={renderMediaPicker}>
                {content}
              </ManagerMediaProvider>
            ) : (
              content
            )}
          </ManagerLinkProvider>
        </ManagerNavigationProvider>
      </ManagerProvider>
    </QueryClientProvider>
  )
}
