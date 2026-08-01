import type { ManagerResolvedRoute } from '@/router/shared/types'
import type { ManagerTour } from './types'

import { managerContentListTour } from '@/router/dashboard/[contentType]/(list)/tour'
import { managerContentCreateTour } from '@/router/dashboard/[contentType]/create/tour'
import { managerContentEditTour } from '@/router/dashboard/[contentType]/[edit]/tour'
import { managerAccountTour } from '@/router/dashboard/account/tour'
import { managerApiRoutesTour } from '@/router/dashboard/debugging/api-routes/tour'
import { managerDebuggingTour } from '@/router/dashboard/debugging/tour'
import { managerDashboardTour } from '@/router/dashboard/tour'
import { managerMediaTour } from '@/router/dashboard/media/tour'
import { managerSettingsTour } from '@/router/dashboard/settings/tour'
import { managerSettingsLiteralsTour } from '@/router/dashboard/settings/literals/tour'
import { managerSettingsRedirectsTour } from '@/router/dashboard/settings/redirects/tour'
import { managerSettingsRoutesTour } from '@/router/dashboard/settings/routes/tour'
import { managerSettingsRoutePathsTour } from '@/router/dashboard/settings/routes/paths/tour'
import { managerSettingsSystemTour } from '@/router/dashboard/settings/system/tour'
import { managerUsersTour } from '@/router/dashboard/users/tour'

export const managerTours = [
  managerDashboardTour,
  managerContentListTour,
  managerContentCreateTour,
  managerContentEditTour,
  managerMediaTour,
  managerUsersTour,
  managerAccountTour,
  managerApiRoutesTour,
  managerDebuggingTour,
  managerSettingsTour,
  managerSettingsRoutesTour,
  managerSettingsRoutePathsTour,
  managerSettingsLiteralsTour,
  managerSettingsRedirectsTour,
  managerSettingsSystemTour,
] satisfies ManagerTour[]

export const getManagerTourForRoute = (route: ManagerResolvedRoute) =>
  managerTours.find((tour) => {
    const routes = Array.isArray(tour.route) ? tour.route : [tour.route]
    return routes.includes(route.kind)
  })
