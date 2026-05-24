import Image from 'next/image';

interface Props {
  src:       string;
  alt:       string;
  aspect?:   '16/9' | '4/3' | '1/1';
  priority?: boolean;
  className?: string;
}

const BLOB_BASE = process.env.NEXT_PUBLIC_BLOB_BASE_URL ?? '';

function isKnownDomain(src: string) {
  return (
    src.includes('vercel-storage.com') ||
    src.includes('googleusercontent.com') ||
    src.includes('twimg.com') ||
    src.includes('instagram.com') ||
    (BLOB_BASE && src.startsWith(BLOB_BASE))
  );
}

export function CoverImage({ src, alt, aspect = '16/9', priority = false, className = '' }: Props) {
  const [w, h] = aspect.split('/').map(Number);
  const paddingPct = ((h / w) * 100).toFixed(2);

  return (
    <div className={`relative overflow-hidden rounded-card bg-bg-elevated ${className}`} style={{ paddingBottom: `${paddingPct}%` }}>
      {isKnownDomain(src) ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover"
          sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}
