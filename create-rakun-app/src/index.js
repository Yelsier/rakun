#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const VERSION = '0.1.1'
const DEFAULT_PROJECT_DIRECTORY = 'my-rakun-app'
const templates = [
  {
    id: 'nextjs',
    aliases: ['next'],
    label: 'Next.js',
  },
]

export const PACKAGE_VERSION_POLICIES = [
  { name: '@rakun-kit/core', placeholder: '__VERSION_RAKUN_CORE__' },
  { name: '@rakun-kit/manager-react', placeholder: '__VERSION_RAKUN_MANAGER_REACT__' },
  { name: '@rakun-kit/next', placeholder: '__VERSION_RAKUN_NEXT__' },
  { name: 'next', placeholder: '__VERSION_NEXT__' },
  { name: 'react', placeholder: '__VERSION_REACT__' },
  { name: 'react-dom', placeholder: '__VERSION_REACT_DOM__' },
  { name: '@types/node', placeholder: '__VERSION_TYPES_NODE__' },
  { name: '@types/react', placeholder: '__VERSION_TYPES_REACT__' },
  { name: '@types/react-dom', placeholder: '__VERSION_TYPES_REACT_DOM__' },
  { name: 'bcrypt', placeholder: '__VERSION_BCRYPT__', line: '6' },
  { name: '@types/bcrypt', placeholder: '__VERSION_TYPES_BCRYPT__', line: '6' },
  { name: 'dotenv', placeholder: '__VERSION_DOTENV__', line: '17' },
  { name: 'mongodb', placeholder: '__VERSION_MONGODB__', line: '7' },
  { name: 'sharp', placeholder: '__VERSION_SHARP__', line: '0.34' },
  { name: 'tsx', placeholder: '__VERSION_TSX__', line: '4' },
  { name: 'typescript', placeholder: '__VERSION_TYPESCRIPT__', line: '6' },
]

const NPM_REGISTRY_URL = 'https://registry.npmjs.org'

export class CreateRakunAppError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CreateRakunAppError'
  }
}

const parseStableVersion = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  return match ? match.slice(1).map(Number) : null
}

const compareVersions = (left, right) => {
  const leftParts = parseStableVersion(left)
  const rightParts = parseStableVersion(right)
  if (!leftParts || !rightParts) return 0

  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index] - rightParts[index]
    if (difference !== 0) return difference
  }
  return 0
}

