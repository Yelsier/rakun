import { cp, mkdir, readFile, writeFile, copyFile, watch } from 'node:fs/promises'
import path from 'node:path'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'

const packageRoot = path.resolve(import.meta.dirname, '..')
const inputPath = path.join(packageRoot, 'src/styles/globals.css')
const outputPath = path.join(packageRoot, 'dist/styles.css')
const outputTypesPath = path.join(packageRoot, 'dist/styles.css.d.ts')
const sourceTypesPath = path.join(packageRoot, 'styles.css.d.ts')
const fontOutputDir = path.join(packageRoot, 'dist/fonts')
const editorThemeCssSourcePath = path.join(
  packageRoot,
  'src/components/editor/themes/editor-theme.css',
)
const editorThemeCssOutputs = [
  path.join(packageRoot, 'dist/esm/components/editor/themes/editor-theme.css'),
  path.join(packageRoot, 'dist/cjs/components/editor/themes/editor-theme.css'),
]

let buildInFlight = false
let pendingBuild = false
let buildTimer

const buildCss = async () => {
  const input = await readFile(inputPath, 'utf8')
  const result = await postcss([tailwindcss()]).process(input, {
    from: inputPath,
    to: outputPath,
  })

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, result.css)
  await copyFile(sourceTypesPath, outputTypesPath)
  await mkdir(fontOutputDir, { recursive: true })
  await cp(
    path.join(packageRoot, 'src/styles/Inter/Inter-VariableFont_opsz,wght.ttf'),
    path.join(fontOutputDir, 'Inter-VariableFont_opsz,wght.ttf'),
  )
  await cp(
    path.join(packageRoot, 'src/styles/Inter/Inter-Italic-VariableFont_opsz,wght.ttf'),
    path.join(fontOutputDir, 'Inter-Italic-VariableFont_opsz,wght.ttf'),
  )
  await cp(
    path.join(packageRoot, 'src/styles/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf'),
    path.join(fontOutputDir, 'SpaceGrotesk-VariableFont_wght.ttf'),
  )

  for (const editorThemeCssOutput of editorThemeCssOutputs) {
    await mkdir(path.dirname(editorThemeCssOutput), { recursive: true })
    await copyFile(editorThemeCssSourcePath, editorThemeCssOutput)
  }
}

const runBuild = async () => {
  if (buildInFlight) {
    pendingBuild = true
    return
  }

  buildInFlight = true

  try {
    await buildCss()
    console.log('[manager-react] CSS rebuilt')
  } catch (error) {
    console.error('[manager-react] CSS build failed')
    console.error(error)
  } finally {
    buildInFlight = false
    if (pendingBuild) {
      pendingBuild = false
      await runBuild()
    }
  }
}

const watchCss = async () => {
  await runBuild()
  console.log('[manager-react] Watching src for CSS rebuilds...')

  const watcher = watch(path.join(packageRoot, 'src'), { recursive: true })

  for await (const event of watcher) {
    if (!event.filename) {
      continue
    }

    clearTimeout(buildTimer)
    buildTimer = setTimeout(() => {
      runBuild()
    }, 120)
  }
}

if (process.argv.includes('--watch')) {
  await watchCss()
} else {
  await buildCss()
}
