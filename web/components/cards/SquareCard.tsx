import { sampleAvatar } from '@/lib/sample-images';
import type { Author } from '@/lib/types';

interface Props {
  author:    Author;
  onClick?:  () => void;
  selected?: boolean;
}

// The old app's author tile: a plain square portrait with a clipped
// bottom-right corner, no caption.
export function SquareCard({ author, onClick, selected = false }: Props) {
  const img = author.avatarImage || sampleAvatar(author.id, 160);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Author: ${author.displayName}`}
      aria-pressed={selected}
      title={author.displayName}
      className={`block w-[82px] h-[88px] overflow-hidden rounded-br-[6px] shrink-0 transition-shadow ${
        selected
          ? 'ring-2 ring-brand shadow-[0_2px_10px_rgba(0,0,0,0.5)]'
          : 'shadow-md hover:shadow-[0_2px_10px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={author.displayName} loading="lazy" className="w-full h-full object-cover" />
    </button>
  );
}
