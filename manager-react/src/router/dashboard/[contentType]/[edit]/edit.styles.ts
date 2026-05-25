import { cva } from 'class-variance-authority'

export const errorStyle = cva('', {
  variants: {
    error: {
      true: 'border-red-500',
    },
  },
})
