import { describe, expect, it } from 'bun:test'

import {
  resolveLucideIcon,
  resolveLucideIconName,
} from './resolve-lucide-icon'

describe('resolveLucideIconName', () => {
  it('accepts canonical Lucide names', () => {
    expect(resolveLucideIconName('panel-bottom')).toBe('panel-bottom')
  })

  it('normalizes the legacy PascalCase and Icon suffix formats', () => {
    expect(resolveLucideIconName('PanelTop')).toBe('panel-top')
    expect(resolveLucideIconName('FileTextIcon')).toBe('file-text')
  })

  it('rejects names that are not in the Lucide catalog', () => {
    expect(resolveLucideIconName('not-a-real-rakun-icon')).toBeUndefined()
  })
})

describe('resolveLucideIcon', () => {
  it('reuses the wrapper component for equivalent names', () => {
    expect(resolveLucideIcon('FileText')).toBe(resolveLucideIcon('file-text'))
  })
})
