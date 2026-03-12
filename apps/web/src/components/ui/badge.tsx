import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default:
    'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300',
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  outline:
    'border border-[#CDB499] text-[#3C2415] bg-[#FDF5E6] dark:border-[#50301C] dark:text-[#F5E6D3] dark:bg-[#2C1810]',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  animated?: boolean;
}

function Badge({
  className,
  variant = 'default',
  size = 'md',
  animated,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        variants[variant],
        sizes[size],
        animated && 'animate-fade-in',
        className,
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeProps };
