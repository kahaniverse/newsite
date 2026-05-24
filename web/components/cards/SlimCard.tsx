import Link from 'next/link';
import { AvatarImage } from '@/components/ui/AvatarImage';
import type { Author } from '@/lib/types';

interface Props { author: Author; }

export function SlimCard({ author }: Props) {
  return (
    <Link
      href={`/authors/${author.id}`}
      className="flex items-center gap-3 p-3 bg-bg-card rounded-card border border-border hover:border-accent transition-colors"
      aria-label={`Author: ${author.displayName}`}
    >
      <AvatarImage src={author.avatarImage} alt={author.displayName} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{author.displayName}</p>
        <p className="text-xs text-text-muted">{author.followCount.toLocaleString()} followers</p>
      </div>
      <span className="text-xs text-accent font-medium shrink-0">Follow</span>
    </Link>
  );
}
