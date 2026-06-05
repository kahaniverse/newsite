import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

// One QueryClient per server request (deduped by React.cache), used by server
// components to prefetch/seed queries and hand a dehydrated cache to the client
// via <HydrationBoundary>. This lets the browser reuse data the server already
// fetched instead of re-firing the same request on mount.
export const getServerQueryClient = cache(() => new QueryClient());
