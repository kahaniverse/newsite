import { AvatarImage } from '@/components/ui/AvatarImage';
import type { Author } from '@/lib/types';

interface Props {
  author:    Author;
  onClick?:  () => void;
  selected?: boolean;
}

export function SquareCard({ author, onClick, selected = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Author: ${author.displayName}`}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-2 p-3 bg-bg-card rounded-card border transition-colors text-center ${
        selected
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-border hover:border-accent'
      }`}
    >
      <AvatarImage src={author.avatarImage} alt={author.displayName} size={56} />
      <span className="text-xs font-medium text-text-primary line-clamp-1 w-full">{author.displayName}</span>
      <span className="text-xs text-text-muted">{author.followCount.toLocaleString()} followers</span>
    </button>
  );
}
