type HeaderProps = {
  brand?: string;
  primaryLinkLabel?: string;
  primaryLinkHref?: string;
};

export default function Header({
  brand = "Rakun Preview",
  primaryLinkLabel = "Backend",
  primaryLinkHref = "/backend",
}: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <span className="text-lg font-semibold text-zinc-950">{brand}</span>
        <a className="text-sm font-medium text-zinc-700" href={primaryLinkHref}>
          {primaryLinkLabel}
        </a>
      </div>
    </header>
  );
}
