'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TabContext = createContext<{ active: number; setActive: (i: number) => void }>({
  active: 0,
  setActive: () => {},
});

function TabGroup({
  children,
  defaultIndex = 0,
  className,
}: {
  children: ReactNode;
  defaultIndex?: number;
  className?: string;
}) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <TabContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}

function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex border-b border-slate-200 dark:border-slate-700 gap-0 overflow-x-auto',
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

function Tab({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  const { active, setActive } = useContext(TabContext);
  return (
    <button
      role="tab"
      aria-selected={active === index}
      className={cn(
        'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
        active === index
          ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600',
        className,
      )}
      onClick={() => setActive(index)}
    >
      {children}
    </button>
  );
}

function TabPanel({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  const { active } = useContext(TabContext);
  if (active !== index) return null;
  return (
    <div role="tabpanel" className={cn('pt-6', className)}>
      {children}
    </div>
  );
}

export { TabGroup, TabList, Tab, TabPanel };
