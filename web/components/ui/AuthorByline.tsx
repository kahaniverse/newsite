import Link from 'next/link';
import { AvatarImage } from './AvatarImage';
import type { AuthorSummary } from '@/lib/types';

interface Props {
  author:    AuthorSummary;
  size?:     'sm' | 'md';
  showName?: boolean;
}

export function AuthorByline({ author, size = 'sm', showName = true }: Props) {
  const dim = size === 'sm' ? 24 : 32;
  return (
    <Link
      href={`/authors/${author.id}`}
      className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
      aria-label={`Author: ${author.displayName}`}
    >
      <AvatarImage src={author.avatarImage} alt={author.displayName} size={dim} />
      {showName && (
        <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{author.displayName}</span>
      )}
    </Link>
  );
}
