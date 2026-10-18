'use client';

import { useMemo, useState } from 'react';
import type { User } from '@/types';
import {
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image } from '@/components/ui/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { COVER_FALLBACK } from '@/lib/placeholder';
import {
  daysLate,
  isLoanOverdue,
  useAllLoans,
  useBookSearch,
  useIssueLoan,
  useMembers,
  useRenewLoan,
  useReturnLoan,
  useSettings,
} from '@/hooks/useAdmin';
import type { LoanRecord } from '@/hooks/useDashboard';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/dashboard/StatCard';
import { toast } from 'sonner';

type TabKey = 'all' | 'active' | 'overdue' | 'returned';

function memberName(loan: LoanRecord) {
  return loan.user?.full_name?.trim() || loan.user?.email || 'Unknown member';
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function LoanStatusBadge({ loan }: { loan: LoanRecord }) {
  if (loan.status === 'returned') return <Badge variant="secondary">Returned</Badge>;
  if (isLoanOverdue(loan)) return <Badge variant="destructive">Overdue</Badge>;
  const days = Math.ceil((new Date(loan.due_date).getTime() - Date.now()) / 86_400_000);
  if (days <= 3) return <Badge variant="warning">Due soon</Badge>;
  return <Badge variant="success">Active</Badge>;
}

/** Desk checkout dialog: pick a member, pick a book, issue. */
function IssueBookDialog({
  open,
  onOpenChange,
  activeCounts,
  maxBooks,
  loanPeriodDays,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCounts: Record<string, number>;
  maxBooks: number;
  loanPeriodDays: number;
}) {
  const membersQuery = useMembers();
  const issueLoan = useIssueLoan();

  const [memberQuery, setMemberQuery] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [member, setMember] = useState<User | null>(null);
  const [book, setBook] = useState<{ id: string; title: string; author: string; cover_url?: string | null } | null>(null);

  const booksQuery = useBookSearch(bookQuery);
  const books = bookQuery.trim().length >= 2 ? booksQuery.data ?? [] : [];

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const all = membersQuery.data ?? [];
    const matches = q
      ? all.filter(
          (m) =>
            (m.full_name ?? '').toLowerCase().includes(q) ||
            (m.email ?? '').toLowerCase().includes(q)
        )
      : all;
    return matches.slice(0, 8);
  }, [membersQuery.data, memberQuery]);

  const memberLoanCount = member ? activeCounts[member.id] ?? 0 : 0;
  const memberAtLimit = !!member && memberLoanCount >= maxBooks;
  const duePreview = addDays(new Date(), loanPeriodDays).toLocaleDateString();

  const reset = () => {
    setMemberQuery('');
    setBookQuery('');
    setMember(null);
    setBook(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleIssue = async () => {
    if (!member || !book) return;
    try {
      await issueLoan.mutateAsync({ bookId: book.id, userId: member.id });
      toast.success(`"${book.title}" issued to ${member.full_name || member.email}`);
      handleOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue the book');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Issue a book</DialogTitle>
          <DialogDescription>
            Check a book out to a member from the desk. It will be due{' '}
            <span className="font-medium text-foreground">{duePreview}</span> ({loanPeriodDays}{' '}
            days).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Member */}
          <div className="space-y-2">
            <Label>{member ? 'Member' : 'Find a member'}</Label>
            {member ? (
              <div className="flex items-center justify-between rounded-xl border border-primary bg-primary/5 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.full_name || member.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMember(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search by name or email…"
                    className="pl-9"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border">
                  {membersQuery.isLoading ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                      ))}
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      No members match your search.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredMembers.map((m) => {
                        const count = activeCounts[m.id] ?? 0;
                        const atLimit = count >= maxBooks;
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => setMember(m)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {m.full_name || m.email}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {m.email}
                                </span>
                              </span>
                              <Badge variant={atLimit ? 'destructive' : 'secondary'} className="shrink-0">
                                {count}/{maxBooks} loans
                              </Badge>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Book */}
          <div className="space-y-2">
            <Label>{book ? 'Book' : 'Find a book'}</Label>
            {book ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  <Image
                    src={book.cover_url || COVER_FALLBACK}
                    alt={book.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setBook(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={bookQuery}
                    onChange={(e) => setBookQuery(e.target.value)}
                    placeholder="Search available titles, authors, ISBN…"
                    className="pl-9"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border">
                  {bookQuery.trim().length < 2 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Type at least 2 characters to search the catalog.
                    </p>
                  ) : booksQuery.isLoading ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                      ))}
                    </div>
                  ) : books.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      No available books match your search.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {books.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => setBook(b)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                          >
                            <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                              <Image
                                src={b.cover_url || COVER_FALLBACK}
                                alt={b.title}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{b.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {b.author}
                              </span>
                            </span>
                            <Badge variant="success" className="shrink-0">
                              {b.available_copies} available
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          {memberAtLimit && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              This member already has {memberLoanCount} active loans — the limit is {maxBooks}.
              Return a book before issuing another.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleIssue}
            disabled={!member || !book || memberAtLimit || issueLoan.isPending}
          >
            {issueLoan.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            )}
            Issue book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminLoansPage() {
  const loansQuery = useAllLoans();
  const settingsQuery = useSettings();
  const returnLoan = useReturnLoan();
  const renewLoan = useRenewLoan();

  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<LoanRecord | null>(null);
  const [renewDate, setRenewDate] = useState('');

  const loanPeriodDays = settingsQuery.data?.loan_period_days ?? 14;
  const maxBooks = settingsQuery.data?.max_books_per_user ?? 5;

  const loans = loansQuery.data ?? [];

  const { activeLoans, overdueLoans, returnedLoans } = useMemo(() => {
    const active = loans.filter((l) => l.status === 'active');
    return {
      activeLoans: active,
      overdueLoans: active.filter(isLoanOverdue),
      returnedLoans: loans.filter((l) => l.status === 'returned'),
    };
  }, [loans]);

  const activeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const loan of activeLoans) {
      counts[loan.user_id] = (counts[loan.user_id] ?? 0) + 1;
    }
    return counts;
  }, [activeLoans]);

  const counts: Record<TabKey, number> = {
    all: loans.length,
    active: activeLoans.length - overdueLoans.length,
    overdue: overdueLoans.length,
    returned: returnedLoans.length,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = loans;

    if (tab === 'active') list = list.filter((l) => l.status === 'active' && !isLoanOverdue(l));
    if (tab === 'overdue') {
      list = list
        .filter(isLoanOverdue)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    }
    if (tab === 'returned') list = list.filter((l) => l.status === 'returned');

    if (q) {
      list = list.filter((l) => {
        const title = l.book?.title?.toLowerCase() ?? '';
        const author = l.book?.author?.toLowerCase() ?? '';
        const name = l.user?.full_name?.toLowerCase() ?? '';
        const email = l.user?.email?.toLowerCase() ?? '';
        return (
          title.includes(q) || author.includes(q) || name.includes(q) || email.includes(q)
        );
      });
    }

    return list;
  }, [loans, tab, search]);

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

  const openRenew = (loan: LoanRecord) => {
    const base = new Date(Math.max(Date.now(), new Date(loan.due_date).getTime()));
    setRenewDate(toDateInputValue(addDays(base, loanPeriodDays)));
    setRenewTarget(loan);
  };

  const submitRenew = async () => {
    if (!renewTarget || !renewDate) return;
    const due = new Date(`${renewDate}T23:59:59`);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      toast.error('Pick a due date in the future');
      return;
    }
    try {
      await renewLoan.mutateAsync({ loanId: renewTarget.id, dueDate: due.toISOString() });
      toast.success(`Due date updated to ${due.toLocaleDateString()}`);
      setRenewTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to renew the loan');
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'returned', label: 'Returned' },
  ];

  const tomorrow = toDateInputValue(addDays(new Date(), 1));

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Loans"
        description="Issue, renew and return books for any member."
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => loansQuery.refetch()}
              aria-label="Refresh loans"
            >
              <RefreshCw className={cn('h-4 w-4', loansQuery.isFetching && 'animate-spin')} />
            </Button>
            <Button onClick={() => setIssueOpen(true)}>
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Issue book
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Active loans"
          value={loansQuery.isLoading ? undefined : activeLoans.length - overdueLoans.length}
          loading={loansQuery.isLoading}
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue"
          value={loansQuery.isLoading ? undefined : overdueLoans.length}
          loading={loansQuery.isLoading}
          tone={overdueLoans.length > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Returned"
          value={loansQuery.isLoading ? undefined : returnedLoans.length}
          loading={loansQuery.isLoading}
          tone="success"
        />
        <StatCard
          icon={ArrowLeftRight}
          label="All records"
          value={loansQuery.isLoading ? undefined : loans.length}
          loading={loansQuery.isLoading}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              <span
                className={cn(
                  'ml-1.5 text-xs',
                  tab === t.key ? 'text-muted-foreground' : 'text-muted-foreground/70'
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books or members…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border shadow-soft">
        <CardContent className="p-0">
          {loansQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : loansQuery.isError ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Could not load loans.</p>
              <Button size="sm" variant="outline" onClick={() => loansQuery.refetch()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                {search.trim() ? 'No loans match your search' : 'No loans in this view'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search.trim()
                  ? 'Try a different title, author or member.'
                  : tab === 'overdue'
                    ? 'Nothing is overdue right now.'
                    : 'Issue a book to get things moving.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="hidden md:table-cell">Borrowed</TableHead>
                  <TableHead>{tab === 'returned' ? 'Returned' : 'Due'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loan) => {
                  const isActive = loan.status === 'active';
                  const overdue = isLoanOverdue(loan);
                  return (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="min-w-0 max-w-[240px]">
                          <p className="truncate font-medium">
                            {loan.book?.title ?? 'Unknown title'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {loan.book?.author ?? ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0 max-w-[200px]">
                          <p className="truncate text-sm">{memberName(loan)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {loan.user?.email ?? ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {new Date(loan.borrowed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {loan.status === 'returned' ? (
                          <span className="text-sm text-muted-foreground">
                            {loan.returned_at ? new Date(loan.returned_at).toLocaleDateString() : '—'}
                          </span>
                        ) : (
                          <div>
                            <p className="text-sm">{new Date(loan.due_date).toLocaleDateString()}</p>
                            {overdue && (
                              <p className="text-xs font-medium text-destructive">
                                {daysLate(loan.due_date)} day{daysLate(loan.due_date) === 1 ? '' : 's'} late
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <LoanStatusBadge loan={loan} />
                      </TableCell>
                      <TableCell className="text-right">
                        {isActive ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === loan.id}
                              onClick={() => openRenew(loan)}
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Renew
                            </Button>
                            <Button
                              size="sm"
                              variant={overdue ? 'default' : 'ghost'}
                              disabled={busyId === loan.id}
                              onClick={() => handleReturn(loan)}
                            >
                              {busyId === loan.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Return
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Completed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Issue dialog */}
      <IssueBookDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        activeCounts={activeCounts}
        maxBooks={maxBooks}
        loanPeriodDays={loanPeriodDays}
      />

      {/* Renew dialog */}
      <Dialog open={!!renewTarget} onOpenChange={(open) => !open && setRenewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew loan</DialogTitle>
            <DialogDescription>
              Set a new due date for{' '}
              <span className="font-medium text-foreground">
                {renewTarget?.book?.title ?? 'this book'}
              </span>{' '}
              ({renewTarget ? memberName(renewTarget) : ''}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="renew-date">New due date</Label>
            <Input
              id="renew-date"
              type="date"
              min={tomorrow}
              value={renewDate}
              onChange={(e) => setRenewDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to one loan period ({loanPeriodDays} days) from the current due date.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenewTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitRenew} disabled={renewLoan.isPending || !renewDate}>
              {renewLoan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save new due date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
