import type { RakunBunDocumentProps } from '@rakun-kit/bun'

import './modules/preview.css'

export default function Document({ children, page }: RakunBunDocumentProps) {
  const locale =
    page.language?.code ?? (typeof page.info?.locale === 'string' ? page.info.locale : 'en')

  return (
    <html lang={locale}>
      <head />
      <body>{children}</body>
    </html>
  )
}
