import { icons, type LucideIcon } from 'lucide-react'

const lucideIconByName = icons as Record<string, LucideIcon | undefined>

const toPascalCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

export const resolveLucideIcon = (name?: string): LucideIcon | undefined => {
  if (!name) return undefined

  const pascalName = toPascalCase(name)
  const candidates = [name, `${name}Icon`, pascalName, `${pascalName}Icon`]

  for (const candidate of candidates) {
    const icon = lucideIconByName[candidate]
    if (icon) return icon
  }
}
