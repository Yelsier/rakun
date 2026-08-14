import { DataFront } from '@rakun-kit/core/types'
import { ContentType, f } from '@rakun-kit/next'
import { HelloWorld, StructuredData } from '@rakun-kit/next/internal-content-types'

export const Header = new ContentType({
  name: 'Header',
  menu: {
    title: 'preview.contentTypes.header.menu',
    icon: 'PanelTop',
    category: 'preview.contentTypes.category.layout',
  },
  fields: {
    brand: f.string().required(),
    primaryLinkLabel: f.string().optional(),
    primaryLinkHref: f.string().type('Url').optional(),
    navigation: f.menu().optional(),
  },
  listFields: ['brand', 'primaryLinkLabel'],
})

export const Footer = new ContentType({
  name: 'Footer',
  menu: {
    title: 'preview.contentTypes.footer.menu',
    icon: 'panel-bottom',
    category: 'preview.contentTypes.category.layout',
  },
  fields: {
    brand: f.string().required(),
    copyright: f.string().optional(),
    primaryLinkLabel: f.string().optional(),
    primaryLinkHref: f.string().type('Url').optional(),
    internalLink: f.link().optional(),
  },
  listFields: ['brand', 'copyright'],
})

export const PageSection = new ContentType({
  name: 'PageSection',
  menu: {
    title: 'preview.contentTypes.pageSection.menu',
    icon: 'LayoutTemplate',
    category: 'preview.contentTypes.category.blocks',
  },
  fields: {
    title: f.string().required().translatable(),
    body: f.string().type('RichText').translatable().optional(),
  },
  listFields: ['title'],
})

export const UseCaseContent = new ContentType({
  name: 'UseCaseContent',
  modulePicker: {
    title: 'preview.modules.useCaseContent.title',
    description: 'preview.modules.useCaseContent.description',
    icon: 'FileText',
  },
  fields: {
    eyebrow: f.string().optional(),
    title: f.string().required(),
    body: f.string().type('RichText').optional(),
  },
}).hideFromManager()

export const UseCaseHero = new ContentType({
  name: 'UseCaseHero',
  modulePicker: {
    title: 'preview.modules.useCaseHero.title',
    description: 'preview.modules.useCaseHero.description',
    icon: 'Sparkles',
  },
  fields: {
    eyebrow: f.string().optional(),
    title: f.string().required(),
    summary: f.string().type('Textarea').optional(),
  },
}).hideFromManager()

export const UseCaseLayoutWithInfo = new ContentType({
  name: 'UseCaseLayoutWithInfo',
  modulePicker: {
    title: 'preview.modules.useCaseLayoutWithInfo.title',
    description: 'preview.modules.useCaseLayoutWithInfo.description',
    icon: 'PanelRight',
  },
  fields: {
    asideEyebrow: f.string().optional(),
    asideTitle: f.string().required(),
    asideBody: f.string().type('Textarea').optional(),
    blocks: f.blocks([]).optional(),
  },
}).hideFromManager()

export const UseCaseNewsletter = new ContentType({
  name: 'UseCaseNewsletter',
  modulePicker: {
    title: 'preview.modules.useCaseNewsletter.title',
    description: 'preview.modules.useCaseNewsletter.description',
    icon: 'Mail',
  },
  fields: {
    eyebrow: f.string().optional(),
    title: f.string().required(),
    body: f.string().type('Textarea').optional(),
    buttonLabel: f.string().optional(),
    buttonHref: f.string().type('Url').optional(),
  },
}).hideFromManager()

export const UseCase = new ContentType({
  name: 'UseCase',
  dynamicDataSource: true,
  menu: {
    title: 'preview.contentTypes.useCase.menu',
    icon: 'BriefcaseBusiness',
    category: 'preview.contentTypes.category.editorial',
  },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
    summary: f.string().type('Textarea').required(),
    industry: f.string().required(),
  },
  iterator: [
    {
      contentType: UseCaseContent,
      type: 'new',
    },
    {
      contentType: UseCaseHero,
      type: 'new',
    },
    {
      contentType: UseCaseLayoutWithInfo,
      type: 'new',
    },
    {
      contentType: UseCaseNewsletter,
      type: 'new',
    },
    {
      contentType: StructuredData,
      type: 'new',
    },
  ],
  uniques: [['slug']],
  listFields: ['title', 'slug', 'industry'],
})

