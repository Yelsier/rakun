import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative } from 'node:path'
import postcss from 'postcss'

import type { ResolvedRakunBunConfig } from './types'

const isApplicationFile = (path: string, rootDir: string): boolean => {
  const pathFromRoot = relative(rootDir, path)
  return pathFromRoot !== '' && !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot)
}

export const createRakunCssProcessor = (
  config: ResolvedRakunBunConfig
): Bun.BunPlugin | undefined => {
  const plugins = config.css?.plugins
  if (!plugins?.length) return undefined

  return {
    name: 'rakun-css-processor',
    setup(builder) {
      builder.onLoad({ filter: /\.css$/ }, async ({ path }) => {
        if (!isApplicationFile(path, config.rootDir)) return undefined

        const result = await postcss(plugins).process(await readFile(path, 'utf8'), {
          from: path,
          map: false,
        })
        return {
          contents: result.css,
          loader: 'css',
          resolveDir: dirname(path),
        }
      })
    },
  }
}
