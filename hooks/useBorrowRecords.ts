import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BorrowRecord } from '@/types';

export function useBorrowRecords() {
  const queryClient = useQueryClient();

  const recordsQuery = useQuery<BorrowRecord[]>({
    queryKey: ['borrow-records'],
    queryFn: async () => {
      const res = await fetch('/api/borrow-records', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch borrow records');
      return res.json();
    },
  });

  const createRecord = useMutation({
    mutationFn: async (record: Omit<BorrowRecord, 'id' | 'created_at'>) => {
      const res = await fetch('/api/borrow-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error('Failed to create borrow record');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrow-records'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  return { ...recordsQuery, createRecord };
}