'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatTone = 'success' | 'warning' | 'destructive';

export function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  loading: boolean;
  tone?: StatTone;
}) {
  return (
    <Card className="border-border shadow-soft">
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-12 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight">{value ?? 0}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            tone === 'success' && 'bg-success/10 text-success',
            tone === 'warning' && 'bg-warning/10 text-warning',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
            !tone && 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
