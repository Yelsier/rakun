import { cp, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
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
