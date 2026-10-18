'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookCheck,
  BookOpen,
  Clock,
  Library,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Image } from '@/components/ui/image';
import { cn } from '@/lib/utils';
import { COVER_FALLBACK } from '@/lib/placeholder';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogStats, useMyLoans, useRecentlyAdded, type LoanRecord } from '@/hooks/useDashboard';
import { FadeIn } from '@/components/dashboard/FadeIn';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageContainer } from '@/components/layout/PageContainer';

const QUICK_GENRES = ['Fiction', 'Science Fiction', 'Mystery', 'Biography', 'Technology'];

type DueTone = 'success' | 'warning' | 'destructive';

const TONE_TEXT: Record<DueTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

const TONE_BAR: Record<DueTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function getDueMeta(dueDate: string): { label: string; tone: DueTone } {
  const days = daysUntil(dueDate);
  if (days < 0) {
    const overdue = Math.abs(days);
    return { label: `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`, tone: 'destructive' };
  }
  if (days === 0) return { label: 'Due today', tone: 'destructive' };
  if (days <= 5) return { label: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'warning' };
  return { label: `Due in ${days} days`, tone: 'success' };
}

function getLoanProgress(loan: LoanRecord) {
  const start = new Date(loan.borrowed_at).getTime();
  const end = new Date(loan.due_date).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(Math.max(((Date.now() - start) / (end - start)) * 100, 0), 100);
}

function LoanCard({ loan }: { loan: LoanRecord }) {
  const meta = getDueMeta(loan.due_date);
  const progress = getLoanProgress(loan);
  const book = loan.book;

  return (
    <Card className="border-border shadow-soft transition-shadow hover:shadow-soft-lg">
      <CardContent className="flex gap-4 p-4">
        <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          <Image
            src={book?.cover_url || COVER_FALLBACK}
            alt={book?.title ?? 'Book cover'}
            fill
            sizes="72px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-semibold">{book?.title ?? 'Unknown title'}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">{book?.author ?? ''}</p>
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full w-[var(--progress)] rounded-full', TONE_BAR[meta.tone])}
                style={{ '--progress': `${progress}%` } as React.CSSProperties}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className={cn('font-medium', TONE_TEXT[meta.tone])}>{meta.label}</span>
              <span className="text-muted-foreground">
                {new Date(loan.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Member home dashboard shown at `/` for accounts with the member role. */
export function MemberDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const stats = useCatalogStats();
  const loans = useMyLoans();
  const recent = useRecentlyAdded(8);
  const [search, setSearch] = useState('');

  const activeLoans = loans.data ?? [];
  const recentBooks = recent.data ?? [];
  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? null;
  const dueSoon = useMemo(
    () => activeLoans.filter((loan) => daysUntil(loan.due_date) <= 7).length,
    [activeLoans]
  );
  const hasError = stats.isError || loans.isError || recent.isError;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    router.push(`/books${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <PageContainer className="gap-8">
      {/* Hero */}
      <FadeIn className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            Your library, at a glance
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse the catalog, keep track of your loans, and discover something new to read.
          </p>
          <form onSubmit={submitSearch} className="relative mt-6 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, authors, ISBN…"
              className="h-11 bg-background pl-10 pr-24 shadow-soft"
              aria-label="Search the catalog"
            />
            <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2">
              Search
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_GENRES.map((genre) => (
              <Button key={genre} asChild variant="outline" size="sm" className="rounded-full bg-background/60">
                <Link href={`/books?genre=${encodeURIComponent(genre)}`}>{genre}</Link>
              </Button>
            ))}
          </div>
        </div>
      </FadeIn>

      {hasError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-destructive">Some dashboard data could not be loaded.</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => {
              stats.refetch();
              loans.refetch();
              recent.refetch();
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <FadeIn className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Library} label="Titles in catalog" value={stats.data?.total} loading={stats.isLoading} />
        <StatCard
          icon={BookCheck}
          label="Available now"
          value={stats.data?.available}
          loading={stats.isLoading}
          tone="success"
        />
        <StatCard
          icon={BookOpen}
          label="Your active loans"
          value={loans.isLoading ? undefined : activeLoans.length}
          loading={loans.isLoading}
        />
        <StatCard
          icon={Clock}
          label="Due within 7 days"
          value={loans.isLoading ? undefined : dueSoon}
          loading={loans.isLoading}
          tone={dueSoon > 0 ? 'warning' : undefined}
        />
      </FadeIn>

      {/* Continue borrowing */}
      {activeLoans.length > 0 && (
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Continue borrowing</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/borrowed">
                View all <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeLoans.slice(0, 4).map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </FadeIn>
      )}

      {/* Recently added */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recently added</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/books">
              Browse all <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {recent.isLoading ? (
          <div className="mt-4 flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-36 shrink-0">
                <div className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : recentBooks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">The catalog is empty right now.</p>
            <p className="mt-1 text-xs text-muted-foreground">Check back soon for new titles.</p>
          </div>
        ) : (
          <div className="mt-4 -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
            {recentBooks.map((book) => (
              <Link key={book.id} href="/books" className="group w-36 shrink-0 snap-start">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-soft-lg">
                  <Image
                    src={book.cover_url || COVER_FALLBACK}
                    alt={book.title}
                    fill
                    sizes="144px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{book.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{book.author}</p>
              </Link>
            ))}
          </div>
        )}
      </FadeIn>
    </PageContainer>
  );
}
