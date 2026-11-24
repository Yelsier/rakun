import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, posix } from 'node:path'

const registry = 'https://registry.npmjs.org'
const dependencyFields = ['dependencies', 'optionalDependencies', 'peerDependencies']

function run(command, args, { cwd, capture = false } = {}) {
  const result = Bun.spawnSync([command, ...args], {
    cwd,
    stdout: capture ? 'pipe' : 'inherit',
    stderr: 'inherit',
  })
  if (!result.success) {
    throw new Error(`${command} ${args.join(' ')} failed (exit ${result.exitCode})`)
  }
  return capture ? result.stdout.toString().trimEnd() : undefined
}

function readWorkspaces() {
  const { workspaces } = JSON.parse(readFileSync('package.json', 'utf8'))
  const packages = workspaces.flatMap((pattern) =>
    Array.from(new Bun.Glob(`${pattern}/package.json`).scanSync('.'), (file) => ({
      dir: posix.dirname(file.replaceAll('\\', '/')),
      manifest: JSON.parse(readFileSync(file, 'utf8')),
    }))
  )
  return new Map(
    packages.filter(({ manifest }) => !manifest.private).map((pkg) => [pkg.manifest.name, pkg])
  )
}

function changedPaths(before, branch) {
  if (!/^[0-9a-f]{40}$/.test(before ?? '')) {
    throw new Error('Expected the previous push commit in PUSH_BEFORE')
  }
  if (/^0+$/.test(before)) {
    if (branch === 'main') return null
    before = run('git', ['merge-base', 'origin/main', 'HEAD'], { capture: true })
  }

  const exists = Bun.spawnSync(['git', 'cat-file', '-e', `${before}^{commit}`]).success
  if (!exists) run('git', ['fetch', '--no-tags', 'origin', before])
  return run('git', ['diff', '--no-renames', '--name-only', '-z', before, 'HEAD'], {
    capture: true,
  }).split('\0')
}

function hasChanges({ dir, manifest }, paths) {
  const buildScripts = Object.values(manifest.scripts).join('\n')
  return paths.some(
    (file) =>
      file.startsWith(`${dir}/`) ||
      (file.startsWith('scripts/') && buildScripts.includes(`../${file}`)) ||
      (file === 'core/tsconfig.json' && dir === 'adapters/bun')
  )
}

function stableParts(version) {
  return /^\d+\.\d+\.\d+$/.test(version) ? version.split('.').map(Number) : null
}

function nextStableVersion(declared, publishedVersions) {
  const requested = stableParts(declared)
  if (!requested) throw new Error(`Expected a stable package version, got ${declared}`)
  const compare = (left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
  const highest = publishedVersions.map(stableParts).filter(Boolean).sort(compare).at(-1)
  if (!highest || compare(requested, highest) > 0) return declared
  return [highest[0], highest[1], highest[2] + 1].join('.')
}

async function registryPackage(name) {
  const response = await fetch(`${registry}/${encodeURIComponent(name)}`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(30_000),
  })
  if (response.status === 404) return {}
  if (!response.ok) throw new Error(`npm registry returned ${response.status} for ${name}`)
  return response.json()
}

function alreadyReleased(commit) {
  return (
    /^[0-9a-f]{40}$/.test(commit ?? '') &&
    Bun.spawnSync(['git', 'merge-base', '--is-ancestor', 'HEAD', commit], { stderr: 'ignore' })
      .success
  )
}

function buildOrder(packages, selected) {
  const ordered = new Set()
  const visiting = new Set()
  function visit(name) {
    if (ordered.has(name)) return
    if (visiting.has(name)) throw new Error(`Circular build dependency at ${name}`)
    visiting.add(name)
    const { manifest } = packages.get(name)
    for (const field of [...dependencyFields, 'devDependencies']) {
      for (const dependency of Object.keys(manifest[field] ?? {})) {
        if (packages.has(dependency)) visit(dependency)
      }
    }
    visiting.delete(name)
    ordered.add(name)
  }
  for (const name of selected) visit(name)
  return ordered
}

