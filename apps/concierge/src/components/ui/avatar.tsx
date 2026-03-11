import { cn, getInitials } from '@/lib/utils';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
};

interface AvatarProps {
  src?: string;
  name: string;
  size?: keyof typeof sizeMap;
  className?: string;
}

function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={cn('rounded-full object-cover', sizeMap[size], className)}
    />
  ) : (
    <div
      className={cn(
        'rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold flex items-center justify-center',
        sizeMap[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export { Avatar, type AvatarProps };
