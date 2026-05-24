import { redirect }   from 'next/navigation';
import Link            from 'next/link';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { auth }        from '@/lib/auth/config';
import { getAuthorById } from '@/lib/db/queries/authors';

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/profile');

  const author = await getAuthorById(session.user.id);
  if (!author) redirect('/login');

  return (
    <NarrowShell>
      <div className="max-w-xl mx-auto py-6 flex flex-col gap-6">
        <section className="flex items-start gap-4">
          <AvatarImage src={author.avatarImage} alt={author.displayName} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold text-text-primary">{author.displayName}</h1>
            {author.bio && <p className="text-sm text-text-muted mt-1 leading-relaxed">{author.bio}</p>}
            <div className="flex gap-4 mt-2 text-xs text-text-muted">
              <span>{author.followCount.toLocaleString()} followers</span>
              <span>{author.loveCount.toLocaleString()} loves</span>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <Link href="/profile/edit"
            className="w-full text-center border border-border text-text-primary hover:border-accent hover:text-accent py-2.5 rounded-btn text-sm transition-colors">
            Edit Profile
          </Link>
          <Link href="/universes/new"
            className="w-full text-center bg-accent hover:bg-accent-light text-white py-2.5 rounded-btn text-sm transition-colors font-semibold">
            + New Universe
          </Link>
        </div>
      </div>
    </NarrowShell>
  );
}
