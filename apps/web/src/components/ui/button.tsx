'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

const variants = {
  default:
    'bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-[#0D0A05] focus-ring',
  secondary:
    'bg-safari-100 text-[#1C1108] hover:bg-safari-200 dark:bg-safari-800 dark:text-[#F8F4ED] dark:hover:bg-safari-700 focus-ring',
  outline:
    'border border-[#EDE4D8] bg-white text-[#1C1108] hover:bg-brand-50 dark:border-[#332C22] dark:bg-[#1A1610] dark:text-[#F8F4ED] dark:hover:bg-safari-800 focus-ring',
  ghost:
    'text-[#1C1108] hover:bg-safari-100 dark:text-[#F8F4ED] dark:hover:bg-safari-800 focus-ring',
  danger:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus-ring',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...(props as HTMLMotionProps<'button'>)}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </motion.button>
  ),
);
Button.displayName = 'Button';

export { Button, type ButtonProps };
