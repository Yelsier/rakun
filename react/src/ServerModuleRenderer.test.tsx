import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PageModule } from '@rakun-kit/core/contracts'
import { createModuleRegistry } from './registry'
import { ServerModuleRenderer } from './ServerModuleRenderer'

const modules = [
  {
    _id: 'first',
    _type: 'TextSection',
    text: 'Hello from Rakun',
  },
] satisfies PageModule[]

describe('ServerModuleRenderer', () => {
  it('renders modules with a server-side loader', async () => {
    const output = await ServerModuleRenderer({
      modules,
      loadModule: async (name) => ({
        default: ({ text }: { text: string }) => <p data-module={name}>{text}</p>,
      }),
    })

    expect(renderToStaticMarkup(output)).toBe(
      '<p data-module="TextSection">Hello from Rakun</p>',
    )
  })

  it('renders modules registered as components', async () => {
    const registry = createModuleRegistry({
      TextSection: {
        component: ({ text }: { text: string }) => <p>{text}</p>,
      },
    })

    const output = await ServerModuleRenderer({ modules, registry })

    expect(renderToStaticMarkup(output)).toBe('<p>Hello from Rakun</p>')
  })

  it('uses the missing renderer when a module cannot be resolved', async () => {
    const output = await ServerModuleRenderer({
      modules,
      missing: ({ module }) => <p>Missing {module._type}</p>,
    })

    expect(renderToStaticMarkup(output)).toBe('<p>Missing TextSection</p>')
  })
})
