'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { ManagerResolvedRoute } from '@/router/shared/types'
import { useTranslations } from '@/i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tour,
  TourArrow,
  TourClose,
  TourDescription,
  TourFooter,
  TourHeader,
  TourNext,
  TourPortal,
  TourPrev,
  TourSpotlight,
  TourSpotlightRing,
  TourStep,
  TourStepCounter,
  TourTitle,
} from '@/components/ui/tour'
import { useManagerMutation } from '@/client/react'
import { useSession } from '@/state/session'
import { getManagerTourForRoute } from './registry'
import type { ManagerTour, ManagerTourStep } from './types'

type ManagerHelpContextValue = {
  currentTour?: ManagerTour
  hasCurrentTour: boolean
  startCurrentTour: () => void
}

type ActiveTourStep = Omit<ManagerTourStep, 'target'> & {
  target: HTMLElement
}

const ManagerHelpContext = createContext<ManagerHelpContextValue | null>(null)

const getAvailableSteps = (steps: ManagerTourStep[]) => {
  if (typeof document === 'undefined') return []

  return steps.reduce<ActiveTourStep[]>((availableSteps, step) => {
    const target = Array.from(document.querySelectorAll(step.target)).find(
      (element): element is HTMLElement => {
        if (!(element instanceof HTMLElement)) return false

        const rect = element.getBoundingClientRect()
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          window.getComputedStyle(element).visibility !== 'hidden'
        )
      }
    )

    if (target) {
      availableSteps.push({ ...step, target })
    }

    return availableSteps
  }, [])
}

export type ManagerHelpProviderProps = {
  route: ManagerResolvedRoute
  children: ReactNode
}

export function ManagerHelpProvider({ route, children }: ManagerHelpProviderProps) {
  const t = useTranslations()
  const { user, setUser } = useSession()
  const currentTour = useMemo(() => getManagerTourForRoute(route), [route])
  const [activeTour, setActiveTour] = useState<ManagerTour | undefined>()
  const [activeSteps, setActiveSteps] = useState<ActiveTourStep[]>([])
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [promptOpen, setPromptOpen] = useState(false)
  const [autoStartedTourIds, setAutoStartedTourIds] = useState<Set<string>>(() => new Set())
  const updateTutorialPreferences = useManagerMutation('manager.auth.updateTutorialPreferences')
  const markTourSeen = useManagerMutation('manager.auth.markTourSeen')

  const hasCurrentTour = Boolean(currentTour)

  const markSeen = useCallback(
    async (tourId: string) => {
      if (user.seenTours?.includes(tourId)) return

      const updated = await markTourSeen.mutateAsync({ tourId })
      setUser(updated)
    },
    [markTourSeen, setUser, user.seenTours]
  )

  const startTour = useCallback((tour?: ManagerTour) => {
    if (!tour) return

    window.setTimeout(() => {
      const steps = getAvailableSteps(tour.steps)
      if (steps.length === 0) return

      setOpen(false)
      setActiveTour(tour)
      setActiveSteps(steps)
      setStepIndex(0)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setOpen(true)
        })
      })
    }, 100)
  }, [])

  const startCurrentTour = useCallback(() => {
    startTour(currentTour)
  }, [currentTour, startTour])

  const closeTour = useCallback(
    async (nextOpen: boolean) => {
      setOpen(nextOpen)

      if (!nextOpen && activeTour) {
        await markSeen(activeTour.id).catch(() => undefined)
      }
    },
    [activeTour, markSeen]
  )

  useEffect(() => {
    if (!open) return

    const activeStep = activeSteps[stepIndex]
    if (activeStep?.target.isConnected) return

    setOpen(false)
  }, [activeSteps, open, stepIndex])

  useEffect(() => {
    setOpen(false)
    setStepIndex(0)
    setActiveTour(undefined)
    setActiveSteps([])
  }, [route.kind])

  useEffect(() => {
    if (user.tutorialsEnabled !== undefined) return
    if (user.tutorialsPromptedAt) return
    setPromptOpen(true)
  }, [user.tutorialsEnabled, user.tutorialsPromptedAt])

  useEffect(() => {
    if (!currentTour) return
    if (user.tutorialsEnabled !== true) return
    if (user.seenTours?.includes(currentTour.id)) return
    if (autoStartedTourIds.has(currentTour.id)) return

    setAutoStartedTourIds((previous) => new Set(previous).add(currentTour.id))
    startTour(currentTour)
  }, [autoStartedTourIds, currentTour, startTour, user.seenTours, user.tutorialsEnabled])

  const handleTutorialPreference = async (enabled: boolean) => {
    setPromptOpen(false)
    try {
      const updated = await updateTutorialPreferences.mutateAsync({ enabled })
      setUser(updated)

      if (enabled) {
        startTour(currentTour)
      }
    } catch {
      setPromptOpen(true)
    }
  }

  const contextValue = useMemo<ManagerHelpContextValue>(
    () => ({
      currentTour,
      hasCurrentTour,
      startCurrentTour,
    }),
    [currentTour, hasCurrentTour, startCurrentTour]
  )

  return (
    <ManagerHelpContext.Provider value={contextValue}>
      {children}

      <Dialog open={promptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('help.tutorialsPromptTitle')}</DialogTitle>
            <DialogDescription>
              {t('help.tutorialsPromptDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              loading={updateTutorialPreferences.isPending}
              onClick={() => void handleTutorialPreference(false)}
            >
              {t('help.tutorialsDecline')}
            </Button>
            <Button
              type="button"
              loading={updateTutorialPreferences.isPending}
              onClick={() => void handleTutorialPreference(true)}
            >
              {t('help.tutorialsEnable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTour && activeSteps.length > 0 ? (
        <Tour
          key={`${activeTour.id}:${activeSteps.length}`}
          open={open}
          value={stepIndex}
          onOpenChange={(nextOpen) => void closeTour(nextOpen)}
          onValueChange={setStepIndex}
          onComplete={() => void closeTour(false)}
          onSkip={() => void closeTour(false)}
          spotlightPadding={8}
          stepFooter={
            <TourFooter>
              <div className="flex w-full items-center justify-between">
                <TourStepCounter />
                <div className="flex gap-2">
                  <TourPrev />
                  <TourNext />
                </div>
              </div>
            </TourFooter>
          }
        >
          <TourPortal>
            <TourSpotlight className="z-40" />
            <TourSpotlightRing className="z-55" />
            {activeSteps.map((step) => (
              <TourStep
                key={`${activeTour.id}:${step.target.dataset.tour ?? step.title}`}
                target={step.target}
                side={step.side}
                align={step.align}
                className="z-60 max-w-sm"
              >
                <TourArrow />
                <TourHeader>
                  <TourTitle>{step.title}</TourTitle>
                  <TourDescription>{step.description}</TourDescription>
                </TourHeader>
                <TourClose />
              </TourStep>
            ))}
          </TourPortal>
        </Tour>
      ) : null}
    </ManagerHelpContext.Provider>
  )
}

export function useManagerHelp() {
  const context = useContext(ManagerHelpContext)
  if (!context) {
    throw new Error('useManagerHelp must be used within ManagerHelpProvider')
  }
  return context
}
