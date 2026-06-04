import { sampleAvatar } from '@/lib/sample-images';

interface Props { src?: string; alt: string; size?: number; }

export function AvatarImage({ src, alt, size = 32 }: Props) {
  // Fall back to a deterministic sample portrait so the app shows the
  // old-app "picture everywhere" look until real avatars are uploaded.
  const resolved = src || sampleAvatar(alt || 'kahaniverse', Math.max(size * 2, 96));

  return (
    <img
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-full object-cover bg-bg-elevated"
      style={{ width: size, height: size }}
    />
  );
}
