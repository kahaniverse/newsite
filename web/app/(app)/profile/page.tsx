import { redirect }   from 'next/navigation';
import Link            from 'next/link';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { FormDialog }  from '@/components/shell/FormDialog';
import { CompositeScreen } from '@/components/screens/CompositeScreen';
import { HeroBlock }   from '@/components/screens/HeroBlock';
import { auth }        from '@/lib/auth/config';
import { getAuthorById } from '@/lib/db/queries/authors';
import { sampleAvatar } from '@/lib/sample-images';
import { ProfileActions } from '@/components/auth/ProfileActions';
import { PersonaToggle } from '@/components/shell/PersonaToggle';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/profile');

  const author = await getAuthorById(session.user.id);
  if (!author) redirect('/login');

  const photo = author.avatarImage || sampleAvatar(author.id, 480);

  // Follower / love counts overlaid on the hero, shared by both layouts.
  const stats = (
    <div className="flex gap-5 text-sm text-white/85 pt-0.5">
      <span><strong className="text-white">{author.followCount.toLocaleString()}</strong> followers</span>
      <span><strong className="text-white">{author.loveCount.toLocaleString()}</strong> loves</span>
    </div>
  );

  // Action buttons, reading-mode toggle, and account actions — shared body
  // rendered below the hero in both the modal and the narrow shell.
  const body = (
    <>
      <div className="flex gap-2">
        <Link
          href="/profile/edit"
          className="flex-1 inline-flex items-center justify-center h-11 px-5 rounded-full border border-border text-text-primary font-medium text-sm hover:border-accent hover:text-accent transition-colors"
        >
          Edit Profile
        </Link>
        <Link href="/universes/new" className="flex-1 btn-pill btn-pill-primary !text-sm">
          + New Universe
        </Link>
      </div>
      <section aria-label="Reading mode" className="pt-1">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Reading mode</h2>
        <PersonaToggle variant="full" />
      </section>
      <ProfileActions />
    </>
  );

  return (
    <>
      {/* Horizontal (tablet + desktop): keep the cascading panel frame mounted
          underneath so the screen stays in horizontal layout, with the profile
          shown as a modal over it. Dismiss (backdrop / ✕ / Esc) goes back. */}
      <div className="hidden md:block">
        <HorizontalBrowse session={session} />
        <FormDialog title="Profile">
          <div className="flex flex-col gap-5">
            <HeroBlock image={photo} aspect="16/9" title={author.displayName} synopsis={author.bio} meta={stats} />
            {body}
          </div>
        </FormDialog>
      </div>

      {/* Narrow (mobile): full-screen shell with bottom nav. */}
      <div className="block md:hidden">
        <NarrowShell title="Profile">
          <CompositeScreen
            hero={<HeroBlock image={photo} aspect="4/3" title={author.displayName} synopsis={author.bio} meta={stats} />}
          >
            {body}
          </CompositeScreen>
        </NarrowShell>
      </div>
    </>
  );
}
