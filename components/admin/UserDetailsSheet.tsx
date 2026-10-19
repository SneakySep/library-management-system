'use client';

import { useMemo } from 'react';
import { Ban, BookOpen, History, KeyRound, RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { daysLate, daysLeft, isLoanOverdue } from '@/hooks/useAdmin';
import { isUserSuspended } from '@/components/admin/UserActionsMenu';
import type { LoanRecord } from '@/hooks/useDashboard';
import type { User } from '@/types';

interface UserDetailsSheetProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All borrow records; the sheet filters to this user. */
  loans: LoanRecord[];
  isSelf: boolean;
  onResetPassword: (user: User) => void;
  onToggleSuspend: (user: User) => void;
}

/** Member profile with loan activity and quick support actions. */
export function UserDetailsSheet({
  user,
  open,
  onOpenChange,
  loans,
  isSelf,
  onResetPassword,
  onToggleSuspend,
}: UserDetailsSheetProps) {
  const userLoans = useMemo(
    () => (user ? loans.filter((loan) => loan.user_id === user.id) : []),
    [loans, user]
  );

  const activeLoans = useMemo(
    () =>
      userLoans
        .filter((loan) => loan.status === 'active')
        .sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ),
    [userLoans]
  );

  const history = useMemo(
    () =>
      userLoans
        .filter((loan) => loan.status !== 'active')
        .sort(
          (a, b) =>
            new Date(b.borrowed_at).getTime() - new Date(a.borrowed_at).getTime()
        )
        .slice(0, 10),
    [userLoans]
  );

  // Hooks run on every render, so the early return comes after them.
  if (!user) return null;

  const suspended = isUserSuspended(user);
  const name = user.full_name?.trim() || 'Unknown user';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-y-auto">
        <SheetHeader className="pr-6">
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant={user.role === 'librarian' ? 'default' : 'secondary'}>
              {user.role === 'librarian' ? 'Librarian' : 'Member'}
            </Badge>
            <Badge variant={suspended ? 'destructive' : 'success'}>
              {suspended ? 'Suspended' : 'Active'}
            </Badge>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Joined</dt>
            <dd className="mt-0.5">
              {new Date(user.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last sign-in</dt>
            <dd className="mt-0.5">
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Never'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Active loans</dt>
            <dd className="mt-0.5 font-medium">{activeLoans.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total loans</dt>
            <dd className="mt-0.5 font-medium">{userLoans.length}</dd>
          </div>
        </dl>

        <Separator className="my-4" />

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Active loans
          </h3>
          {activeLoans.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              No active loans.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-border">
              {activeLoans.map((loan) => (
                <li key={loan.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">
                      {loan.book?.title ?? 'Unknown title'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {new Date(loan.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  {isLoanOverdue(loan) ? (
                    <Badge variant="destructive" className="shrink-0">
                      {daysLate(loan.due_date)}d late
                    </Badge>
                  ) : daysLeft(loan.due_date) <= 3 ? (
                    <Badge variant="warning" className="shrink-0">
                      Due soon
                    </Badge>
                  ) : (
                    <Badge variant="success" className="shrink-0">
                      On time
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-muted-foreground" />
            History
          </h3>
          {history.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              No returned loans yet.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-border">
              {history.map((loan) => (
                <li key={loan.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">
                      {loan.book?.title ?? 'Unknown title'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(loan.borrowed_at).toLocaleDateString()} →{' '}
                      {loan.returned_at
                        ? new Date(loan.returned_at).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SheetFooter className="mt-6 gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={() => onResetPassword(user)}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Send password reset
          </Button>
          {suspended ? (
            <Button variant="outline" size="sm" onClick={() => onToggleSuspend(user)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reactivate
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              disabled={isSelf}
              title={isSelf ? "You can't suspend your own account" : undefined}
              onClick={() => onToggleSuspend(user)}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Suspend
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
