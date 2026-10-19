'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types';
import { useAllLoans } from '@/hooks/useAdmin';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserActionsMenu, isUserSuspended } from '@/components/admin/UserActionsMenu';
import { UserDetailsSheet } from '@/components/admin/UserDetailsSheet';
import { toast } from 'sonner';

type ConfirmAction =
  | { type: 'suspend'; user: User }
  | { type: 'delete'; user: User };

function displayName(user: User) {
  return user.full_name?.trim() || user.email || 'this user';
}

async function request(url: string, method: string) {
  const res = await fetch(url, { method });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? 'Request failed');
  return body;
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loansQuery = useAllLoans();
  const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data]);

  const activeLoansByUser = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const loan of loans) {
      if (loan.status === 'active') {
        counts[loan.user_id] = (counts[loan.user_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [loans]);

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/users`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load users');
      const data: User[] = await res.json();
      setUsers(data);
      // Keep the open details sheet in sync with fresh data.
      setDetailsUser((current) =>
        current ? data.find((u) => u.id === current.id) ?? null : null
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    }
  };

  useEffect(() => {
    // Update loading state from the callback (not synchronously in the
    // loader itself) so React can skip an extra cascading render.
    Promise.resolve().then(loadUsers).then(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'member' | 'librarian') => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update user role');

      toast.success('User role updated successfully!');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    }
  };

  const openDetails = (user: User) => {
    setDetailsUser(user);
    setDetailsOpen(true);
  };

  const sendPasswordReset = async (user: User) => {
    setBusyId(user.id);
    try {
      await request(`/api/users/${user.id}/reset-password`, 'POST');
      toast.success(`Password reset email sent to ${user.email ?? displayName(user)}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send the reset email');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSuspend = (user: User) => {
    if (isUserSuspended(user)) {
      // Reactivating is always safe — no confirmation needed.
      void reactivate(user);
      return;
    }
    setConfirmAction({ type: 'suspend', user });
  };

  const reactivate = async (user: User) => {
    setBusyId(user.id);
    try {
      await request(`/api/users/${user.id}/reactivate`, 'POST');
      toast.success(`${displayName(user)} can sign in again`);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate the account');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (user: User) => {
    setDeleteEmailInput('');
    setConfirmAction({ type: 'delete', user });
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setDeleteEmailInput('');
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setBusyId(user.id);
    try {
      if (type === 'suspend') {
        await request(`/api/users/${user.id}/suspend`, 'POST');
        toast.success(`${displayName(user)} has been suspended`);
      } else {
        await request(`/api/users/${user.id}`, 'DELETE');
        toast.success(`${displayName(user)}'s account has been deleted`);
        if (detailsUser?.id === user.id) {
          setDetailsOpen(false);
        }
      }
      closeConfirm();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const confirmBusy = confirmAction ? busyId === confirmAction.user.id : false;
  const deleteEmailMatches =
    confirmAction?.type === 'delete' &&
    deleteEmailInput.trim().toLowerCase() ===
      (confirmAction.user.email ?? '').trim().toLowerCase();
  const deleteLoanCount =
    confirmAction?.type === 'delete'
      ? loans.filter((loan) => loan.user_id === confirmAction.user.id).length
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <UserIcon className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Manage Users"
        description="View and manage library members"
      />

      <div className="relative w-full lg:w-[300px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 bg-muted/50 rounded-xl border border-border">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <h2 className="text-xl font-bold">No users found</h2>
          <p className="text-muted-foreground mb-4">Try adjusting your search query.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28">Active loans</TableHead>
              <TableHead className="w-24">Role</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Joined</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const activeCount = activeLoansByUser[user.id] ?? 0;
              const suspended = isUserSuspended(user);
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      {user.full_name || 'Unknown User'}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {activeCount > 0 ? (
                      <Badge variant="secondary">
                        {activeCount} {activeCount === 1 ? 'book' : 'books'}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'librarian' ? 'default' : 'secondary'}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.id, v as 'member' | 'librarian')}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="librarian">Librarian</SelectItem>
                        </SelectContent>
                      </Select>
                      <UserActionsMenu
                        user={user}
                        isSelf={me?.id === user.id}
                        onViewDetails={openDetails}
                        onResetPassword={sendPasswordReset}
                        onToggleSuspend={handleToggleSuspend}
                        onDelete={handleDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <UserDetailsSheet
        user={detailsUser}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        loans={loans}
        isSelf={me?.id === detailsUser?.id}
        onResetPassword={sendPasswordReset}
        onToggleSuspend={handleToggleSuspend}
      />

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open && !confirmBusy) closeConfirm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {confirmAction?.type === 'suspend' && (
            <>
              <DialogHeader>
                <DialogTitle>Suspend {displayName(confirmAction.user)}?</DialogTitle>
                <DialogDescription>
                  They will be signed out and unable to sign in until you reactivate
                  their account.
                  {(activeLoansByUser[confirmAction.user.id] ?? 0) > 0 && (
                    <>
                      {' '}
                      They still have {activeLoansByUser[confirmAction.user.id]} active{' '}
                      {activeLoansByUser[confirmAction.user.id] === 1 ? 'loan' : 'loans'}{' '}
                      to return.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" disabled={confirmBusy} onClick={closeConfirm}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmBusy}
                  onClick={runConfirmAction}
                >
                  {confirmBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Suspend account
                </Button>
              </DialogFooter>
            </>
          )}

          {confirmAction?.type === 'delete' && (
            <>
              <DialogHeader>
                <DialogTitle>Delete {displayName(confirmAction.user)}?</DialogTitle>
                <DialogDescription>
                  This permanently deletes the account and their{' '}
                  {deleteLoanCount > 0 ? `${deleteLoanCount} borrow ` : 'borrow '}
                  record{deleteLoanCount === 1 ? '' : 's'}. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="confirm-delete-email">
                  Type <span className="font-medium">{confirmAction.user.email}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-delete-email"
                  value={deleteEmailInput}
                  onChange={(e) => setDeleteEmailInput(e.target.value)}
                  placeholder={confirmAction.user.email ?? ''}
                  autoComplete="off"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" disabled={confirmBusy} onClick={closeConfirm}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmBusy || !deleteEmailMatches}
                  onClick={runConfirmAction}
                >
                  {confirmBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Delete account
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
