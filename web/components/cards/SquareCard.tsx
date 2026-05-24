import Link from 'next/link';
import { AvatarImage } from '@/components/ui/AvatarImage';
import type { Author } from '@/lib/types';

interface Props { author: Author; }

export function SquareCard({ author }: Props) {
  return (
    <Link
      href={`/authors/${author.id}`}
      className="flex flex-col items-center gap-2 p-3 bg-bg-card rounded-card border border-border hover:border-accent transition-colors text-center"
      aria-label={`Author: ${author.displayName}`}
    >
      <AvatarImage src={author.avatarImage} alt={author.displayName} size={56} />
      <span className="text-xs font-medium text-text-primary line-clamp-1 w-full">{author.displayName}</span>
      <span className="text-xs text-text-muted">{author.followCount.toLocaleString()} followers</span>
    </Link>
  );
}
