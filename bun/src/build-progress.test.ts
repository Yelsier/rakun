import { expect, test } from 'bun:test'

import { createRakunBuildProgress } from './build-progress'

test('prints stable build phases without terminal control codes for non-TTY output', () => {
  const chunks: string[] = []
  const progress = createRakunBuildProgress({
    isTTY: false,
    write(value) {
      chunks.push(value)
    },
  })

  progress.update('Loading configuration')
  progress.update('Loading configuration')
  progress.update('Building bundles')
  progress.complete()
  progress.fail()

  const output = chunks.join('')
  expect(output).toContain('  • Loading configuration\n')
  expect(output).toContain('  • Building bundles\n')
  expect(output).toContain('  ✓ Build completed ')
  expect(output).not.toContain('\u001B[')
  expect(output).not.toContain('Build failed')
  expect(output.match(/Loading configuration/g)).toHaveLength(1)
})

test('marks the active phase as failed in an interactive terminal', () => {
  const chunks: string[] = []
  const progress = createRakunBuildProgress({
    isTTY: true,
    write(value) {
      chunks.push(value)
    },
  })

  progress.update('Building bundles')
  progress.fail()

  const output = chunks.join('').replace(/\u001B\[[0-9;]*m/g, '')
  expect(output).toContain('✗ Building bundles')
  expect(output).not.toContain('✓ Building bundles')
  expect(output).toContain('✗ Build failed')
})
