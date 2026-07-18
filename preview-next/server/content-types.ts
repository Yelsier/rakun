import { ContentType, Fields } from '@rakun-kit/next'
import { HelloWorld } from '@rakun-kit/next/internal-content-types'

export const Header = new ContentType({
  name: 'Header',
  menu: {
    title: 'Headers',
    icon: 'PanelTop',
    category: 'Layout',
  },
  fields: {
    brand: Fields.string().required(),
    primaryLinkLabel: Fields.string(),
    primaryLinkHref: Fields.string().type('Url'),
    internalLinkLabel: Fields.string(),
    internalLink: Fields.link(),
  },
  listFields: ['brand', 'primaryLinkLabel', 'internalLinkLabel'],
})

export const Footer = new ContentType({
  name: 'Footer',
  menu: {
    title: 'Footers',
    icon: 'panel-bottom',
    category: 'Layout',
  },
  fields: {
    brand: Fields.string().required(),
    copyright: Fields.string(),
    primaryLinkLabel: Fields.string(),
    primaryLinkHref: Fields.string().type('Url'),
    internalLinkLabel: Fields.string(),
    internalLink: Fields.link(),
  },
  listFields: ['brand', 'copyright', 'internalLinkLabel'],
})

export const PageSection = new ContentType({
  name: 'PageSection',
  menu: {
    title: 'Page sections',
    icon: 'LayoutTemplate',
    category: 'Blocks',
  },
  fields: {
    title: Fields.string().required().translatable(),
    body: Fields.string().type('RichText').translatable(),
  },
  listFields: ['title'],
})

export const Project = new ContentType({
  name: 'Project',
  dynamicDataSource: true,
  menu: {
    title: 'Projects',
    icon: 'FolderKanban',
    category: 'Dynamic data',
  },
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type('Slug').required(),
    excerpt: Fields.string().type('Textarea'),
    featured: Fields.boolean(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'featured'],
})

export const FeatureCarouselItem = new ContentType({
  name: 'FeatureCarouselItem',
  fields: {
    title: Fields.string().required(),
    summary: Fields.string().type('Textarea'),
    href: Fields.string(),
  },
}).hideFromManager()

export const FeatureCarousel = new ContentType({
  name: 'FeatureCarousel',
  menu: {
    title: 'Feature carousels',
    icon: 'GalleryHorizontalEnd',
    category: 'Dynamic data',
  },
  fields: {
    eyebrow: Fields.string(),
    title: Fields.string().required(),
    items: Fields.blocks([
      {
        name: FeatureCarouselItem.name,
        field: Fields.relation(FeatureCarouselItem, 'new'),
      },
    ]),
  },
  listFields: ['title', 'eyebrow'],
})

export const PreviewPage = new ContentType({
  name: 'Page',
  permissions: 'Route',
  fields: {
    title: Fields.string().translatable().required(),
    slug: Fields.string().type('Slug').required().translatable(),
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
  ],
  menu: {
    title: 'Pages',
  },
  listFields: ['title', 'slug'],
  uniques: [['slug']],
  versioning: {
    maxVersions: 5,
  },
  comments: true,
})

export const Author = new ContentType({
  name: 'Author',
  menu: {
    title: 'Authors',
    icon: 'user-round',
    category: 'Editorial',
  },
  fields: {
    name: Fields.string().required(),
    email: Fields.string().type('Email'),
    bio: Fields.string().type('Textarea'),
  },
  listFields: ['name', 'email'],
})

export const Article = new ContentType({
  name: 'Article',
  menu: {
    title: 'Articles',
    icon: 'newspaper',
    category: 'Editorial',
  },
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type('Slug').required(),
    excerpt: Fields.string().type('Textarea'),
    published: Fields.boolean(),
    author: Fields.relation(Author),
    body: Fields.string().type('RichText'),
    tags: Fields.array(Fields.string()),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'published', 'author.name'],
})

export const RelationLevel3 = new ContentType({
  name: 'RelationLevel3',
  fields: {
    title: Fields.string().required(),
    existingArticle: Fields.relation(Article, 'existing'),
    flexibleArticle: Fields.relation(Article),
    authors: Fields.relation(Author, 'existing').multiple(),
  },
  listFields: ['title', 'existingArticle.title', 'flexibleArticle.title'],
}).hideFromManager()

