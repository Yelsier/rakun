import type { RakunRuntime } from './types'

export const detectRuntime = (): RakunRuntime =>
  typeof process !== 'undefined' && process.versions?.bun ? 'bun' : 'node'

export const isBun = (): boolean => detectRuntime() === 'bun'
