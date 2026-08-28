import type { RakunBunDocumentProps } from '@rakun-kit/bun'

import './styles.css'

export default function Document({ children, page }: RakunBunDocumentProps) {
  return (
    <html lang={page.language?.code ?? 'en'}>
      <head />
      <body>{children}</body>
    </html>
  )
}
