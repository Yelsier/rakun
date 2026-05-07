type FooterProps = {
  brand?: string;
  copyright?: string;
  primaryLinkLabel?: string;
  primaryLinkHref?: string;
};

export default function Footer({
  brand = "Rakun Preview",
  copyright = "2026 Rakun Preview",
  primaryLinkLabel = "Docs",
  primaryLinkHref = "/backend/settings/routes",
}: FooterProps) {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-6 text-sm text-zinc-600">
        <span>{copyright || brand}</span>
        <a className="font-medium text-zinc-800" href={primaryLinkHref}>
          {primaryLinkLabel}
        </a>
      </div>
    </footer>
  );
}
