import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/config';
import { ToastContainer } from '@/components/ui/Toast';
import { NarrowNav } from '@/components/shell/NarrowNav';

interface Props {
  children:  React.ReactNode;
  session?:  Session | null;
  /** Detail screens pass a centred title/subtitle, like the old app bar. */
  title?:    string;
  subtitle?: string;
}

export async function NarrowShell({ children, session: sessionProp, title, subtitle }: Props) {
  const session = sessionProp === undefined ? await auth() : sessionProp;

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <NarrowNav session={session} title={title} subtitle={subtitle} />
      <main className="flex-1 overflow-y-auto p-4 pt-[72px] pb-24">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
