import { create } from 'zustand'

export const useUser = create<{
  user: unknown
  setUser: (u: unknown) => void
}>((set) => ({
  user: null,
  setUser: (u: unknown) => set({ user: u }),
}))

export const useEditErrorStore = create<{
  errors: { id: string; error: string }[]
  addError: (id: string, error: string) => void
  removeError: (id: string) => void
  removeRelatedErrors: (id: string) => void
  cleanErrors: () => void
}>((set) => ({
  errors: [],
  addError: (id: string, error: string) =>
    set((state) => ({
      errors: state.errors.some((current) => current.id === id)
        ? state.errors.map((current) =>
            current.id === id ? { id, error } : current,
          )
        : [...state.errors, { id, error }],
    })),
  removeError: (id: string) =>
    set((state) => {
      if (!state.errors.some((current) => current.id === id)) {
        return state
      }
      return {
        errors: state.errors.filter((current) => current.id !== id),
      }
    }),
  removeRelatedErrors: (id: string) =>
    set((state) => {
      const nextErrors = state.errors.filter((current) => {
        const isSelf = current.id === id
        const isParent = id.startsWith(`${current.id}.`)
        const isChild = current.id.startsWith(`${id}.`)
        return !(isSelf || isParent || isChild)
      })
      if (nextErrors.length === state.errors.length) {
        return state
      }
      return { errors: nextErrors }
    }),
  cleanErrors: () => {
    set((state) => {
      if (state.errors.length > 0) {
        return { errors: [] }
      }
      return state
    })
  },
}))
