import { TIER_META } from '@/lib/tiers';
import type { AuthorTier } from '@/lib/types';

interface Props {
  tier:       AuthorTier;
  /** Glyph + label (default) or just the glyph (compact tiles). */
  showLabel?: boolean;
  size?:      'xs' | 'sm';
  className?: string;
}

// A small pill that marks an author's earned tier. Presentational only — safe
// to render in server or client components.
export function TierBadge({ tier, showLabel = true, size = 'sm', className = '' }: Props) {
  const meta = TIER_META[tier];
  const pad  = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold leading-none ${pad} ${meta.badgeClass} ${className}`}
      title={`${meta.label} — ${meta.description}`}
      aria-label={`Tier: ${meta.label}`}
    >
      <span aria-hidden>{meta.glyph}</span>
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
