'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  animated?: boolean;
}

function Card({ className, animated, ...props }: CardProps) {
  if (animated) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgb(0 0 0 / 0.1)' }}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm',
          className,
        )}
        {...(props as HTMLMotionProps<'div'>)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pb-6 pt-0 flex items-center', className)} {...props} />
  );
}

export { Card, CardHeader, CardContent, CardFooter };
