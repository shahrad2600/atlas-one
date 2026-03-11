'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number;
  className?: string;
}

export function StatCard({ icon, label, value, change, className }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'bg-white rounded-lg border border-slate-200 shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-shrink-0 p-2 bg-brand-50 rounded-lg text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          {icon}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400',
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}
