'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Book, User } from '@/types';
import type { LoanRecord } from '@/hooks/useDashboard';

export type LibrarySettings = {
  loan_period_days: number;
  max_books_per_user: number;
};

export function isLoanOverdue(loan: LoanRecord) {
  return loan.status === 'active' && new Date(loan.due_date).getTime() < Date.now();
}

export function daysLate(dueDate: string) {
  return Math.max(Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86_400_000), 1);
}

export function daysLeft(dueDate: string) {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? 'Request failed');
  return body;
}

/** Every borrow record (librarians can read all rows under RLS). */
export function useAllLoans() {
  return useQuery({
    queryKey: ['admin', 'loans'],
    queryFn: async () => {
      const data = await fetchJson('/api/borrow-records', { cache: 'no-store' });
      return (data ?? []) as LoanRecord[];
    },
  });
}

/** Every user profile (librarians can read all rows under RLS). */
export function useMembers() {
  return useQuery({
    queryKey: ['admin', 'members'],
    queryFn: async () => {
      const data = await fetchJson('/api/users', { cache: 'no-store' });
      return (data ?? []) as User[];
    },
  });
}

/** Search available books for the desk-checkout dialog. */
export function useBookSearch(query: string) {
  return useQuery({
    queryKey: ['admin', 'book-search', query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({
        search: query.trim(),
        availability: 'Available',
        page: '1',
        pageSize: '8',
      });
      const payload = await fetchJson(`/api/books?${params}`, { cache: 'no-store' });
      return (payload.data ?? []) as Book[];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await fetchJson('/api/settings', { cache: 'no-store' })) as LibrarySettings,
  });
}

function useInvalidateLibraryData() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'loans'] });
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['book'] });
    queryClient.invalidateQueries({ queryKey: ['borrow-record'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

/** Librarian: mark any active loan as returned. */
export function useReturnLoan() {
  const invalidate = useInvalidateLibraryData();
  return useMutation({
    mutationFn: async (loanId: string) =>
      fetchJson(`/api/borrow-records/${loanId}/return`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

/** Librarian: check a book out to a member (desk checkout). */
export function useIssueLoan() {
  const invalidate = useInvalidateLibraryData();
  return useMutation({
    mutationFn: async ({ bookId, userId }: { bookId: string; userId: string }) =>
      fetchJson('/api/borrow-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId, user_id: userId }),
      }),
    onSuccess: invalidate,
  });
}

/** Librarian: change an active loan's due date. */
export function useRenewLoan() {
  const invalidate = useInvalidateLibraryData();
  return useMutation({
    mutationFn: async ({ loanId, dueDate }: { loanId: string; dueDate: string }) =>
      fetchJson(`/api/borrow-records/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: dueDate }),
      }),
    onSuccess: invalidate,
  });
}

/** Librarian: persist borrowing rules. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: LibrarySettings) =>
      fetchJson('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }) as Promise<LibrarySettings>,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'settings'], data);
    },
  });
}
