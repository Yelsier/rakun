import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { getRakunBootstrapOptions } from '@rakun-kit/core'

const BUILT_IN_DYNAMIC_LUCIDE_ICONS = ['BetweenHorizontalStart', 'Braces'] as const

const toImportSpecifier = (path: string): string => resolve(path).replace(/\\/g, '/')

const normalizeLucideIconName = (value: string): string =>
  value
    .trim()
    .replace(/[-_\s]?icon$/i, '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .join('-')
    .toLowerCase()

export const writeManagerIconRegistry = async (
  generatedDir: string,
  rootDir: string
): Promise<string> => {
  const bootstrap = getRakunBootstrapOptions()
  const contentTypes = [
    ...(bootstrap?.contentTypes ?? []),
    ...Object.values(bootstrap?.internalContentTypes ?? {}),
  ]
  const requestedNames = new Set(
    [
      ...BUILT_IN_DYNAMIC_LUCIDE_ICONS,
      ...contentTypes.flatMap((contentType) => [
        contentType.menu?.icon,
        contentType.modulePicker?.icon,
      ]),
    ]
      .filter((name): name is string => typeof name === 'string')
      .map(normalizeLucideIconName)
  )
  let lucideDynamicEntry: string
  try {
    lucideDynamicEntry = Bun.resolveSync('lucide-react/dynamic', rootDir)
  } catch {
    let managerEntry: string
    try {
      managerEntry = Bun.resolveSync('@rakun-kit/manager-react', rootDir)
    } catch {
      managerEntry = Bun.resolveSync('@rakun-kit/manager-react', import.meta.dir)
    }
    lucideDynamicEntry = Bun.resolveSync('lucide-react/dynamic', dirname(managerEntry))
  }
  const iconsDir = resolve(dirname(lucideDynamicEntry), 'dist', 'esm', 'icons')
  const iconNames = (
    await Promise.all(
      Array.from(requestedNames).map(async (name) => ({
        exists: await Bun.file(resolve(iconsDir, `${name}.js`)).exists(),
        name,
      }))
    )
  )
    .filter((icon) => icon.exists)
    .map((icon) => icon.name)
    .sort()
  const imports = iconNames.map(
    (name, index) =>
      `import Icon${index} from ${JSON.stringify(toImportSpecifier(resolve(iconsDir, `${name}.js`)))}`
  )
  const entries = iconNames.map((name, index) => `${JSON.stringify(name)}: Icon${index}`)
  const path = resolve(generatedDir, 'manager-icons.generated.ts')
  await writeFile(
    path,
    [
      `import { createElement, forwardRef } from 'react'`,
      ...imports,
      `const icons = { ${entries.join(', ')} }`,
      `export const iconNames = Object.keys(icons)`,
      `export const DynamicIcon = forwardRef(({ name, fallback: Fallback, ...props }, ref) => {`,
      `  const Icon = icons[name]`,
      `  return Icon ? createElement(Icon, { ...props, ref }) : Fallback ? createElement(Fallback) : null`,
      `})`,
      `export default DynamicIcon`,
    ].join('\n')
  )
  return path
}

export const createManagerResolver = (
  rootDir: string,
  managerIconRegistry: string
): Bun.BunPlugin => ({
  name: 'rakun-manager-resolver',
  setup(builder) {
    builder.onResolve({ filter: /^lucide-react\/dynamic$/ }, () => ({
      path: managerIconRegistry,
    }))
    builder.onResolve({ filter: /^@rakun-kit\/core(?:\/.*)?$/ }, ({ path }) => {
      try {
        return { path: Bun.resolveSync(path, rootDir) }
      } catch {
        return undefined
      }
    })
  },
})
