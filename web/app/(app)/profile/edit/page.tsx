import { redirect }   from 'next/navigation';
import { NarrowShell } from '@/components/shell/NarrowShell';
import { HorizontalBrowse } from '@/components/shell/HorizontalBrowse';
import { FormDialog }  from '@/components/shell/FormDialog';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { auth }        from '@/lib/auth/config';
import { getAuthorById } from '@/lib/db/queries/authors';

export default async function EditProfilePage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/profile/edit');

  const author = await getAuthorById(session.user.id);
  if (!author) redirect('/login');

  return (
    <>
      {/* Horizontal (tablet + desktop): panel frame underneath, modal over it. */}
      <div className="hidden md:block">
        <HorizontalBrowse session={session} />
        <FormDialog title="Edit Profile">
          <ProfileForm author={author} />
        </FormDialog>
      </div>

      {/* Narrow (mobile): full-screen shell with bottom nav. */}
      <div className="block md:hidden">
        <NarrowShell title="Edit Profile">
          <div className="max-w-md mx-auto py-6 px-2">
            <ProfileForm author={author} />
          </div>
        </NarrowShell>
      </div>
    </>
  );
}
