import type { ReactNode } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';

export interface ScreenSection {
  title?:  string;
  action?: ReactNode;
  node:    ReactNode;
}

interface Props {
  hero:      ReactNode;
  sections?: ScreenSection[];
  children?: ReactNode;   // extra content (e.g. FABs)
}

// The one screen scaffold the old app used for every detail screen:
// hero section 0, then gradient-headed list sections.
export function CompositeScreen({ hero, sections, children }: Props) {
  return (
    <div className="flex flex-col gap-5 pb-24 max-w-xl mx-auto">
      {/* Hero bleeds up behind the translucent header (matches the old app). */}
      <div className="-mt-[72px]">{hero}</div>
      {sections?.map((s, i) => (
        <section key={i}>
          {s.title && <SectionHeader title={s.title} action={s.action} />}
          {s.node}
        </section>
      ))}
      {children}
    </div>
  );
}
