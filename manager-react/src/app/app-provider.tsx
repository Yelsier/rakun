import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import type { LanguageSchema, ManagerUserSchema } from '@rakun-kit/core/client'

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

export const createManagerQueryClient = () =>
  new QueryClient({
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
