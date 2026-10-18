'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookCheck,
  BookOpen,
  BookPlus,
  CheckCircle2,
  Library,
  Loader2,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogStats, type LoanRecord } from '@/hooks/useDashboard';
import { daysLate, isLoanOverdue, useAllLoans, useReturnLoan } from '@/hooks/useAdmin';
import { FadeIn } from '@/components/dashboard/FadeIn';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { toast } from 'sonner';

function memberName(loan: LoanRecord) {
  return loan.user?.full_name?.trim() || loan.user?.email || 'Unknown member';
}

function loanStatusBadge(loan: LoanRecord) {
  if (loan.status === 'returned') {
    return <Badge variant="secondary">Returned</Badge>;
  }
  if (isLoanOverdue(loan)) {
    return <Badge variant="destructive">Overdue</Badge>;
  }
  const days = Math.ceil((new Date(loan.due_date).getTime() - Date.now()) / 86_400_000);
  if (days <= 3) {
    return <Badge variant="warning">Due soon</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
}

/** Librarian home shown at `/` for accounts with the librarian role. */
export function AdminOverview() {
  const { user } = useAuth();
  const stats = useCatalogStats();
  const loansQuery = useAllLoans();
  const returnLoan = useReturnLoan();
  const [busyId, setBusyId] = useState<string | null>(null);

  const loans = loansQuery.data ?? [];
  const activeLoans = loans.filter((loan) => loan.status === 'active');
  const overdueLoans = activeLoans
    .filter(isLoanOverdue)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const recentLoans = loans.slice(0, 6);
  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? null;

  const hasError = stats.isError || loansQuery.isError;

  const handleReturn = async (loan: LoanRecord) => {
    setBusyId(loan.id);
    try {
      await returnLoan.mutateAsync(loan.id);
      toast.success(`"${loan.book?.title ?? 'Book'}" marked as returned`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark the book as returned');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageContainer className="gap-8">
      {/* Header */}
      <FadeIn>
        <PageHeader
          title="Library overview"
          description={`${firstName ? `Welcome back, ${firstName}. ` : ''}Circulation, members and stock at a glance.`}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/admin/books">
                  <BookPlus className="mr-2 h-4 w-4" /> Add a book
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/loans">
                  <BookCheck className="mr-2 h-4 w-4" /> Issue a book
                </Link>
              </Button>
            </>
          }
        />
      </FadeIn>

      {hasError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-destructive">Some overview data could not be loaded.</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => {
              stats.refetch();
              loansQuery.refetch();
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
          label="Active loans"
          value={loansQuery.isLoading ? undefined : activeLoans.length}
          loading={loansQuery.isLoading}
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue loans"
          value={loansQuery.isLoading ? undefined : overdueLoans.length}
          loading={loansQuery.isLoading}
          tone={overdueLoans.length > 0 ? 'destructive' : 'success'}
        />
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Overdue */}
        <FadeIn className="xl:col-span-3">
          <Card className="flex h-full flex-col border-border shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Overdue loans
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/loans">
                  Manage all <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {loansQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : overdueLoans.length === 0 ? (
                <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="mt-3 text-sm font-medium">Nothing overdue</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Every loan is within its due date. Great job.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {overdueLoans.slice(0, 6).map((loan) => (
                    <li key={loan.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">
                          {loan.book?.title ?? 'Unknown title'}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {memberName(loan)} · due {new Date(loan.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {daysLate(loan.due_date)}d late
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={busyId === loan.id}
                        onClick={() => handleReturn(loan)}
                      >
                        {busyId === loan.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Mark returned
                      </Button>
                    </li>
                  ))}
                  {overdueLoans.length > 6 && (
                    <li className="pt-3 text-center text-xs text-muted-foreground">
                      +{overdueLoans.length - 6} more overdue loan
                      {overdueLoans.length - 6 === 1 ? '' : 's'} — see the loans page
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Recent checkouts */}
        <FadeIn className="xl:col-span-2" delay={0.05}>
          <Card className="flex h-full flex-col border-border shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-4 w-4 text-primary" />
                Recent checkouts
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/loans">
                  View all <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {loansQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : recentLoans.length === 0 ? (
                <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No checkouts yet</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/admin/loans">Issue the first book</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recentLoans.map((loan) => (
                    <li key={loan.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">
                          {loan.book?.title ?? 'Unknown title'}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {memberName(loan)} · {new Date(loan.borrowed_at).toLocaleDateString()}
                        </p>
                      </div>
                      {loanStatusBadge(loan)}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageContainer>
  );
}
