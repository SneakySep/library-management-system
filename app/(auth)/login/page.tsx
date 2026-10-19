'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { Mail, Lock, BookOpen, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'signin' | 'forgot' | 'sent'>('signin');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Only follow same-site paths from ?next=. Anything absolute, or a
      // protocol-relative "//host", would send the user to another site
      // after sign-in (phishing) — fall back to the catalog instead.
      const requestedNext = new URLSearchParams(window.location.search).get('next');
      const next =
        requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
          ? requestedNext
          : '/books';
      router.push(next);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      });

      if (error) throw error;

      setMode('sent');
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8">
      {mode === 'forgot' && (
        <ForgotPasswordForm
          resetEmail={resetEmail}
          setResetEmail={setResetEmail}
          resetLoading={resetLoading}
          onSubmit={handleReset}
          onBack={() => setMode('signin')}
        />
      )}

      {mode === 'sent' && (
        <ResetSent resetEmail={resetEmail} onBack={() => setMode('signin')} />
      )}

      {mode === 'signin' && (
        <>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to access your library account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Forgot your password?{' '}
              <button
                onClick={() => setMode('forgot')}
                className="font-medium text-primary hover:underline"
              >
                Reset it
              </button>
            </p>
          </form>
        </>
      )}
    </div>
  );
}

function ForgotPasswordForm({
  resetEmail,
  setResetEmail,
  resetLoading,
  onSubmit,
  onBack,
}: {
  resetEmail: string;
  setResetEmail: (v: string) => void;
  resetLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
        <Mail className="h-7 w-7" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight">Reset password</h2>
      <p className="text-muted-foreground mb-6">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>
      <form onSubmit={onSubmit} className="w-full space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email address"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <Button type="submit" variant="default" className="w-full" disabled={resetLoading}>
          {resetLoading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Remember your password?{' '}
        <button
          onClick={onBack}
          className="font-medium text-primary hover:underline"
        >
          Sign in instead
        </button>
      </p>
    </div>
  );
}

function ResetSent({
  resetEmail,
  onBack,
}: {
  resetEmail: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
        <Mail className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold">Check your email</h2>
      <p className="text-muted-foreground mb-6">
        We&apos;ve sent a password reset link to {resetEmail}.
      </p>
      <Button onClick={onBack} className="w-full">
        Back to sign in
      </Button>
    </div>
  );
}
