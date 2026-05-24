interface Props { src?: string; alt: string; size?: number; }

export function AvatarImage({ src, alt, size = 32 }: Props) {
  return src ? (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-full object-cover bg-bg-elevated"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-bg-elevated flex items-center justify-center text-text-muted font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={alt}
    >
      {alt[0]?.toUpperCase()}
    </div>
  );
}
