/* eslint-disable @next/next/no-img-element */

type RawGalleryItem =
  | {
      value?: unknown
    }
  | Record<string, unknown>

type CategoriesGalleryProps = {
  eyebrow?: string
  title?: string
  items?: RawGalleryItem[]
}

type GalleryImage = {
  alt: string
  height?: number
  name: string
  src: string
  width?: number
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const unwrapItem = (item: RawGalleryItem) => {
  const record = asRecord(item)
  const value = asRecord(record.value)
  const data = asRecord(value.data)

  return Object.keys(data).length > 0 ? data : Object.keys(value).length > 0 ? value : record
}

const text = (value: unknown) => {
  if (typeof value === 'string') return value

  const record = asRecord(value)
  const localizedValue = Object.entries(record).find(
    ([key, entry]) => key !== '_tag' && typeof entry === 'string',
  )?.[1]

  return typeof localizedValue === 'string' ? localizedValue : ''
}

const galleryImages = (value: unknown): GalleryImage[] =>
  (Array.isArray(value) ? value : []).flatMap((entry, index) => {
    const image = asRecord(entry)
    const src = text(image.url)

    if (!src) return []

    const name = text(image.name) || `Project image ${index + 1}`

    return [
      {
        alt: text(image.alt) || text(image.title) || name,
        height: typeof image.height === 'number' ? image.height : undefined,
        name,
        src,
        width: typeof image.width === 'number' ? image.width : undefined,
      },
    ]
  })

export default function CategoriesGallery({
  eyebrow = 'Related collection',
  title = 'Projects by category',
  items = [],
}: CategoriesGalleryProps) {
  const categories = items.map(unwrapItem)

  return (
    <section className="bg-stone-100 px-6 py-20 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl space-y-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-orange-700">
            {eyebrow}
          </span>
          <h2 className="text-4xl font-semibold tracking-tight">{title}</h2>
          <p className="text-base leading-7 text-stone-600">
            Each category queries its related projects and flattens their image arrays into one
            gallery.
          </p>
        </div>

        <div className="space-y-16">
          {categories.map((category, categoryIndex) => {
            const href = text(category.href)
            const categoryTitle = text(category.title) || `Category ${categoryIndex + 1}`
            const images = galleryImages(category.images)

            return (
              <article key={`${categoryTitle}-${categoryIndex}`} className="space-y-5">
                <div className="flex items-end justify-between gap-6 border-b border-stone-300 pb-3">
                  <h3 className="text-2xl font-semibold">{categoryTitle}</h3>
                  {href ? (
                    <a className="text-sm font-semibold text-orange-700 hover:text-orange-900" href={href}>
                      View category
                    </a>
                  ) : null}
                </div>

                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {images.map((image, imageIndex) => (
                      <figure
                        key={`${image.src}-${imageIndex}`}
                        className="group overflow-hidden rounded-xl bg-stone-200"
                      >
                        <img
                          alt={image.alt}
                          className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          height={image.height ?? 900}
                          src={image.src}
                          width={image.width ?? 1200}
                        />
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-stone-300 p-6 text-stone-500">
                    No related project images.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
