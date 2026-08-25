import { createElement, forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic'

const availableIconNames: ReadonlySet<string> = new Set(iconNames)
const resolvedIcons = new Map<IconName, LucideIcon>()

const isIconName = (name: string): name is IconName =>
  availableIconNames.has(name)

const toKebabCase = (value: string) =>
  value
    .trim()
    .replace(/[-_\s]?icon$/i, '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .join('-')
    .toLowerCase()

export const resolveLucideIconName = (name?: string): IconName | undefined => {
  if (!name) return undefined

  const normalizedName = toKebabCase(name)
  return isIconName(normalizedName) ? normalizedName : undefined
}

export const resolveLucideIcon = (name?: string): LucideIcon | undefined => {
  const iconName = resolveLucideIconName(name)
  if (!iconName) return undefined

  const cachedIcon = resolvedIcons.get(iconName)
  if (cachedIcon) return cachedIcon

  const icon = forwardRef<SVGSVGElement, LucideProps>((props, ref) =>
    createElement(DynamicIcon, { ...props, name: iconName, ref }),
  )
  icon.displayName = `DynamicLucideIcon(${iconName})`
  resolvedIcons.set(iconName, icon)

  return icon
}
