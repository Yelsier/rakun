import {
  extendManagerLanguagePack,
  type ManagerLanguagePack,
} from '@rakun-kit/core/contracts'
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

const englishPreviewMessages = {
  'field.title': 'Title',
  'layoutModule.header': 'Header',
  'layoutModule.footer': 'Footer',
  'preview.contentTypes.category.layout': 'Layout',
  'preview.contentTypes.category.blocks': 'Blocks',
  'preview.contentTypes.category.editorial': 'Editorial',
  'preview.contentTypes.category.development': 'Development',
  'preview.contentTypes.category.content': 'Content',
  'preview.contentTypes.header.menu': 'Headers',
  'preview.contentTypes.footer.menu': 'Footers',
  'preview.contentTypes.pageSection.menu': 'Page sections',
  'preview.contentTypes.page.menu': 'Pages',
  'preview.contentTypes.author.menu': 'Authors',
  'preview.contentTypes.article.menu': 'Articles',
  'preview.contentTypes.conditionalDemo.menu': 'Conditional demos',
}

const spanishPreviewMessages = {
  'field.title': 'Título',
  'layoutModule.header': 'Cabecera',
  'layoutModule.footer': 'Pie de página',
  'preview.contentTypes.category.layout': 'Layout',
  'preview.contentTypes.category.blocks': 'Bloques',
  'preview.contentTypes.category.editorial': 'Editorial',
  'preview.contentTypes.category.development': 'Desarrollo',
  'preview.contentTypes.category.content': 'Contenido',
  'preview.contentTypes.header.menu': 'Cabeceras',
  'preview.contentTypes.footer.menu': 'Pies de página',
  'preview.contentTypes.pageSection.menu': 'Secciones de página',
  'preview.contentTypes.page.menu': 'Páginas',
  'preview.contentTypes.author.menu': 'Autores',
  'preview.contentTypes.article.menu': 'Artículos',
  'preview.contentTypes.conditionalDemo.menu': 'Demos condicionales',
}

export const previewManagerLanguages: ManagerLanguagePack[] = [
  {
    code: 'en',
    name: 'English',
    messages: englishPreviewMessages,
  },
  extendManagerLanguagePack(esManagerLocalePack, spanishPreviewMessages),
]
