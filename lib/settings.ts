import { createAdminClient } from '@/lib/supabase/admin';

export type LibrarySettings = {
  loan_period_days: number;
  max_books_per_user: number;
};

export const DEFAULT_SETTINGS: LibrarySettings = {
  loan_period_days: 14,
  max_books_per_user: 5,
};

/**
 * Load the library settings row (id = 1).
 * Falls back to defaults when the row/table does not exist yet so the app
 * keeps working until migration 003 is applied.
 */
export async function getLibrarySettings(): Promise<LibrarySettings> {
  try {
    const admin = createAdminClient();
    const { data, error } = await (admin.from('library_settings') as any)
      .select('loan_period_days, max_books_per_user')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return DEFAULT_SETTINGS;

    return {
      loan_period_days: Number(data.loan_period_days) || DEFAULT_SETTINGS.loan_period_days,
      max_books_per_user: Number(data.max_books_per_user) || DEFAULT_SETTINGS.max_books_per_user,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