export const Category = new ContentType({
  name: 'Category',
  dynamicDataSource: true,
  menu: {
    title: 'preview.contentTypes.category.menu',
    icon: 'Tags',
    category: 'preview.contentTypes.category.dynamicData',
  },
  iterator: [
    {
      type: 'new',
      contentType: HelloWorld,
    },
    {
      type: 'new',
      contentType: StructuredData,
    },
  ],
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug'],
})

export const LinkItem = new ContentType({
  name: 'LinkItem',
  fields: {
    title: f.string().translatable().required(),
    link: f.link().required(),
  },
  listFields: ['title'],
})

export const ProjectHeader = new ContentType({
  name: 'ProjectHeader',
  fields: {
    title: f.string().translatable().required(),
    categories: f.array(f.link()).required(),
    company: f.string().translatable().required(),
  },
})

export const Project = new ContentType({
  name: 'Project',
  dynamicDataSource: true,
  menu: {
    title: 'preview.contentTypes.project.menu',
    icon: 'FolderKanban',
    category: 'preview.contentTypes.category.dynamicData',
  },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
    excerpt: f.string().type('Textarea').optional(),
    featured: f.boolean().optional(),
    category: f.relation(Category, 'existing').required(),
    categories: f.relation(Category, 'existing').optional().multiple(),
    image: f.file().type('Image').required(),
    images: f.file().type('Image').optional().multiple(),
  },
  iterator: [
    {
      contentType: ProjectHeader,
      type: 'new',
    },
    {
      contentType: StructuredData,
      type: 'new',
    },
  ],
  uniques: [['slug']],
  listFields: ['title', 'slug', 'featured', 'category.title'],
})

export const FeatureCarouselItem = new ContentType({
  name: 'FeatureCarouselItem',
  fields: {
    title: f.string().required(),
    summary: f.string().type('Textarea').optional(),
    href: f.string().optional(),
  },
}).hideFromManager()

export const FeatureCarousel = new ContentType({
  name: 'FeatureCarousel',
  menu: {
    title: 'preview.contentTypes.featureCarousel.menu',
    icon: 'GalleryHorizontalEnd',
    category: 'preview.contentTypes.category.dynamicData',
  },
  modulePicker: {
    preview: '/dynamic-data/aurora.svg',
  },
  fields: {
    eyebrow: f.string().optional(),
    title: f.string().required(),
    items: f.blocks([
      {
        name: FeatureCarouselItem.name,
        field: f.relation(FeatureCarouselItem, 'new').required(),
      },
    ]),
  },
  listFields: ['title', 'eyebrow'],
})

export const CategoriesGalleryItemImage = new ContentType({
  name: 'CategoriesGalleryItemImage',
  fields: {
    href: f.link().required(),
    title: f.string().required(),
    image: f.file().type('Image').required(),
  },
}).hideFromManager()

export const CategoriesGalleryItem = new ContentType({
  name: 'CategoriesGalleryItem',
  fields: {
    title: f.string().required(),
    href: f.link().required(),
    images: f
      .blocks([
        {
          name: CategoriesGalleryItemImage.name,
          field: f.relation(CategoriesGalleryItemImage, 'new').required(),
        },
      ])
      .required(),
  },
}).hideFromManager()

export const CategoriesGallery = new ContentType({
  name: 'CategoriesGallery',
  menu: {
    title: 'preview.contentTypes.categoriesGallery.menu',
    icon: 'Images',
    category: 'preview.contentTypes.category.dynamicData',
  },
  fields: {
    eyebrow: f.string().optional(),
    title: f.string().required(),
    items: f.blocks([
      {
        name: CategoriesGalleryItem.name,
        field: f.relation(CategoriesGalleryItem, 'new').required(),
      },
    ]),
  },
  listFields: ['title', 'eyebrow'],
})

