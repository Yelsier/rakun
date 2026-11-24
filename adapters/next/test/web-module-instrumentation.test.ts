import { describe, expect, it } from 'bun:test'

import {
  getRakunModuleMetaFromFiber,
  instrumentRakunModuleRoots,
  type RakunModuleInstrumentationMeta,
} from '../src/web-module-instrumentation'

const meta: RakunModuleInstrumentationMeta = {
  entryType: 'content',
  index: 2,
  layoutIndex: 1,
  moduleId: 'module-2',
  moduleIndex: 0,
  moduleType: 'Hero',
}

class FakeElement {
  parentElement: FakeElement | null = null
  attributes = new Map<string, string>()

  constructor(fiber?: object) {
    if (fiber) {
      ;(this as unknown as Record<string, unknown>)['__reactFiber$test'] = fiber
    }
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  hasAttribute(name: string) {
    return this.attributes.has(name)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }
}

const createRoot = (elements: FakeElement[]) =>
  ({
    querySelectorAll: (selector: string) =>
      selector === '*'
        ? elements
        : elements.filter((element) => element.hasAttribute('data-rakun-module')),
  }) as unknown as ParentNode

describe('Rakun module instrumentation', () => {
  it('finds the closest wrapper-free module boundary in a fiber chain', () => {
    const boundary = {
      memoizedProps: {
        __rakunModuleBoundary: true,
        meta,
      },
      return: null,
    }
    const host = {
      memoizedProps: { className: 'hero' },
      return: { return: boundary },
    }

    expect(getRakunModuleMetaFromFiber(host)).toBe(meta)
  })

  it('ignores unrelated component props', () => {
    expect(
      getRakunModuleMetaFromFiber({
        memoizedProps: { meta },
        return: null,
      })
    ).toBeNull()
  })

  it('attaches attributes only to the module DOM roots', () => {
    const boundary = {
      memoizedProps: { __rakunModuleBoundary: true, meta },
      return: null,
    }
    const externalParent = new FakeElement()
    const moduleRoot = new FakeElement({ return: boundary })
    const moduleChild = new FakeElement({ return: { return: boundary } })
    const unrelated = new FakeElement({ return: null })
    moduleRoot.parentElement = externalParent
    moduleChild.parentElement = moduleRoot
    unrelated.parentElement = externalParent
    unrelated.setAttribute('data-rakun-module', '')

    instrumentRakunModuleRoots(createRoot([moduleRoot, moduleChild, unrelated]))

    expect(moduleRoot.getAttribute('data-rakun-module-id')).toBe('module-2')
    expect(moduleRoot.getAttribute('data-rakun-index')).toBe('2')
    expect(moduleChild.hasAttribute('data-rakun-module')).toBe(false)
    expect(unrelated.hasAttribute('data-rakun-module')).toBe(false)
  })
})
