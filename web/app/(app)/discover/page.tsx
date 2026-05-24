'use client';
import { useState } from 'react';
import { NarrowShell }  from '@/components/shell/NarrowShell';
import { BrowsePanel }  from '@/components/panels/BrowsePanel';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');

  return (
    <NarrowShell>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="search"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setQuery(input)}
            placeholder="Search universes and stories…"
            className="w-full bg-bg-elevated border border-border rounded-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent pr-10"
            aria-label="Search"
          />
          <button
            onClick={() => setQuery(input)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors"
            aria-label="Search"
          >
            🔍
          </button>
        </div>
        <BrowsePanel searchQuery={query || undefined} />
      </div>
    </NarrowShell>
  );
}
