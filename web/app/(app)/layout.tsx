import { QueryProvider } from '@/components/providers/QueryProvider';

// Shell is rendered per-page to allow server components to pass data.
// This layout just provides the React Query context.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
