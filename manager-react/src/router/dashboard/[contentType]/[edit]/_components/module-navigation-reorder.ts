export const REORDER_MODULES_EVENT = 'rakun-manager-reorder-modules'

export type ReorderModulesDetail = {
  fieldId: string
  orderedUids: string[]
}

export const dispatchModuleReorder = (detail: ReorderModulesDetail) => {
  window.dispatchEvent(
    new CustomEvent<ReorderModulesDetail>(REORDER_MODULES_EVENT, { detail }),
  )
}
