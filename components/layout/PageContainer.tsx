import { cn } from '@/lib/utils';

const WIDTHS = {
  wide: 'max-w-7xl',
  medium: 'max-w-5xl',
  narrow: 'max-w-3xl',
} as const;

/**
 * Standard page wrapper for every route inside the (app) shell.
 * Keeps horizontal padding, vertical rhythm and content width identical
 * everywhere so pages cannot drift apart as new ones are added.
 */
export function PageContainer({
  children,
  className,
  width = 'wide',
}: {
  children: React.ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
}) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8',
        WIDTHS[width],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Standard page heading block: title, optional description and right-aligned
 * actions. Use with PageContainer at the top of each page.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
