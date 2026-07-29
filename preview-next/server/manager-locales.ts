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
  'preview.contentTypes.category.dynamicData': 'Dynamic data',
  'preview.contentTypes.category.editorial': 'Editorial',
  'preview.contentTypes.category.development': 'Development',
  'preview.contentTypes.header.menu': 'Headers',
  'preview.contentTypes.footer.menu': 'Footers',
  'preview.contentTypes.pageSection.menu': 'Page sections',
  'preview.contentTypes.category.menu': 'Categories',
  'preview.contentTypes.project.menu': 'Projects',
  'preview.contentTypes.featureCarousel.menu': 'Feature carousels',
  'preview.contentTypes.categoriesGallery.menu': 'Category galleries',
  'preview.contentTypes.page.menu': 'Pages',
  'preview.contentTypes.author.menu': 'Authors',
  'preview.contentTypes.article.menu': 'Articles',
  'preview.contentTypes.relationLevel2.menu': 'Relations level 2',
  'preview.contentTypes.relationPlayground.menu': 'Relations playground',
  'preview.contentTypes.imagePlayground.menu': 'Images playground',
  'preview.contentTypes.conditionalDemo.menu': 'Conditional demos',
  'preview.contentTypes.translationPlayground.menu': 'Translation playground',
}

const spanishPreviewMessages = {
  'field.title': 'Título',
  'layoutModule.header': 'Cabecera',
  'layoutModule.footer': 'Pie de página',
  'preview.contentTypes.category.layout': 'Layout',
  'preview.contentTypes.category.blocks': 'Bloques',
  'preview.contentTypes.category.dynamicData': 'Datos dinámicos',
  'preview.contentTypes.category.editorial': 'Editorial',
  'preview.contentTypes.category.development': 'Desarrollo',
  'preview.contentTypes.header.menu': 'Cabeceras',
  'preview.contentTypes.footer.menu': 'Pies de página',
  'preview.contentTypes.pageSection.menu': 'Secciones de página',
  'preview.contentTypes.category.menu': 'Categorías',
  'preview.contentTypes.project.menu': 'Proyectos',
  'preview.contentTypes.featureCarousel.menu': 'Carruseles destacados',
  'preview.contentTypes.categoriesGallery.menu': 'Galerías de categorías',
  'preview.contentTypes.page.menu': 'Páginas',
  'preview.contentTypes.author.menu': 'Autores',
  'preview.contentTypes.article.menu': 'Artículos',
  'preview.contentTypes.relationLevel2.menu': 'Relaciones nivel 2',
  'preview.contentTypes.relationPlayground.menu': 'Playground de relaciones',
  'preview.contentTypes.imagePlayground.menu': 'Playground de imágenes',
  'preview.contentTypes.conditionalDemo.menu': 'Demos condicionales',
  'preview.contentTypes.translationPlayground.menu': 'Playground de traducción',
}

export const previewManagerLanguages: ManagerLanguagePack[] = [
  {
    code: 'en',
    name: 'English',
    messages: englishPreviewMessages,
  },
  extendManagerLanguagePack(esManagerLocalePack, spanishPreviewMessages),
]
