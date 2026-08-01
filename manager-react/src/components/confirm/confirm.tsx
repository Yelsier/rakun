'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslations } from '@/i18n'

export type ConfirmResult = 'confirmed' | 'cancelled' | 'dismissed'

export type ConfirmOptions = {
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /**
   * Visual style for the confirm action.
   * @default 'default'
   */
  variant?: 'default' | 'destructive'
  /**
   * When set, the dialog stays open with a loading confirm button until this
   * settles. A thrown error leaves the dialog open so the caller can toast.
   */
  onConfirm?: () => void | Promise<void>
}

type ConfirmFn = (options: ConfirmOptions) => Promise<ConfirmResult>

type PendingConfirm = ConfirmOptions & {
  resolve: (result: ConfirmResult) => void
}

const ConfirmContext = createContext<ConfirmFn | null>(null)

let imperativeConfirm: ConfirmFn | null = null

/**
 * Ask for confirmation with the shared manager dialog.
 * Resolves to `confirmed`, `cancelled` (explicit cancel), or `dismissed`
 * (escape / overlay / close button).
 */
export function confirm(options: ConfirmOptions): Promise<ConfirmResult> {
  if (!imperativeConfirm) {
    throw new Error('confirm() was called outside ConfirmProvider')
  }

  return imperativeConfirm(options)
}

/** Convenience helper: `true` only when the user explicitly confirms. */
confirm.yes = async (options: ConfirmOptions): Promise<boolean> =>
  (await confirm(options)) === 'confirmed'

export function useConfirm(): ConfirmFn {
  const value = useContext(ConfirmContext)
  if (!value) {
    throw new Error('useConfirm() requires ConfirmProvider')
  }
  return value
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTranslations()
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [loading, setLoading] = useState(false)
  const queueRef = useRef<PendingConfirm[]>([])
  const pendingRef = useRef<PendingConfirm | null>(null)
  const closeReasonRef = useRef<ConfirmResult>('dismissed')
  const loadingRef = useRef(false)

  const present = useCallback((entry: PendingConfirm | null) => {
    pendingRef.current = entry
    closeReasonRef.current = 'dismissed'
    loadingRef.current = false
    setLoading(false)
    setPending(entry)
  }, [])

  const showNext = useCallback(() => {
    present(queueRef.current.shift() ?? null)
  }, [present])

  const confirmFn = useCallback<ConfirmFn>((options) => {
    return new Promise<ConfirmResult>((resolve) => {
      const entry: PendingConfirm = { ...options, resolve }

      if (pendingRef.current) {
        queueRef.current.push(entry)
        return
      }

      present(entry)
    })
  }, [present])

  useEffect(() => {
    imperativeConfirm = confirmFn
    return () => {
      if (imperativeConfirm === confirmFn) {
        imperativeConfirm = null
      }
    }
  }, [confirmFn])

  const finish = useCallback(
    (result: ConfirmResult) => {
      const current = pendingRef.current
      if (!current) return

      pendingRef.current = null
      current.resolve(result)
      showNext()
    },
    [showNext],
  )

  const handleOpenChange = (open: boolean) => {
    if (open || loadingRef.current || !pendingRef.current) return
    finish(closeReasonRef.current)
  }

  const handleCancel = () => {
    if (loadingRef.current) return
    closeReasonRef.current = 'cancelled'
    finish('cancelled')
  }

  const handleConfirm = async () => {
    const current = pendingRef.current
    if (!current || loadingRef.current) return

    if (!current.onConfirm) {
      closeReasonRef.current = 'confirmed'
      finish('confirmed')
      return
    }

    loadingRef.current = true
    setLoading(true)
    try {
      await current.onConfirm()
      closeReasonRef.current = 'confirmed'
      finish('confirmed')
    } catch {
      loadingRef.current = false
      setLoading(false)
    }
  }

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      <Dialog open={pending !== null} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!loading}
          onClose={() => {
            if (loadingRef.current) return
            closeReasonRef.current = 'dismissed'
          }}
          onPointerDownOutside={(event) => {
            if (loadingRef.current) event.preventDefault()
          }}
          onEscapeKeyDown={(event) => {
            if (loadingRef.current) event.preventDefault()
          }}
        >
          {pending ? (
            <>
              <DialogHeader>
                <DialogTitle>{pending.title}</DialogTitle>
                {pending.description ? (
                  <DialogDescription>{pending.description}</DialogDescription>
                ) : null}
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleCancel}
                >
                  {pending.cancelLabel ?? t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant={pending.variant === 'destructive' ? 'destructive' : 'default'}
                  loading={loading}
                  onClick={() => void handleConfirm()}
                >
                  {pending.confirmLabel ?? t('common.confirm')}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