export const PreviewPage = new ContentType({
  name: 'Page',
  permissions: 'Page',
  fields: {
    title: f.string().translatable().required(),
    slug: f.string().type('Slug').required().translatable(),
  },
  iterator: [
    {
      contentType: HelloWorld,
      type: 'new',
    },
    {
      contentType: FeatureCarousel,
      type: 'new',
    },
    {
      contentType: CategoriesGallery,
      type: 'new',
    },
    {
      contentType: StructuredData,
      type: 'new',
    },
  ],
  menu: {
    title: 'preview.contentTypes.page.menu',
  },
  listFields: ['title', 'slug'],
  uniques: [['slug']],
  versioning: {
    maxVersions: 5,
  },
})

export const Author = new ContentType({
  name: 'Author',
  menu: {
    title: 'preview.contentTypes.author.menu',
    icon: 'user-round',
    category: 'preview.contentTypes.category.editorial',
  },
  fields: {
    name: f.string().required(),
    email: f.string().type('Email').optional(),
    bio: f.string().type('Textarea').optional(),
  },
  listFields: ['name', 'email'],
})

export const Article = new ContentType({
  name: 'Article',
  menu: {
    title: 'preview.contentTypes.article.menu',
    icon: 'newspaper',
    category: 'preview.contentTypes.category.editorial',
  },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
    excerpt: f.string().type('Textarea').optional(),
    published: f.boolean().optional(),
    author: f.relation(Author).optional(),
    body: f.string().type('RichText').optional(),
    tags: f.array(f.string()).min(1).max(5).optional(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'published', 'author.name'],
})

export const RelationLevel3 = new ContentType({
  name: 'RelationLevel3',
  fields: {
    title: f.string().required(),
    existingArticle: f.relation(Article, 'existing').optional(),
    flexibleArticle: f.relation(Article).optional(),
    authors: f.relation(Author, 'existing').optional().multiple(),
  },
  listFields: ['title', 'existingArticle.title', 'flexibleArticle.title'],
}).hideFromManager()

export const RelationLevel2 = new ContentType({
  name: 'RelationLevel2',
  menu: {
    title: 'preview.contentTypes.relationLevel2.menu',
    icon: 'PanelsTopLeft',
    category: 'preview.contentTypes.category.development',
  },
  fields: {
    title: f.string().required(),
    existingArticle: f.relation(Article, 'existing').required(),
    flexibleArticle: f.relation(Article).optional(),
    existingArticles: f.relation(Article, 'existing').optional().multiple(),
    self: f.selfRelation().optional(),
    inlineItems: f.relation(RelationLevel3, 'new').optional().multiple(),
  },
  listFields: ['title', 'existingArticle.title', 'flexibleArticle.title'],
})

export const RelationPlayground = new ContentType({
  name: 'RelationPlayground',
  menu: {
    title: 'preview.contentTypes.relationPlayground.menu',
    icon: 'Network',
    category: 'preview.contentTypes.category.development',
  },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
    existingAuthor: f.relation(Author, 'existing').required(),
    flexibleArticle: f.relation(Article).optional(),
    existingLevel2: f.relation(RelationLevel2, 'existing').optional(),
    existingLevel2List: f.relation(RelationLevel2, 'existing').optional().multiple(),
    inlineLevel3: f.relation(RelationLevel3, 'new').optional(),
    sections: f.blocks([
      {
        name: 'level2',
        field: f.relation(RelationLevel2, 'existing'),
      },
      {
        name: 'article',
        field: f.relation(Article, 'existing'),
      },
      {
        name: 'level3',
        field: f.relation(RelationLevel3, 'new'),
      },
    ]).optional(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'existingAuthor.name', 'existingLevel2.title'],
})

