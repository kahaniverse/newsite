import { redirect }   from 'next/navigation';
import Link            from 'next/link';
import { NarrowShell } from '@/components/shell/NarrowShell';
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

  return (
    <NarrowShell title="Profile">
      <CompositeScreen
        hero={
          <HeroBlock
            image={photo}
            aspect="4/3"
            title={author.displayName}
            synopsis={author.bio}
            meta={
              <div className="flex gap-5 text-sm text-white/85 pt-0.5">
                <span><strong className="text-white">{author.followCount.toLocaleString()}</strong> followers</span>
                <span><strong className="text-white">{author.loveCount.toLocaleString()}</strong> loves</span>
              </div>
            }
          />
        }
      >
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
      </CompositeScreen>
    </NarrowShell>
  );
}
