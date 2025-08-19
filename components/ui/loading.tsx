import { cn } from '@/lib/utils';

// 1. Full Page Loading
export function LoadingFullPage({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="animate-spin rounded-full h-16 w-16 border-8 border-gray-200 border-t-blue-600"></div>
    </div>
  );
}

// 2. Div Loading (Container)
export function LoadingDiv({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="animate-spin rounded-full h-12 w-12 border-6 border-gray-200 border-t-blue-600"></div>
    </div>
  );
}

// 3. Inline Loading (Button/Small)
export function LoadingInline({
  className,
  size = 'sm',
}: {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const sizeClasses = {
    xs: 'h-3 w-3 border-[3px]',
    sm: 'h-4 w-4 border-[3px]',
    md: 'h-6 w-6 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-gray-200 border-t-current',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Export default all variants
export default {
  FullPage: LoadingFullPage,
  Div: LoadingDiv,
  Inline: LoadingInline,
};
