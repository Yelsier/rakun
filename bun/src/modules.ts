import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'

import type { RakunModuleDefinition } from './types'

const MODULE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])

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
  const modules = await Promise.all(
    files.map(async (file) => ({
      client: hasUseClientDirective(await readFile(file, 'utf8')),
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

export { hasUseClientDirective }
