import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, relative, resolve, sep } from 'node:path'

import type { RakunModuleDefinition } from './types'

const MODULE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])
const IMPORT_SPECIFIER = /\b(import|export)\s+(type\s+)?(?:[^'"`]*?\s+from\s+)?['"]([^'"]+)['"]/g
const RAKUN_REACT_IMPORT = /\bimport\s+(?!type\b)([^'"`]+?)\s+from\s+['"]@rakun-kit\/react['"]/g
const RAKUN_REACT_CLIENT_EXPORTS = new Set([
  'ErrorBoundary',
  'Image',
  'JsonViewer',
  'LazyViewport',
  'ModuleRenderer',
  'RakunImage',
  'useClientT',
])

const hasUseClientDirective = (source: string): boolean => {
  let remaining = source.replace(/^\uFEFF/, '').replace(/^#![^\r\n]*(?:\r?\n|$)/, '')
  const prefix = /^(?:\s|\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)+/
  const directive = /^(?:'([^']*)'|"([^"]*)")(?:\s*;)?/

  while (remaining) {
    remaining = remaining.replace(prefix, '')
    const match = remaining.match(directive)
    if (!match) return false
    if ((match[1] ?? match[2]) === 'use client') return true
    remaining = remaining.slice(match[0].length)
  }

  return false
}

const getImportSpecifiers = (source: string): string[] =>
  Array.from(source.matchAll(IMPORT_SPECIFIER), (match) =>
    match[2] ? undefined : match[3]
  ).filter((specifier): specifier is string => !!specifier)

const importsRakunReactClientExport = (source: string): boolean =>
  Array.from(source.matchAll(RAKUN_REACT_IMPORT)).some((match) =>
    Array.from(RAKUN_REACT_CLIENT_EXPORTS).some((name) =>
      new RegExp(`\\b${name}\\b`).test(match[1] ?? '')
    )
  )

const hasClientDependency = async (
  file: string,
  cache: Map<string, boolean>,
  visiting: Set<string>
): Promise<boolean> => {
  const resolvedFile = resolve(file)
  const cached = cache.get(resolvedFile)
  if (cached !== undefined) return cached
  if (visiting.has(resolvedFile) || !MODULE_EXTENSIONS.has(extname(resolvedFile))) return false

  visiting.add(resolvedFile)
  try {
    const source = await readFile(resolvedFile, 'utf8')
    if (hasUseClientDirective(source)) {
      cache.set(resolvedFile, true)
      return true
    }

    for (const specifier of getImportSpecifiers(source)) {
      if (specifier === '@rakun-kit/react') {
        if (importsRakunReactClientExport(source)) {
          cache.set(resolvedFile, true)
          return true
        }
        continue
      }
      let dependency: string
      try {
        dependency = Bun.resolveSync(specifier, dirname(resolvedFile))
      } catch {
        continue
      }
      if (await hasClientDependency(dependency, cache, visiting)) {
        cache.set(resolvedFile, true)
        return true
      }
    }

    cache.set(resolvedFile, false)
    return false
  } catch {
    cache.set(resolvedFile, false)
    return false
  } finally {
    visiting.delete(resolvedFile)
  }
}

const getModuleName = (modulesDir: string, file: string): string => {
  const relativePath = relative(modulesDir, file)
  const parts = relativePath.split(sep)
  const extension = extname(parts.at(-1) ?? '')
  const baseName = (parts.at(-1) ?? '').slice(0, -extension.length)

  if (baseName === 'index' && parts.length > 1) {
    return parts.at(-2) ?? ''
  }

  return baseName
}

const collectModuleFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    }
  )
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return await collectModuleFiles(path)
      if (!entry.isFile() || !MODULE_EXTENSIONS.has(extname(entry.name))) return []
      if (/\.d\.ts$/.test(entry.name)) return []
      return [path]
    })
  )

  return files.flat()
}

export const discoverRakunModules = async (
  modulesDir: string
): Promise<RakunModuleDefinition[]> => {
  const resolvedModulesDir = resolve(modulesDir)
  const files = (await collectModuleFiles(resolvedModulesDir))
    .filter((file) => {
      const parts = relative(resolvedModulesDir, file).split(sep)
      return parts.length === 1 || (parts.length === 2 && /^index\.[^.]+$/.test(parts.at(-1) ?? ''))
    })
    .sort()
  const clientDependencyCache = new Map<string, boolean>()
  const modules = await Promise.all(
    files.map(async (file) => ({
      client: await hasClientDependency(file, clientDependencyCache, new Set()),
      file,
      name: getModuleName(modulesDir, file),
    }))
  )
  const names = new Map<string, string>()

  for (const module of modules) {
    const existing = names.get(module.name)
    if (existing) {
      throw new Error(
        `Duplicate Rakun module "${module.name}" discovered at "${existing}" and "${module.file}".`
      )
    }
    names.set(module.name, module.file)
  }

  return modules
}

export const discoverRakunDocument = async (documentFile: string): Promise<string | undefined> => {
  const source = await readFile(documentFile, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })

  if (source === undefined) return undefined
  if (hasUseClientDirective(source)) {
    throw new Error('Rakun src/document.tsx must be a server component.')
  }

  return resolve(documentFile)
}

export { hasUseClientDirective }
