#!/usr/bin/env bun

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { buildRakunServerBundle } from './build'
import { createRakunBuildProgress } from './build-progress'
import { loadRakunConfig } from './config'
import { formatRakunBuildReport } from './report'
import { createRakunBun, startRakunBun } from './server'

const args = process.argv.slice(2)
const command = args[0]?.startsWith('-') ? 'dev' : (args[0] ?? 'dev')
const configFlag = args.indexOf('--config')
const configPath =
  configFlag >= 0 && args[configFlag + 1] ? args[configFlag + 1] : 'rakun.config.ts'
const absoluteConfigPath = resolve(process.cwd(), configPath)
const buildStartedAt = command === 'build' ? performance.now() : undefined
const buildProgress = command === 'build' ? createRakunBuildProgress() : undefined

const run = async (): Promise<void> => {
  if (command === 'dev') process.env.NODE_ENV = 'development'
  if (command === 'build' || command === 'start') process.env.NODE_ENV = 'production'

  if (command === 'start' && configFlag < 0) {
    await import(pathToFileURL(resolve(process.cwd(), 'dist', 'server.js')).href)
    return
  }

  buildProgress?.update('Loading configuration')
  const config = await loadRakunConfig(absoluteConfigPath)

  if (command === 'dev') {
    config.server.development = true
    await startRakunBun(config, { cwd: config.rootDir })
    return
  }

  if (command === 'build') {
    const startedAt = buildStartedAt ?? performance.now()
    config.server.development = false
    const application = createRakunBun(config, {
      cwd: config.rootDir,
      onBuildProgress: (message) => buildProgress?.update(message),
    })
    const result = await application.build({ clean: true })
    buildProgress?.update('Bundling the production server')
    const generatedRegistry = resolve(config.rootDir, '.rakun', 'generated', 'modules.generated.ts')
    const server = await buildRakunServerBundle({
      config,
      configPath: absoluteConfigPath,
      generatedRegistry,
    })
    buildProgress?.update('Analyzing build output')
    const report = await formatRakunBuildReport({
      config,
      durationMs: performance.now() - startedAt,
      result,
      serverPath: server,
    })
    buildProgress?.complete()
    console.log(report)
    return
  }

  if (command === 'start') {
    await import(pathToFileURL(resolve(config.outDir, 'server.js')).href)
    return
  }

  throw new Error(`Unknown rakun-bun command "${command}".`)
}

void run()
  .then(() => {
    if (command === 'build') process.exit(0)
  })
  .catch((error) => {
    buildProgress?.fail()
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