function pack(pkg, version, commit, betaVersions, destination) {
  const file = join(pkg.dir, 'package.json')
  const original = readFileSync(file, 'utf8')
  const manifest = { ...pkg.manifest, version, gitHead: commit }
  for (const field of dependencyFields) {
    if (!manifest[field]) continue
    manifest[field] = Object.fromEntries(
      Object.entries(manifest[field]).map(([name, range]) => {
        const betaVersion = betaVersions.get(name)
        const compatible =
          betaVersion &&
          (Bun.semver.satisfies(betaVersion, range) ||
            Bun.semver.satisfies(betaVersion.split('-')[0], range))
        return [name, compatible ? betaVersion : range]
      })
    )
  }
  try {
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
    return run('bun', ['pm', 'pack', '--ignore-scripts', '--quiet', '--destination', destination], {
      cwd: pkg.dir,
      capture: true,
    })
  } finally {
    writeFileSync(file, original)
  }
}

async function resolvePublishedBetaDependencies(packages, releases, betaVersions) {
  const dependencies = new Set()
  for (const name of releases.keys()) {
    const { manifest } = packages.get(name)
    for (const field of dependencyFields) {
      for (const dependency of Object.keys(manifest[field] ?? {})) {
        if (packages.has(dependency) && !betaVersions.has(dependency)) {
          dependencies.add(dependency)
        }
      }
    }
  }
  await Promise.all(
    Array.from(dependencies, async (name) => {
      const metadata = await registryPackage(name)
      const betaVersion = metadata['dist-tags']?.beta
      if (betaVersion) betaVersions.set(name, betaVersion)
    })
  )
}

const branch = process.env.GITHUB_REF_NAME
if (branch !== 'main' && branch !== 'develop')
  throw new Error(`Unexpected release branch: ${branch}`)
const tag = branch === 'main' ? 'latest' : 'beta'
const commit = run('git', ['rev-parse', 'HEAD'], { capture: true })
const packages = readWorkspaces()
const paths = changedPaths(process.env.PUSH_BEFORE, branch)
const candidates = Array.from(packages).filter(([, pkg]) => !paths || hasChanges(pkg, paths))
const runNumber = process.env.GITHUB_RUN_NUMBER
if (tag === 'beta' && !/^[1-9]\d*$/.test(runNumber ?? '')) {
  throw new Error('Expected GITHUB_RUN_NUMBER for beta releases')
}
const betaVersions = new Map()
const releases = new Map()
const candidateMetadata = await Promise.all(
  candidates.map(async ([name, pkg]) => [pkg, await registryPackage(name)])
)
for (const [{ manifest }, metadata] of candidateMetadata) {
  const { name } = manifest
  const taggedVersion = metadata['dist-tags']?.[tag]
  const versions = metadata.versions ?? {}
  if (tag === 'beta') {
    const version = `${manifest.version}-beta.${runNumber}.g${commit.slice(0, 12)}`
    const taggedRun = Number(taggedVersion?.match(/-beta\.(\d+)\.g[0-9a-f]{12}$/)?.[1] ?? 0)
    const published = Object.hasOwn(versions, version)
    if (!published && taggedRun > Number(runNumber)) continue
    betaVersions.set(name, version)
    if (!published) releases.set(name, version)
  } else if (!alreadyReleased(versions[taggedVersion]?.gitHead)) {
    releases.set(name, nextStableVersion(manifest.version, Object.keys(versions)))
  }
}

const order = buildOrder(packages, releases.keys())
console.log(
  `Publish as ${tag}: ${Array.from(releases, ([name, version]) => `${name}@${version}`).join(', ') || 'none'}`
)
console.log(`Build: ${Array.from(order).join(', ') || 'none'}`)

if (releases.size > 0 && !process.argv.includes('--plan-only')) {
  if (tag === 'beta') await resolvePublishedBetaDependencies(packages, releases, betaVersions)
  run('bun', ['install', '--frozen-lockfile'])
  for (const name of order) run('bun', ['run', 'build'], { cwd: packages.get(name).dir })
  const destination = join(process.env.RUNNER_TEMP, 'rakun-npm')
  mkdirSync(destination, { recursive: true })
  const tarballs = Array.from(order)
    .filter((name) => releases.has(name))
    .map((name) => pack(packages.get(name), releases.get(name), commit, betaVersions, destination))
  writeFileSync(join(destination, 'tarballs.txt'), `${tarballs.join('\n')}\n`)
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `has-packages=${releases.size > 0}\ntag=${tag}\n`)
}