export const RelationLevel2 = new ContentType({
  name: 'RelationLevel2',
  menu: {
    title: 'Relations level 2',
    icon: 'PanelsTopLeft',
    category: 'Development',
  },
  fields: {
    title: Fields.string().required(),
    existingArticle: Fields.relation(Article, 'existing').required(),
    flexibleArticle: Fields.relation(Article),
    existingArticles: Fields.relation(Article, 'existing').multiple(),
    self: Fields.selfRelation(),
    inlineItems: Fields.relation(RelationLevel3, 'new').multiple(),
  },
  listFields: ['title', 'existingArticle.title', 'flexibleArticle.title'],
})

export const RelationPlayground = new ContentType({
  name: 'RelationPlayground',
  menu: {
    title: 'Relations playground',
    icon: 'Network',
    category: 'Development',
  },
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type('Slug').required(),
    existingAuthor: Fields.relation(Author, 'existing').required(),
    flexibleArticle: Fields.relation(Article),
    existingLevel2: Fields.relation(RelationLevel2, 'existing'),
    existingLevel2List: Fields.relation(RelationLevel2, 'existing').multiple(),
    inlineLevel3: Fields.relation(RelationLevel3, 'new'),
    sections: Fields.blocks([
      {
        name: 'level2',
        field: Fields.relation(RelationLevel2, 'existing'),
      },
      {
        name: 'article',
        field: Fields.relation(Article, 'existing'),
      },
      {
        name: 'level3',
        field: Fields.relation(RelationLevel3, 'new'),
      },
    ]),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'existingAuthor.name', 'existingLevel2.title'],
})

export const ImagePlayground = new ContentType({
  name: 'ImagePlayground',
  menu: {
    title: 'Images playground',
    icon: 'Images',
    category: 'Development',
  },
  fields: {
    title: Fields.string().required(),
    singleImage: Fields.file().type('Image'),
    multipleImages: Fields.file().type('Image').multiple(),
  },
  listFields: ['title'],
})

export const ConditionalDemo = new ContentType({
  name: 'ConditionalDemo',
  menu: {
    title: 'Conditional demos',
    icon: 'ListChecks',
    category: 'Development',
  },
  fields: {
    title: Fields.string().required(),
    intent: Fields.select(['basic', 'advanced', 'experimental'] as const).required(),
    advancedEnabled: Fields.boolean().condition({
      field: 'intent',
      equals: 'advanced',
    }),
    priority: Fields.number(),
    priorityNotes: Fields.string().type('Textarea').condition({
      field: 'priority',
      gte: 5,
    }),
    flags: Fields.select(['featured', 'sponsored', 'archived'] as const).multiple(),
    featuredLabel: Fields.string().condition({
      field: 'flags',
      includes: 'featured',
    }),
    multiFlagSummary: Fields.string()
      .type('Textarea')
      .condition({
        field: 'flags',
        length: { gte: 2 },
      }),
  },
  listFields: ['title', 'intent', 'priority'],
})

export const TranslationPlayground = new ContentType({
  name: 'TranslationPlayground',
  menu: {
    title: 'Translation playground',
    icon: 'Languages',
    category: 'Development',
  },
  fields: {
    title: Fields.string().required().translatable(),
    slug: Fields.string().type('Slug').required().translatable(),
    subtitle: Fields.string().translatable(),
    excerpt: Fields.string().type('Textarea').translatable(),
    body: Fields.string().type('RichText').translatable(),
    callToActionLabel: Fields.string().translatable(),
    callToActionUrl: Fields.string().type('Url').translatable(),
    metaTitle: Fields.string().translatable(),
    metaDescription: Fields.string().type('Textarea').translatable(),
  },
  uniques: [['slug']],
  listFields: ['title', 'slug', 'subtitle'],
})

export const previewContentTypes = [
  Header,
  Footer,
  PageSection,
  Project,
  FeatureCarouselItem,
  FeatureCarousel,
  Author,
  Article,
  RelationLevel3,
  RelationLevel2,
  RelationPlayground,
  ImagePlayground,
  ConditionalDemo,
  TranslationPlayground,
]
