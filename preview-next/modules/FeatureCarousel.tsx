type RawCarouselItem =
  | {
      value?: unknown;
    }
  | Record<string, unknown>;

type FeatureCarouselProps = {
  eyebrow?: string;
  title?: string;
  items?: RawCarouselItem[];
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const unwrapItem = (item: RawCarouselItem) => {
  const record = asRecord(item);
  const value = asRecord(record.value);
  const data = asRecord(value.data);

  return Object.keys(data).length > 0
    ? data
    : Object.keys(value).length > 0
      ? value
      : record;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

export default function FeatureCarousel({
  eyebrow = "Dynamic data",
  title = "Feature carousel",
  items = [],
}: FeatureCarouselProps) {
  const resolvedItems = items.map(unwrapItem);

  return (
    <section className="border-y border-zinc-200 bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-normal text-emerald-300">
            {eyebrow}
          </span>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-normal">
            {title}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {resolvedItems.map((item, index) => {
            const href = text(item.href);
            const content = (
              <div className="flex min-h-48 flex-col justify-between rounded-lg border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10">
                <div className="space-y-3">
                  <span className="text-xs font-medium text-zinc-400">
                    Project {index + 1}
                  </span>
                  <h3 className="text-xl font-semibold">{text(item.title)}</h3>
                  <p className="text-sm leading-6 text-zinc-300">
                    {text(item.summary)}
                  </p>
                </div>
                {href ? (
                  <span className="mt-6 text-sm font-semibold text-emerald-300">
                    {href}
                  </span>
                ) : null}
              </div>
            );

            return href ? (
              <a key={`${href}-${index}`} href={href}>
                {content}
              </a>
            ) : (
              <div key={index}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
