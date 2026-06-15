import type { Session } from 'next-auth';
import type { Universe } from '@/lib/types';
import { auth } from '@/lib/auth/config';
import { NavRail } from '@/components/shell/NavRail';
import { ScrollColumn }      from '@/components/shell/ScrollColumn';
import { BrowseColumn }      from '@/components/shell/BrowseColumn';
import { EntityDetailPanel } from '@/components/panels/EntityDetailPanel';
import { LeafColumn }        from '@/components/shell/LeafColumn';
import { ToastContainer } from '@/components/ui/Toast';

interface Props {
  session?:          Session | null;
  initialUniverses?: Universe[];
  /** Let the browse carousel seed the detail panel. True on the home route;
   *  false on deep-linked routes where <HydrateSelection> drives selection. */
  seedCarousel?:     boolean;
}

// The horizontal (tablet + desktop) app frame: a far-left nav strip followed by
// equal-width cascading panels. Tablet shows two panels (browse → detail);
// desktop adds the third (detail → leaf). Selection flows left→right through the
// panel store, so every browse route shares this same frame — deep links just
// pre-select via <HydrateSelection>, which keeps the desktop screen from going
// blank the way the old narrow-only routes did.
export async function HorizontalBrowse({ session: sessionProp, initialUniverses, seedCarousel = false }: Props) {
  const session = sessionProp === undefined ? await auth() : sessionProp;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <NavRail session={session} />

      {/* Panel 1 — browse list, or the focused entity's hero once drilled in */}
      <ScrollColumn label="Browse" className="border-r border-border">
        <BrowseColumn initialUniverses={initialUniverses} autoSeed={seedCarousel} />
      </ScrollColumn>

      {/* Panel 2 — body of the panel-1 selection (hero handed to panel 1 when focused) */}
      <ScrollColumn label="Selection detail" className="border-r border-border">
        <EntityDetailPanel />
      </ScrollColumn>

      {/* Panel 3 — linked to the panel-2 selection (desktop only), or the inline
          story/page create form when a compose flow is active */}
      <LeafColumn />

      <ToastContainer />
    </div>
  );
}
