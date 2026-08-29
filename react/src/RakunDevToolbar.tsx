'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PageModule } from '@rakun-kit/core/contracts'

import { JsonViewer } from './JsonViewer'
import { RakunLogoMark } from './RakunLogo'

export type RakunDevToolbarModule = {
  module: PageModule
  entryType: 'content' | 'layout' | 'template'
  index: number
  layoutIndex: number
  layoutKey?: string
  moduleIndex?: number
}

export type RakunDevToolbarProps = {
  modules: RakunDevToolbarModule[]
  renderMode: 'static' | 'dynamic'
  language?: string
  documentType?: string
  documentId?: string
  editHref?: string
  initialOpen?: boolean
}

type HighlightRect = {
  top: number
  left: number
  width: number
  height: number
}

const moduleSelector = '[data-rakun-module]'

const colors = {
  background: 'rgba(17, 20, 24, 0.97)',
  backgroundSoft: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.14)',
  foreground: '#f7f8f8',
  muted: '#a7adb5',
  accent: '#49d17d',
  accentSoft: 'rgba(73, 209, 125, 0.14)',
} as const

const toolbarStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483646,
  right: 16,
  bottom: 16,
  width: 'min(760px, calc(100vw - 32px))',
  overflow: 'hidden',
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: colors.background,
  color: colors.foreground,
  boxShadow: '0 18px 60px rgba(0, 0, 0, 0.38)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
  fontSize: 12,
  lineHeight: 1.45,
}

const launcherStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483646,
  right: 16,
  bottom: 16,
  display: 'grid',
  placeItems: 'center',
  width: 46,
  height: 46,
  padding: 10,
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: colors.background,
  color: colors.accent,
  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.34)',
  cursor: 'pointer',
  transition: 'background 140ms ease, border-color 140ms ease, transform 140ms ease',
}

const buttonStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 7,
  background: colors.backgroundSoft,
  color: colors.foreground,
  padding: '5px 8px',
  font: 'inherit',
  cursor: 'pointer',
  transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
}

const toolbarCss = `
  @keyframes rakun-dev-toolbar-open {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes rakun-dev-toolbar-close {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(12px) scale(0.97); }
  }

  @keyframes rakun-dev-toolbar-launcher-open {
    from { opacity: 0; transform: translateY(8px) scale(0.86); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .rakun-dev-toolbar-panel {
    transform-origin: bottom right;
    animation: rakun-dev-toolbar-open 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .rakun-dev-toolbar-panel-closing {
    pointer-events: none;
    animation: rakun-dev-toolbar-close 150ms ease-in forwards;
  }

  .rakun-dev-toolbar-launcher {
    transform-origin: bottom right;
    animation: rakun-dev-toolbar-launcher-open 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .rakun-dev-toolbar-launcher:hover {
    background: rgba(29, 35, 41, 0.98) !important;
    border-color: ${colors.accent} !important;
    transform: translateY(-2px);
  }

  .rakun-dev-toolbar-action:hover,
  .rakun-dev-toolbar-module:hover {
    background: ${colors.accentSoft} !important;
    border-color: rgba(73, 209, 125, 0.62) !important;
    color: ${colors.accent} !important;
  }

  .rakun-dev-toolbar-launcher:focus-visible,
  .rakun-dev-toolbar-action:focus-visible,
  .rakun-dev-toolbar-module:focus-visible {
    outline: 2px solid ${colors.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .rakun-dev-toolbar-panel,
    .rakun-dev-toolbar-panel-closing,
    .rakun-dev-toolbar-launcher {
      animation: none;
    }

    .rakun-dev-toolbar-launcher,
    .rakun-dev-toolbar-action,
    .rakun-dev-toolbar-module {
      transition: none !important;
    }
  }
`

const getVisibleRects = (elements: Element[]) => {
  const visible = (rect: DOMRect) => rect.width > 0 && rect.height > 0
  return elements.flatMap((element) => {
    const ownRects = Array.from(element.getClientRects()).filter(visible)
    if (ownRects.length > 0) return ownRects

    return Array.from(element.children).flatMap((child) =>
      Array.from(child.getClientRects()).filter(visible)
    )
  })
}

