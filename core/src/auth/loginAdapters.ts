export type LoginAdapterIcon = 'github' | 'google' | 'microsoft' | 'generic'

export type LoginAdapterIdentity = {
  id: string
  email: string
  emailVerified: boolean
  name?: string
}

export type LoginAdapterAuthorizationInput = {
  state: string
  codeChallenge: string
}

export type LoginAdapterCallbackInput = {
  code: string
  codeVerifier: string
}

export type LoginAdapter = {
  id: string
  label: string
  icon?: LoginAdapterIcon
  createAuthorizationUrl: (input: LoginAdapterAuthorizationInput) => Promise<string> | string
  authenticate: (input: LoginAdapterCallbackInput) => Promise<LoginAdapterIdentity>
}

export type LoginConfig = {
  /** Enable the built-in email/password form. Defaults to true. */
  password?: boolean
  adapters?: readonly LoginAdapter[]
}

export const defineLoginAdapter = <TAdapter extends LoginAdapter>(adapter: TAdapter): TAdapter =>
  adapter

type OAuthClientConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  label?: string
}

const fetchJson = async <T>(url: string | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)

  if (!response.ok) {
    throw new Error(`OAuth provider request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

const bearerHeaders = (accessToken: string): Record<string, string> => ({
  Accept: 'application/json',
  Authorization: `Bearer ${accessToken}`,
})

const requireAccessToken = (value: unknown): string => {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as { access_token?: unknown }).access_token !== 'string'
  ) {
    throw new Error('OAuth provider did not return an access token')
  }

  return (value as { access_token: string }).access_token
}

export type GitHubLoginAdapterConfig = OAuthClientConfig & {
  allowSignup?: boolean
}

export const createGitHubLoginAdapter = (config: GitHubLoginAdapterConfig): LoginAdapter =>
  defineLoginAdapter({
    id: 'github',
    label: config.label ?? 'GitHub',
    icon: 'github',
    createAuthorizationUrl: ({ state, codeChallenge }) => {
      const url = new URL('https://github.com/login/oauth/authorize')
      url.searchParams.set('client_id', config.clientId)
      url.searchParams.set('redirect_uri', config.redirectUri)
      url.searchParams.set('scope', 'read:user user:email')
      url.searchParams.set('state', state)
      url.searchParams.set('code_challenge', codeChallenge)
      url.searchParams.set('code_challenge_method', 'S256')
      url.searchParams.set('allow_signup', String(config.allowSignup ?? true))
      return url.toString()
    },
    authenticate: async ({ code, codeVerifier }) => {
      const token = await fetchJson<unknown>('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
          code_verifier: codeVerifier,
        }),
      })
      const accessToken = requireAccessToken(token)
      const headers = {
        ...bearerHeaders(accessToken),
        'X-GitHub-Api-Version': '2022-11-28',
      }
      const [profile, emails] = await Promise.all([
        fetchJson<{ id?: number | string; name?: string | null }>('https://api.github.com/user', {
          headers,
        }),
        fetchJson<
          Array<{
            email?: string
            primary?: boolean
            verified?: boolean
          }>
        >('https://api.github.com/user/emails', { headers }),
      ])
      const email =
        emails.find((item) => item.primary && item.verified)?.email ??
        emails.find((item) => item.verified)?.email

      if (profile.id === undefined || !email) {
        throw new Error('GitHub did not return a verified email identity')
      }

      return {
        id: String(profile.id),
        email,
        emailVerified: true,
        name: profile.name ?? undefined,
      }
    },
  })

export type GoogleLoginAdapterConfig = OAuthClientConfig & {
  hostedDomain?: string
  prompt?: 'none' | 'consent' | 'select_account'
}

export const createGoogleLoginAdapter = (config: GoogleLoginAdapterConfig): LoginAdapter =>
  defineLoginAdapter({
    id: 'google',
    label: config.label ?? 'Google',
    icon: 'google',
    createAuthorizationUrl: ({ state, codeChallenge }) => {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      url.searchParams.set('client_id', config.clientId)
      url.searchParams.set('redirect_uri', config.redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'openid profile email')
      url.searchParams.set('state', state)
      url.searchParams.set('code_challenge', codeChallenge)
      url.searchParams.set('code_challenge_method', 'S256')
      if (config.hostedDomain) url.searchParams.set('hd', config.hostedDomain)
      if (config.prompt) url.searchParams.set('prompt', config.prompt)
      return url.toString()
    },
    authenticate: async ({ code, codeVerifier }) => {
      const token = await fetchJson<unknown>('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
        }),
      })
      const accessToken = requireAccessToken(token)
      const profile = await fetchJson<{
        sub?: string
        email?: string
        email_verified?: boolean
        name?: string
        hd?: string
      }>('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: bearerHeaders(accessToken),
      })

      if (
        !profile.sub ||
        !profile.email ||
        profile.email_verified !== true ||
        (config.hostedDomain && profile.hd !== config.hostedDomain)
      ) {
        throw new Error('Google did not return a verified email identity')
      }

      return {
        id: profile.sub,
        email: profile.email,
        emailVerified: true,
        name: profile.name,
      }
    },
  })

export type MicrosoftLoginAdapterConfig = OAuthClientConfig & {
  tenant?: string
}

export const createMicrosoftLoginAdapter = (config: MicrosoftLoginAdapterConfig): LoginAdapter => {
  const tenant = config.tenant ?? 'common'
  const scope = 'openid profile email User.Read'

  return defineLoginAdapter({
    id: 'microsoft',
    label: config.label ?? 'Microsoft',
    icon: 'microsoft',
    createAuthorizationUrl: ({ state, codeChallenge }) => {
      const url = new URL(
        `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`
      )
      url.searchParams.set('client_id', config.clientId)
      url.searchParams.set('redirect_uri', config.redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('response_mode', 'query')
      url.searchParams.set('scope', scope)
      url.searchParams.set('state', state)
      url.searchParams.set('code_challenge', codeChallenge)
      url.searchParams.set('code_challenge_method', 'S256')
      return url.toString()
    },
    authenticate: async ({ code, codeVerifier }) => {
      const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`
      const token = await fetchJson<unknown>(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
          scope,
        }),
      })
      const accessToken = requireAccessToken(token)
      const profile = await fetchJson<{
        id?: string
        displayName?: string
        mail?: string | null
        userPrincipalName?: string
      }>('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
        headers: bearerHeaders(accessToken),
      })
      const email = profile.mail || profile.userPrincipalName

      if (!profile.id || !email) {
        throw new Error('Microsoft did not return an email identity')
      }

      return {
        id: profile.id,
        email,
        emailVerified: true,
        name: profile.displayName,
      }
    },
  })
}
