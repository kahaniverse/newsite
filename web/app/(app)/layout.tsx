import { QueryProvider } from '@/components/providers/QueryProvider';
import { LayoutSync } from '@/components/shell/LayoutSync';

// Shell is rendered per-page to allow server components to pass data.
// This layout provides the React Query context and the layout-sync bridge that
// keeps the horizontal and narrow shells on the same screen across rotation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <LayoutSync />
      {children}
    </QueryProvider>
  );
}
