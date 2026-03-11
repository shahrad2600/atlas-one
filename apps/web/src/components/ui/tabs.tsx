'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TabContextValue {
  active: string;
  setActive: (key: string) => void;
}

const TabContext = createContext<TabContextValue>({
  active: '0',
  setActive: () => {},
});

function TabGroup({
  children,
  defaultIndex = 0,
  defaultTab,
  className,
}: {
  children: ReactNode;
  defaultIndex?: number;
  defaultTab?: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? String(defaultIndex));
  return (
    <TabContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}

function TabList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex border-b border-slate-200 dark:border-slate-700 gap-0 overflow-x-auto',
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
  value,
  className,
}: {
  children: ReactNode;
  index?: number;
  value?: string;
  className?: string;
}) {
  const key = value ?? String(index ?? 0);
  const { active, setActive } = useContext(TabContext);
  const isActive = active === key;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={cn(
        'relative px-4 py-2.5 text-sm font-medium whitespace-nowrap -mb-px transition-colors',
        isActive
          ? 'text-sky-600 dark:text-sky-400'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
        className,
      )}
      onClick={() => setActive(key)}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="tab-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 dark:bg-sky-400"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

function TabPanel({
  children,
  index,
  value,
  className,
}: {
  children: ReactNode;
  index?: number;
  value?: string;
  className?: string;
}) {
  const key = value ?? String(index ?? 0);
  const { active } = useContext(TabContext);
  if (active !== key) return null;
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('pt-6', className)}
    >
      {children}
    </motion.div>
  );
}

export { TabGroup, TabList, Tab, TabPanel };
