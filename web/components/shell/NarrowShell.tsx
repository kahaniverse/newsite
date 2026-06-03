import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/config';
import { ToastContainer } from '@/components/ui/Toast';
import { NarrowNav } from '@/components/shell/NarrowNav';

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

export async function NarrowShell({ children, session: sessionProp }: Props) {
  const session = sessionProp === undefined ? await auth() : sessionProp;

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <NarrowNav session={session} />
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