export const ImagePlayground = new ContentType({
  name: 'ImagePlayground',
  menu: {
    title: 'preview.contentTypes.imagePlayground.menu',
    icon: 'Images',
    category: 'preview.contentTypes.category.development',
  },
  fields: {
    title: f.string().required(),
    singleImage: f.file().type('Image').optional(),
    multipleImages: f.file().type('Image').optional().multiple(),
  },
  listFields: ['title'],
})

export const DatePlayground = new ContentType({
  name: 'DatePlayground',
  menu: {
    title: 'preview.contentTypes.datePlayground.menu',
    icon: 'CalendarClock',
    category: 'preview.contentTypes.category.development',
  },
  fields: {
    title: f.string().required(),
    date: f.date().type('Date').optional(),
    dateTime: f.date().type('DateTime').optional(),
    time: f.date().type('Time').optional(),
  },
  listFields: ['title', 'date', 'dateTime', 'time'],
})

export const ConditionalDemo = new ContentType({
  name: 'ConditionalDemo',
  menu: {
    title: 'preview.contentTypes.conditionalDemo.menu',
    icon: 'ListChecks',
    category: 'preview.contentTypes.category.development',
  },
  fields: {
    title: f.string().required(),
    intent: f.select(['basic', 'advanced', 'experimental'] as const).required(),
    advancedEnabled: f.boolean().condition({
      field: 'intent',
      equals: 'advanced',
    }).optional(),
    priority: f.number().optional(),
    priorityNotes: f.string().type('Textarea').condition({
      field: 'priority',
      gte: 5,
    }).optional(),
    flags: f
      .select(['featured', 'sponsored', 'archived'] as const)
      .optional()
      .multiple(),
    featuredLabel: f.string().condition({
      field: 'flags',
      includes: 'featured',
    }).optional(),
    multiFlagSummary: f
      .string()
      .type('Textarea')
      .condition({
        field: 'flags',
        length: { gte: 2 },
      })
      .optional(),
  },
  listFields: ['title', 'intent', 'priority'],
})

export const TranslationPlayground = new ContentType({
  name: 'TranslationPlayground',
  menu: {
    title: 'preview.contentTypes.translationPlayground.menu',
    icon: 'Languages',
    category: 'preview.contentTypes.category.development',
  },
  fields: {
    title: f.string().required().translatable(),
    slug: f.string().type('Slug').required().translatable(),
    subtitle: f.string().translatable().optional(),
    excerpt: f.string().type('Textarea').translatable().optional(),
    body: f.string().type('RichText').translatable().optional(),
    callToActionLabel: f.string().translatable().optional(),
    callToActionUrl: f.string().type('Url').translatable().optional(),
    metaTitle: f.string().translatable().optional(),
    metaDescription: f.string().type('Textarea').translatable().optional(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'subtitle'],
})

export const previewContentTypes = [
  Header,
  Footer,
  PageSection,
  UseCaseContent,
  UseCaseHero,
  UseCaseLayoutWithInfo,
  UseCaseNewsletter,
  UseCase,
  Category,
  Project,
  FeatureCarouselItem,
  FeatureCarousel,
  CategoriesGalleryItemImage,
  CategoriesGalleryItem,
  CategoriesGallery,
  Author,
  Article,
  RelationLevel3,
  RelationLevel2,
  RelationPlayground,
  ImagePlayground,
  DatePlayground,
  ConditionalDemo,
  TranslationPlayground,
  ProjectHeader,
]

export const keyedContentTypes = {
  Header,
  Footer,
  PageSection,
  UseCaseContent,
  UseCaseHero,
  UseCaseLayoutWithInfo,
  UseCaseNewsletter,
  UseCase,
  Category,
  Project,
  FeatureCarouselItem,
  FeatureCarousel,
  CategoriesGalleryItemImage,
  CategoriesGalleryItem,
  CategoriesGallery,
  Author,
  Article,
  RelationLevel3,
  RelationLevel2,
  RelationPlayground,
  ImagePlayground,
  DatePlayground,
  ConditionalDemo,
  TranslationPlayground,
}

export type Props<T extends keyof typeof keyedContentTypes> = DataFront<
  (typeof keyedContentTypes)[T]
>
