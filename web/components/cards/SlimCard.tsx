import Link from 'next/link';
import { AvatarImage } from '@/components/ui/AvatarImage';
import type { Author } from '@/lib/types';

interface Props { author: Author; }

export function SlimCard({ author }: Props) {
  return (
    <Link
      href={`/authors/${author.id}`}
      className="flex items-center gap-3 p-3 paper-card hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-shadow"
      aria-label={`Author: ${author.displayName}`}
    >
      <AvatarImage src={author.avatarImage} alt={author.displayName} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-paper-ink truncate">{author.displayName}</p>
        <p className="text-xs text-paper-muted">{author.followCount.toLocaleString()} followers</p>
      </div>
      <span className="btn-pill btn-pill-primary !h-8 !px-4 !text-xs shrink-0">Follow</span>
    </Link>
  );
}
