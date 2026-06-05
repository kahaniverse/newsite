import { NarrowShell }   from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { HydrateSelection } from '@/components/shell/HydrateSelection';
import { DiscoverPanel } from './DiscoverPanel';

export default function DiscoverPage() {
  return (
    <>
      {/* Browse root: clear any focused-takeover hero from a prior route. */}
      <HydrateSelection focus={false} />

      {/* Horizontal cascading panels (tablet + desktop) */}
      <div className="hidden md:block">
        <HorizontalBrowse />
      </div>

      {/* Narrow stacked layout (mobile) */}
      <div className="block md:hidden">
        <NarrowShell title="Discover">
          <DiscoverPanel />
        </NarrowShell>
      </div>
    </>
  );
}
