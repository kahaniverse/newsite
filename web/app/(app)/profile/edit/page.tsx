import { redirect }   from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { auth }        from '@/lib/auth/config';
import { getAuthorById } from '@/lib/db/queries/authors';

export default async function EditProfilePage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/profile/edit');

  const author = await getAuthorById(session.user.id);
  if (!author) redirect('/login');

  return (
    <NarrowShell>
      <div className="max-w-xl mx-auto py-6 px-2">
        <ProfileForm author={author} />
      </div>
    </NarrowShell>
  );
}
