import { describe, expect, it } from 'bun:test'

import { getRakunManagerEditHref, resolveRakunDevToolbarOptions } from '../src/web-renderer'

describe('Rakun development toolbar', () => {
  it('resolves explicit toolbar settings', () => {
    const environment = process.env as Record<string, string | undefined>
    const previousNodeEnv = environment.NODE_ENV
    const previousNextPhase = environment.NEXT_PHASE

    try {
      environment.NODE_ENV = 'development'
      environment.NEXT_PHASE = 'phase-development-server'
      expect(resolveRakunDevToolbarOptions(false)).toBeNull()
      expect(resolveRakunDevToolbarOptions(true)).toEqual({})
      expect(
        resolveRakunDevToolbarOptions({
          managerBasePath: '/manager',
          initialOpen: true,
        })
      ).toEqual({ managerBasePath: '/manager', initialOpen: true })
    } finally {
      environment.NODE_ENV = previousNodeEnv
      environment.NEXT_PHASE = previousNextPhase
    }
  })

  it('enables automatically only during the development server', () => {
    const environment = process.env as Record<string, string | undefined>
    const previousNodeEnv = environment.NODE_ENV
    const previousNextPhase = environment.NEXT_PHASE

    try {
      environment.NODE_ENV = 'development'
      environment.NEXT_PHASE = 'phase-development-server'
      expect(resolveRakunDevToolbarOptions(undefined)).toEqual({})

      environment.NEXT_PHASE = 'phase-production-build'
      expect(resolveRakunDevToolbarOptions(undefined)).toBeNull()

      environment.NODE_ENV = 'production'
      environment.NEXT_PHASE = undefined
      expect(resolveRakunDevToolbarOptions(true)).toBeNull()
      expect(resolveRakunDevToolbarOptions({ initialOpen: true })).toBeNull()
    } finally {
      environment.NODE_ENV = previousNodeEnv
      environment.NEXT_PHASE = previousNextPhase
    }
  })

  it('builds an encoded manager edit link', () => {
    expect(
      getRakunManagerEditHref({
        managerBasePath: '/backend/',
        documentType: 'Landing Page',
        documentId: 'page/1',
      })
    ).toBe('/backend/Landing%20Page/page%2F1')
    expect(getRakunManagerEditHref({ documentType: 'Page' })).toBeUndefined()
  })
})
