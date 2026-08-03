import { useT } from "@rakun-kit/next/web";

type FooterProps = {
  brand?: string;
  copyright?: string;
  primaryLinkLabel?: string;
  primaryLinkHref?: string;
  internalLink?: unknown;
};

const readLink = (value: unknown) => {
  if (typeof value === "string") return { href: value, title: "" };
  if (!value || typeof value !== "object") return { href: "", title: "" };

  const link = value as Record<string, unknown>;
  return {
    href: typeof link.href === "string" ? link.href : "",
    title: typeof link.title === "string" ? link.title : "",
  };
};

export default function Footer({
  brand = "Rakun Preview",
  copyright = "2026 Rakun Preview",
  primaryLinkLabel = "Docs",
  primaryLinkHref = "/backend/settings/routes",
  internalLink,
}: FooterProps) {
  const t = useT();
  const { href: internalLinkHref, title: internalLinkTitle } =
    readLink(internalLink);
  const internalLinkContent = (
    <>
      <span>{internalLinkTitle || internalLinkHref}</span>
      <span className="text-xs font-normal text-zinc-500">
        {internalLinkHref}
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
          {internalLinkHref ? (
            <a
              className="flex flex-col items-end font-medium text-emerald-700"
              href={internalLinkHref}
            >
              {internalLinkContent}
            </a>
          ) : null}
          <a className="font-medium text-zinc-800" href={primaryLinkHref}>
            {primaryLinkLabel}
          </a>
        </nav>
      </div>
    </footer>
  );
}