const fetchRegistryJson = async ({ packageName, suffix = '', fetchImpl, registryUrl }) => {
  const url = `${registryUrl}/${encodeURIComponent(packageName)}${suffix}`
  let response

  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: suffix ? 'application/json' : 'application/vnd.npm.install-v1+json',
      },
    })
  } catch (error) {
    throw new CreateRakunAppError(
      `Could not reach npm to resolve ${packageName}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  if (!response.ok) {
    throw new CreateRakunAppError(
      `Could not resolve ${packageName} from npm (${response.status} ${response.statusText}).`
    )
  }

  return response.json()
}

const resolvePackageVersion = async ({ policy, fetchImpl, registryUrl }) => {
  if (!policy.line) {
    const metadata = await fetchRegistryJson({
      packageName: policy.name,
      suffix: '/latest',
      fetchImpl,
      registryUrl,
    })
    if (typeof metadata.version !== 'string' || !parseStableVersion(metadata.version)) {
      throw new CreateRakunAppError(`npm returned an invalid version for ${policy.name}.`)
    }
    return metadata.version
  }

  const metadata = await fetchRegistryJson({
    packageName: policy.name,
    fetchImpl,
    registryUrl,
  })
  const prefix = `${policy.line}.`
  const versions = Object.keys(metadata.versions ?? {})
    .filter((version) => version.startsWith(prefix) && parseStableVersion(version))
    .sort(compareVersions)
  const version = versions.at(-1)

  if (!version) {
    throw new CreateRakunAppError(
      `npm does not have a stable ${policy.line}.x release for ${policy.name}.`
    )
  }
  return version
}

export const resolvePackageVersions = async ({
  fetchImpl = globalThis.fetch,
  registryUrl = NPM_REGISTRY_URL,
} = {}) => {
  const entries = await Promise.all(
    PACKAGE_VERSION_POLICIES.map(async (policy) => [
      policy.name,
      await resolvePackageVersion({ policy, fetchImpl, registryUrl }),
    ])
  )
  return Object.fromEntries(entries)
}

const getVersionReplacements = (versions) =>
  Object.fromEntries(
    PACKAGE_VERSION_POLICIES.map((policy) => {
      const version = versions[policy.name]
      if (!version) {
        throw new CreateRakunAppError(`No resolved version was provided for ${policy.name}.`)
      }
      return [policy.placeholder, version]
    })
  )

const help = `create-rakun-app

Usage:
  create-rakun-app [project-directory] [options]

Options:
  -t, --template <name>       Starter template (available: nextjs)
      --package-manager <pm>  npm, pnpm, yarn, or bun
      --no-install            Create files without installing dependencies
  -h, --help                  Show this help
  -v, --version               Show the installed version

Examples:
  create-rakun-app my-site --template nextjs
  bunx create-rakun-app my-site --template nextjs
`

const takeOptionValue = (args, index, option) => {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new CreateRakunAppError(`${option} requires a value.`)
  }
  return value
}

export const parseArguments = (args) => {
  const options = {
    install: true,
  }
  const positional = []

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    if (argument === '--version' || argument === '-v') {
      options.version = true
      continue
    }
    if (argument === '--no-install') {
      options.install = false
      continue
    }
    if (argument === '--template' || argument === '-t') {
      options.template = takeOptionValue(args, index, argument)
      index += 1
      continue
    }
    if (argument.startsWith('--template=')) {
      options.template = argument.slice('--template='.length)
      continue
    }
    if (argument === '--package-manager') {
      options.packageManager = takeOptionValue(args, index, argument)
      index += 1
      continue
    }
    if (argument.startsWith('--package-manager=')) {
      options.packageManager = argument.slice('--package-manager='.length)
      continue
    }
    if (argument.startsWith('-')) {
      throw new CreateRakunAppError(`Unknown option "${argument}".`)
    }

    positional.push(argument)
  }

  if (positional.length > 1) {
    throw new CreateRakunAppError('Only one project directory can be provided.')
  }

  options.projectDirectory = positional[0]
  return options
}

const resolveTemplate = (requestedTemplate) => {
  const normalized = requestedTemplate.trim().toLowerCase()
  const template = templates.find(
    (item) => item.id === normalized || item.aliases.includes(normalized)
  )

  if (!template) {
    throw new CreateRakunAppError(
      `Unknown template "${requestedTemplate}". Available templates: ${templates
        .map((item) => item.id)
        .join(', ')}.`
    )
  }

  return template
}

const promptForTemplate = async (readline) => {
  process.stdout.write('Which framework do you want to use?\n')
  templates.forEach((template, index) => {
    const recommendation = index === 0 ? ' (recommended)' : ''
    process.stdout.write(`  ${index + 1}. ${template.label}${recommendation}\n`)
  })

  const answer = (await readline.question(`Select a framework (1): `)).trim()
  if (!answer) return templates[0]

  const numericIndex = Number(answer) - 1
  if (Number.isInteger(numericIndex) && templates[numericIndex]) {
    return templates[numericIndex]
  }

  return resolveTemplate(answer)
}

const promptForProjectDirectory = async (readline) => {
  const answer = (
    await readline.question(`Project directory (${DEFAULT_PROJECT_DIRECTORY}): `)
  ).trim()
  return answer || DEFAULT_PROJECT_DIRECTORY
}

const exists = async (filename) => {
  try {
    await access(filename)
    return true
  } catch {
    return false
  }
}

const assertEmptyTarget = async (targetDirectory) => {
  if (!(await exists(targetDirectory))) return
  const targetStat = await stat(targetDirectory)
  if (!targetStat.isDirectory()) {
    throw new CreateRakunAppError(`${targetDirectory} is not a directory.`)
  }

  const entries = await readdir(targetDirectory)
  if (entries.length > 0) {
    throw new CreateRakunAppError(`${targetDirectory} is not empty. Choose an empty directory.`)
  }
}

const toPackageName = (targetDirectory) => {
  const name = path.basename(targetDirectory).toLowerCase()
  const normalized = name.replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|[._-]+$/g, '')
  return normalized || 'rakun-app'
}

const templateFileName = (name) => {
  if (name === '_gitignore') return '.gitignore'
  return name
}

const textExtensions = new Set(['.css', '.example', '.json', '.md', '.mjs', '.ts', '.tsx'])

const copyTemplate = async ({ source, destination, replacements }) => {
  await mkdir(destination, { recursive: true })

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, templateFileName(entry.name))

    if (entry.isDirectory()) {
      await copyTemplate({
        source: sourcePath,
        destination: destinationPath,
        replacements,
      })
      continue
    }

    if (!textExtensions.has(path.extname(entry.name))) {
      await copyFile(sourcePath, destinationPath)
      continue
    }

    let content = await readFile(sourcePath, 'utf8')
    for (const [search, replacement] of Object.entries(replacements)) {
      content = content.replaceAll(search, replacement)
    }
    await writeFile(destinationPath, content, 'utf8')
  }
}

const detectPackageManager = () => {
  const userAgent = process.env.npm_config_user_agent ?? ''
  if (userAgent.startsWith('bun/')) return 'bun'
  if (userAgent.startsWith('pnpm/')) return 'pnpm'
  if (userAgent.startsWith('yarn/')) return 'yarn'
  return 'npm'
}

const validatePackageManager = (packageManager) => {
  const supported = ['npm', 'pnpm', 'yarn', 'bun']
  if (!supported.includes(packageManager)) {
    throw new CreateRakunAppError(
      `Unknown package manager "${packageManager}". Use ${supported.join(', ')}.`
    )
  }
  return packageManager
}

const installDependencies = (targetDirectory, packageManager) => {
  process.stdout.write(`\nInstalling dependencies with ${packageManager}...\n`)
  const result = spawnSync(packageManager, ['install'], {
    cwd: targetDirectory,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new CreateRakunAppError(
      `${packageManager} install exited with code ${result.status ?? 'unknown'}.`
    )
  }
}

const getTemplateDirectory = async (templateId) => {
  const candidates = [
    new URL(`./templates/${templateId}/`, import.meta.url),
    new URL(`../templates/${templateId}/`, import.meta.url),
  ]

  for (const candidate of candidates) {
    const directory = fileURLToPath(candidate)
    if (await exists(directory)) return directory
  }

  throw new CreateRakunAppError(`Template files for "${templateId}" are missing.`)
}

export const createApp = async ({
  projectDirectory,
  template: requestedTemplate,
  packageManager: requestedPackageManager,
  install = true,
  cwd = process.cwd(),
  resolveVersions = resolvePackageVersions,
}) => {
  const template = resolveTemplate(requestedTemplate)
  const targetDirectory = path.resolve(cwd, projectDirectory)
  const packageManager = validatePackageManager(requestedPackageManager ?? detectPackageManager())

  await assertEmptyTarget(targetDirectory)
  const versions = await resolveVersions()
  await mkdir(targetDirectory, { recursive: true })

  const templateDirectory = await getTemplateDirectory(template.id)
  await copyTemplate({
    source: templateDirectory,
    destination: targetDirectory,
    replacements: {
      __PROJECT_NAME__: toPackageName(targetDirectory),
      ...getVersionReplacements(versions),
    },
  })
  await copyFile(
    path.join(targetDirectory, '.env.example'),
    path.join(targetDirectory, '.env.local')
  )

  if (install) installDependencies(targetDirectory, packageManager)

  return {
    packageManager,
    relativeDirectory: path.relative(cwd, targetDirectory) || '.',
    targetDirectory,
    template: template.id,
    versions,
  }
}

const run = async () => {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(help)
    return
  }
  if (options.version) {
    process.stdout.write(`${VERSION}\n`)
    return
  }

  if ((!options.template || !options.projectDirectory) && !process.stdin.isTTY) {
    throw new CreateRakunAppError(
      'Interactive prompts require a terminal. Pass a project directory and --template nextjs.'
    )
  }

  const readline = createInterface({ input: process.stdin, output: process.stdout })
  let template
  let projectDirectory

  try {
    template = options.template
      ? resolveTemplate(options.template)
      : await promptForTemplate(readline)
    projectDirectory = options.projectDirectory ?? (await promptForProjectDirectory(readline))
  } finally {
    readline.close()
  }

  const result = await createApp({
    projectDirectory,
    template: template.id,
    packageManager: options.packageManager,
    install: options.install,
  })

  process.stdout.write(`\nCreated ${result.relativeDirectory} with the Next.js template.\n\n`)
  process.stdout.write(
    `Pinned Next.js ${result.versions.next} and @rakun-kit/core ${
      result.versions['@rakun-kit/core']
    }.\n\n`
  )
  process.stdout.write('Next steps:\n')
  if (result.relativeDirectory !== '.') {
    process.stdout.write(`  cd ${result.relativeDirectory}\n`)
  }
  if (!options.install) {
    process.stdout.write(`  ${result.packageManager} install\n`)
  }
  process.stdout.write(`  ${result.packageManager} run seed\n`)
  process.stdout.write(`  ${result.packageManager} run dev\n`)
}

const isDirectExecution =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url

if (isDirectExecution) {
  try {
    await run()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Error: ${message}\n`)
    process.exitCode = 1
  }
}
