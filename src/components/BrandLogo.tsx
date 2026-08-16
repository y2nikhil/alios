export function BrandLogo({
  size = 36,
  showText = true,
  tagline = "The Digital Campus",
  className = "",
}: {
  size?: number;
  showText?: boolean;
  tagline?: string | null;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/favicon.png"
        alt="ClassLab"
        width={size}
        height={size}
        className="rounded-[10px] shrink-0"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-bold tracking-tight">ClassLab</span>
          {tagline && <span className="block text-[10px] text-muted-foreground">{tagline}</span>}
        </span>
      )}
    </span>
  );
}

/** Small green presence indicator. */
export function OnlineDot({ online, className = "" }: { online?: boolean | null; className?: string }) {
  if (!online) return null;
  return (
    <span
      title="Online now"
      aria-label="Online now"
      className={`inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background ${className}`}
    />
  );
}
