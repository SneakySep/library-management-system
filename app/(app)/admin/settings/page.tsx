'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  Info,
  Library,
  Loader2,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSettings, useUpdateSettings } from '@/hooks/useAdmin';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';
import { toast } from 'sonner';

const FALLBACK = { loan_period_days: 14, max_books_per_user: 5 };

export default function AdminSettingsPage() {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();

  const [periodInput, setPeriodInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current && settingsQuery.data) {
      setPeriodInput(String(settingsQuery.data.loan_period_days));
      setMaxInput(String(settingsQuery.data.max_books_per_user));
      seeded.current = true;
    }
  }, [settingsQuery.data]);

  const saved = settingsQuery.data ?? FALLBACK;
  const period = Number.parseInt(periodInput, 10);
  const maxBooks = Number.parseInt(maxInput, 10);

  const periodValid = Number.isInteger(period) && period >= 1 && period <= 365;
  const maxValid = Number.isInteger(maxBooks) && maxBooks >= 1 && maxBooks <= 100;
  const periodInvalid = periodInput.trim() !== '' && !periodValid;
  const maxInvalid = maxInput.trim() !== '' && !maxValid;

  const dirty =
    periodValid &&
    maxValid &&
    (period !== saved.loan_period_days || maxBooks !== saved.max_books_per_user);

  const previewPeriod = periodValid ? period : saved.loan_period_days;
  const previewMax = maxValid ? maxBooks : saved.max_books_per_user;

  const handleSave = async () => {
    if (!dirty) return;
    try {
      const result = await updateSettings.mutateAsync({
        loan_period_days: period,
        max_books_per_user: maxBooks,
      });
      setPeriodInput(String(result.loan_period_days));
      setMaxInput(String(result.max_books_per_user));
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <PageContainer width="narrow">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-72 animate-pulse rounded-2xl bg-muted" />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Borrowing rules enforced when books are checked out."
        actions={
          <>
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            <Button onClick={handleSave} disabled={!dirty || updateSettings.isPending}>
              {updateSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>
          </>
        }
      />

      {settingsQuery.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-destructive">Could not load settings — showing defaults.</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => settingsQuery.refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Borrowing rules */}
      <Card className="border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Borrowing rules
          </CardTitle>
          <CardDescription>
            Applied to every checkout — at the desk and from the catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <Label htmlFor="loan-period">Loan period</Label>
                <p className="text-xs text-muted-foreground">
                  Days a book stays checked out before it is due. Also used as the default
                  renewal length.
                </p>
              </div>
            </div>
            <div className="w-full sm:w-36">
              <Input
                id="loan-period"
                type="number"
                min={1}
                max={365}
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                aria-invalid={periodInvalid}
              />
              <p className="mt-1 text-xs text-muted-foreground">1–365 days</p>
              {periodInvalid && (
                <p className="mt-1 text-xs text-destructive">Enter a whole number from 1 to 365.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <Label htmlFor="max-books">Max books per member</Label>
                <p className="text-xs text-muted-foreground">
                  Maximum number of active loans a member can have at one time.
                </p>
              </div>
            </div>
            <div className="w-full sm:w-36">
              <Input
                id="max-books"
                type="number"
                min={1}
                max={100}
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                aria-invalid={maxInvalid}
              />
              <p className="mt-1 text-xs text-muted-foreground">1–100 books</p>
              {maxInvalid && (
                <p className="mt-1 text-xs text-destructive">Enter a whole number from 1 to 100.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <BookOpen className="h-4 w-4 text-primary" />
              What this means
            </p>
            <p className="mt-1 text-muted-foreground">
              Books are due <span className="font-medium text-foreground">{previewPeriod} days</span>{' '}
              after checkout, and each member can hold up to{' '}
              <span className="font-medium text-foreground">{previewMax}</span>{' '}
              {previewMax === 1 ? 'book' : 'books'} at a time. Existing loans keep their current due
              dates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-4 w-4 text-primary" />
            How these rules apply
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Both limits are enforced the moment a book is issued, including desk checkouts.</li>
            <li>
              Renewals are pre-filled using the loan period — you can always choose a different
              date.
            </li>
            <li>Overdue status is calculated from due dates and updates automatically.</li>
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
