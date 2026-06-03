import { useT } from "@rakun-kit/next/web";

type FooterProps = {
  brand?: string;
  copyright?: string;
  primaryLinkLabel?: string;
  primaryLinkHref?: string;
  internalLinkLabel?: string;
  internalLink?: unknown;
};

export default function Footer({
  brand = "Rakun Preview",
  copyright = "2026 Rakun Preview",
  primaryLinkLabel = "Docs",
  primaryLinkHref = "/backend/settings/routes",
  internalLinkLabel,
  internalLink,
}: FooterProps) {
  const t = useT();
  const internalLinkHref = typeof internalLink === "string" ? internalLink : "";
  const internalLinkPreview =
    typeof internalLink === "string"
      ? internalLink
      : internalLink
        ? JSON.stringify(internalLink)
        : "";
  const internalLinkContent = (
    <>
      <span>{internalLinkLabel || internalLinkPreview}</span>
      <span className="text-xs font-normal text-zinc-500">
        {internalLinkPreview}
      </span>
    </>
  );

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3 text-sm text-zinc-600">
        <div className="flex flex-col">
          <span>{copyright || brand}</span>
          <span className="text-xs text-emerald-700">
            {t({ key: "test.goodbye", values: { name: brand } })}
          </span>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {internalLinkPreview ? (
            internalLinkHref ? (
              <a
                className="flex flex-col items-end font-medium text-emerald-700"
                href={internalLinkHref}
              >
                {internalLinkContent}
              </a>
            ) : (
              <span className="flex flex-col items-end font-medium text-amber-700">
                {internalLinkContent}
              </span>
            )
          ) : null}
          <a className="font-medium text-zinc-800" href={primaryLinkHref}>
            {primaryLinkLabel}
          </a>
        </nav>
      </div>
    </footer>
  );
}
