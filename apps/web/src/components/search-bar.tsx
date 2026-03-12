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
        'bg-[#FDF5E6]/95 dark:bg-[#2C1810]/95 backdrop-blur-lg',
        'rounded-xl shadow-vintage p-2',
        'border-2 border-brand-400/30 dark:border-brand-600/30',
        className,
      )}
    >
      <div className="flex items-center gap-2 flex-1 px-3 py-2">
        <Search className="h-5 w-5 text-brand-500/60 dark:text-brand-400/60 shrink-0" />
        <input
          type="text"
          placeholder="Where shall we take you?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[#3C2415] dark:text-[#F5E6D3] placeholder:text-[#3C2415]/40 dark:placeholder:text-[#F5E6D3]/40 focus:outline-none text-sm"
        />
      </div>
      <div className="hidden sm:block w-px h-8 bg-brand-300/30 dark:bg-brand-600/30" />
      <div className="flex items-center gap-2 px-3 py-2">
        <Calendar className="h-5 w-5 text-brand-500/60 dark:text-brand-400/60 shrink-0" />
        <input
          type="text"
          placeholder="Depart - Return"
          className="w-40 bg-transparent text-[#3C2415] dark:text-[#F5E6D3] placeholder:text-[#3C2415]/40 dark:placeholder:text-[#F5E6D3]/40 focus:outline-none text-sm"
        />
      </div>
      <div className="hidden sm:block w-px h-8 bg-brand-300/30 dark:bg-brand-600/30" />
      <div className="flex items-center gap-2 px-3 py-2">
        <Users className="h-5 w-5 text-brand-500/60 dark:text-brand-400/60 shrink-0" />
        <input
          type="text"
          placeholder="Travelers"
          className="w-24 bg-transparent text-[#3C2415] dark:text-[#F5E6D3] placeholder:text-[#3C2415]/40 dark:placeholder:text-[#F5E6D3]/40 focus:outline-none text-sm"
        />
      </div>
      <Button type="submit" size="lg" className="shrink-0 rounded-xl">
        Search
      </Button>
    </form>
  );
}

export { SearchBar };
