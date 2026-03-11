'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center gap-2',
        'bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg',
        'rounded-2xl shadow-elevation-3 p-2',
        'border border-slate-200/50 dark:border-slate-700/50',
        className,
      )}
    >
      <div className="flex items-center gap-2 flex-1 px-3 py-2">
        <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Where are you going?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-sm"
        />
      </div>
      <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-2 px-3 py-2">
        <Calendar className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Check in - Check out"
          className="w-40 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-sm"
        />
      </div>
      <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-2 px-3 py-2">
        <Users className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Guests"
          className="w-20 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-sm"
        />
      </div>
      <Button type="submit" size="lg" className="shrink-0 rounded-xl">
        Search
      </Button>
    </form>
  );
}

export { SearchBar };