const getHighlightRect = (elements: Element[]): HighlightRect | null => {
  const rects = getVisibleRects(elements)
  if (rects.length === 0) return null

  const bounds = rects.reduce(
    (current, rect) => ({
      top: Math.min(current.top, rect.top),
      right: Math.max(current.right, rect.right),
      bottom: Math.max(current.bottom, rect.bottom),
      left: Math.min(current.left, rect.left),
    }),
    {
      top: rects[0]!.top,
      right: rects[0]!.right,
      bottom: rects[0]!.bottom,
      left: rects[0]!.left,
    }
  )

  return {
    top: Math.max(0, bounds.top),
    left: Math.max(0, bounds.left),
    width: Math.max(0, Math.min(window.innerWidth, bounds.right) - Math.max(0, bounds.left)),
    height: Math.max(0, Math.min(window.innerHeight, bounds.bottom) - Math.max(0, bounds.top)),
  }
}

const getModuleElements = (index: number) =>
  Array.from(document.querySelectorAll(`${moduleSelector}[data-rakun-index="${index}"]`))

const getModuleIndex = (element: Element) => {
  const value = Number((element as HTMLElement).dataset.rakunIndex)
  return Number.isFinite(value) ? value : null
}

export function RakunDevToolbar({
  modules,
  renderMode,
  language,
  documentType,
  documentId,
  editHref,
  initialOpen = false,
}: RakunDevToolbarProps) {
  const [open, setOpen] = useState(initialOpen)
  const [hidden, setHidden] = useState(false)
  const [closing, setClosing] = useState<'hide' | 'minimize' | null>(null)
  const [inspect, setInspect] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)
  const [pathname, setPathname] = useState('/')
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeIndex = open && !closing ? (hoveredIndex ?? selectedIndex) : null
  const selected = useMemo(
    () => modules.find((entry) => entry.index === selectedIndex),
    [modules, selectedIndex]
  )

  useEffect(() => {
    setPathname(`${window.location.pathname}${window.location.search}`)

    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const updateHighlight = useCallback(() => {
    setHighlight(activeIndex === null ? null : getHighlightRect(getModuleElements(activeIndex)))
  }, [activeIndex])

  useEffect(() => {
    updateHighlight()
    window.addEventListener('resize', updateHighlight)
    window.addEventListener('scroll', updateHighlight, true)

    return () => {
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
    }
  }, [updateHighlight])

  useEffect(() => {
    if (!inspect) {
      setHoveredIndex(null)
      return
    }

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'crosshair'

    const onPointerMove = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target || target.closest('[data-rakun-dev-toolbar]')) {
        setHoveredIndex(null)
        return
      }

      const moduleElement = target.closest(moduleSelector)
      setHoveredIndex(moduleElement ? getModuleIndex(moduleElement) : null)
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target || target.closest('[data-rakun-dev-toolbar]')) return

      const moduleElement = target.closest(moduleSelector)
      if (!moduleElement) return

      const index = getModuleIndex(moduleElement)
      if (index === null) return

      event.preventDefault()
      event.stopPropagation()
      setSelectedIndex(index)
      setInspect(false)
      setOpen(true)
    }

    document.addEventListener('mousemove', onPointerMove, true)
    document.addEventListener('click', onClick, true)

    return () => {
      document.body.style.cursor = previousCursor
      document.removeEventListener('mousemove', onPointerMove, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [inspect])

  const selectModule = (entry: RakunDevToolbarModule) => {
    setSelectedIndex(entry.index)
    setOpen(true)

    const element = getModuleElements(entry.index)[0]
    const scrollTarget = element?.firstElementChild ?? element
    scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const closeToolbar = (destination: 'hide' | 'minimize') => {
    if (closing) return

    setInspect(false)
    setHoveredIndex(null)
    setClosing(destination)

    if (destination === 'hide') {
      setSelectedIndex(null)
      setHighlight(null)
    }

    closeTimer.current = setTimeout(() => {
      if (destination === 'hide') setHidden(true)
      else setOpen(false)

      setClosing(null)
      closeTimer.current = null
    }, 150)
  }

  if (hidden) return null

  if (!open) {
    return (
      <>
        <style data-rakun-dev-toolbar="">{toolbarCss}</style>
        <button
          type="button"
          className="rakun-dev-toolbar-launcher"
          data-rakun-dev-toolbar=""
          aria-label="Open Rakun development toolbar"
          title="Open Rakun development toolbar"
          onClick={() => setOpen(true)}
          style={launcherStyle}
        >
          <RakunLogoMark style={{ display: 'block', width: 24, height: 26 }} />
        </button>
      </>
    )
  }

  return (
    <>
      {highlight ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            zIndex: 2147483645,
            pointerEvents: 'none',
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            border: `2px solid ${colors.accent}`,
            borderRadius: 6,
            background: colors.accentSoft,
            boxShadow: '0 0 0 4px rgba(73, 209, 125, 0.18)',
          }}
        />
      ) : null}

      <aside
        className={`rakun-dev-toolbar-panel${closing ? ' rakun-dev-toolbar-panel-closing' : ''}`}
        data-rakun-dev-toolbar=""
        style={toolbarStyle}
      >
        <style>{toolbarCss}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 42,
            padding: '7px 8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: colors.accent,
              fontWeight: 700,
            }}
          >
            <RakunLogoMark style={{ display: 'block', width: 16, height: 18 }} />
            Rakun Dev
          </span>
          <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pathname}
          </span>
          <span style={{ color: colors.muted }}>{modules.length} modules</span>
          <button
            type="button"
            className="rakun-dev-toolbar-action"
            aria-pressed={inspect}
            onClick={() => setInspect((value) => !value)}
            style={{
              ...buttonStyle,
              borderColor: inspect ? colors.accent : colors.border,
              color: inspect ? colors.accent : colors.foreground,
            }}
          >
            Inspect
          </button>
          {editHref ? (
            <a
              className="rakun-dev-toolbar-action"
              href={editHref}
              target="_blank"
              rel="noreferrer"
              style={{ ...buttonStyle, textDecoration: 'none' }}
            >
              Edit
            </a>
          ) : null}
          <button
            type="button"
            className="rakun-dev-toolbar-action"
            onClick={() => closeToolbar('hide')}
            style={buttonStyle}
          >
            Hide
          </button>
          <button
            type="button"
            className="rakun-dev-toolbar-action"
            aria-label="Minimize Rakun development toolbar"
            title="Minimize"
            onClick={() => closeToolbar('minimize')}
            style={{ ...buttonStyle, width: 30, paddingInline: 0 }}
          >
            &minus;
          </button>
        </div>

        {open ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(190px, 0.7fr) minmax(0, 1.3fr)',
              height: 'min(440px, 55vh)',
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{ minWidth: 0, overflow: 'auto', borderRight: `1px solid ${colors.border}` }}
            >
              <div style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ color: colors.muted }}>Route</div>
                <div style={{ marginTop: 3, overflowWrap: 'anywhere' }}>{pathname}</div>
                <div style={{ marginTop: 6, color: colors.muted }}>
                  {renderMode}
                  {language ? ` · ${language}` : ''}
                </div>
                {documentType ? (
                  <div style={{ marginTop: 3, color: colors.muted, overflowWrap: 'anywhere' }}>
                    {documentType}
                    {documentId ? ` · ${documentId}` : ''}
                  </div>
                ) : null}
              </div>
              <div style={{ padding: 6 }}>
                {modules.map((entry) => {
                  const active = entry.index === selectedIndex
                  return (
                    <button
                      key={`${entry.entryType}:${entry.index}:${entry.module._id}`}
                      type="button"
                      className="rakun-dev-toolbar-module"
                      onMouseEnter={() => setHoveredIndex(entry.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => selectModule(entry)}
                      style={{
                        ...buttonStyle,
                        display: 'block',
                        width: '100%',
                        marginBottom: 4,
                        borderColor: active ? colors.accent : 'transparent',
                        background: active ? colors.accentSoft : 'transparent',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ color: colors.muted }}>{entry.index + 1}. </span>
                      {entry.module._type}
                      <span style={{ display: 'block', color: colors.muted, fontSize: 10 }}>
                        {entry.entryType}
                        {entry.layoutKey ? ` · ${entry.layoutKey}` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ minWidth: 0, overflow: 'auto', padding: 10 }}>
              {selected ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <strong style={{ color: colors.accent }}>{selected.module._type}</strong>
                    <span style={{ color: colors.muted }}>{selected.module._id}</span>
                  </div>
                  <div style={{ marginTop: 8, color: colors.muted }}>Props</div>
                  <JsonViewer
                    key={selected.index}
                    value={selected.module}
                    style={{
                      marginTop: 6,
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(0, 0, 0, 0.28)',
                      color: colors.foreground,
                    }}
                    theme={{
                      foreground: colors.foreground,
                      muted: colors.muted,
                      accent: colors.accent,
                      border: colors.border,
                      hover: colors.accentSoft,
                    }}
                  />
                </>
              ) : (
                <div style={{ color: colors.muted }}>
                  Select a module from the list or enable Inspect and click it on the page.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  )
}
