'use client'

import { useState, type CSSProperties } from 'react'

export type JsonViewerTheme = {
  foreground?: string
  muted?: string
  accent?: string
  border?: string
  hover?: string
}

export type JsonViewerProps = {
  value: unknown
  className?: string
  style?: CSSProperties
  defaultExpandedDepth?: number
  theme?: JsonViewerTheme
}

const defaultTheme = {
  foreground: 'currentColor',
  muted: '#8f99a3',
  accent: '#49d17d',
  border: 'rgba(127, 127, 127, 0.28)',
  hover: 'rgba(127, 127, 127, 0.12)',
} satisfies Required<JsonViewerTheme>

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getEntries = (value: Record<string, unknown>) =>
  Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value)

const formatPrimitive = (value: unknown) => {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  return String(value)
}

const Chevron = ({ open, color }: { open: boolean; color: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      width: 16,
      height: 16,
      flexShrink: 0,
      color,
      transform: open ? 'rotate(90deg)' : undefined,
      transition: 'transform 140ms ease',
    }}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const JsonNode = ({
  name,
  value,
  depth,
  isLast = true,
  defaultExpandedDepth,
  theme,
}: {
  name?: string
  value: unknown
  depth: number
  isLast?: boolean
  defaultExpandedDepth: number
  theme: Required<JsonViewerTheme>
}) => {
  const [open, setOpen] = useState(depth <= defaultExpandedDepth)
  const [hovered, setHovered] = useState(false)
  const entries = isObject(value) ? getEntries(value) : []
  const expandable = entries.length > 0
  const array = Array.isArray(value)
  const openToken = array ? '[' : '{'
  const closeToken = array ? ']' : '}'
  const suffix = isLast ? '' : ','
  const collapsedToken = `${openToken}...${closeToken}${suffix}`
  const nameLabel =
    name === undefined ? null : (
      <>
        <span style={{ color: theme.foreground }}>{JSON.stringify(name)}</span>
        <span style={{ color: theme.muted }}>: </span>
      </>
    )

  if (!expandable) {
    const emptyCollection = isObject(value) ? `${openToken}${closeToken}` : null

    return (
      <div style={{ display: 'flex', minWidth: 0, paddingLeft: 16 }}>
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {nameLabel}
          <span style={{ color: theme.accent }}>{emptyCollection ?? formatPrimitive(value)}</span>
          <span style={{ color: theme.muted }}>{suffix}</span>
        </span>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
          padding: 0,
          border: 0,
          borderRadius: 3,
          background: hovered ? theme.hover : 'transparent',
          color: 'inherit',
          font: 'inherit',
          lineHeight: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <Chevron open={open} color={theme.muted} />
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {nameLabel}
          <span style={{ color: theme.muted }}>{open ? openToken : collapsedToken}</span>
        </span>
      </button>

      {open ? (
        <>
          <div
            style={{
              marginLeft: 8,
              paddingLeft: 12,
              borderLeft: `1px solid ${theme.border}`,
            }}
          >
            {entries.map(([key, child], index) => (
              <JsonNode
                key={key}
                name={key}
                value={child}
                depth={depth + 1}
                isLast={index === entries.length - 1}
                defaultExpandedDepth={defaultExpandedDepth}
                theme={theme}
              />
            ))}
          </div>
          <div style={{ marginLeft: 8, color: theme.muted }}>
            {closeToken}
            {suffix}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function JsonViewer({
  value,
  className,
  style,
  defaultExpandedDepth = 0,
  theme: themeOverrides,
}: JsonViewerProps) {
  const theme = { ...defaultTheme, ...themeOverrides }

  return (
    <div className={className} style={{ minWidth: 0, ...style }}>
      <JsonNode value={value} depth={0} defaultExpandedDepth={defaultExpandedDepth} theme={theme} />
    </div>
  )
}
