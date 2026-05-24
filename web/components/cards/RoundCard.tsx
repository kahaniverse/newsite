import type { Character } from '@/lib/types';

interface Props { character: Character; }

export function RoundCard({ character }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 p-2 text-center shrink-0 w-20">
      <div className="w-14 h-14 rounded-full overflow-hidden bg-bg-elevated border-2 border-border">
        <img
          src={character.image}
          alt={character.name}
          width={56}
          height={56}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-xs text-text-muted leading-tight line-clamp-2">{character.name}</span>
    </div>
  );
}
