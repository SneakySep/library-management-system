'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { Mail, Lock, User, BookOpen, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { passwordStrength } from '@/lib/password-strength';

const strengthColors: Record<number, string> = {
  0: 'text-destructive',
  1: 'text-destructive',
  2: 'text-accent-foreground',
  3: 'text-primary',
  4: 'text-primary',
};

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  const getErrorMessage = (err: any) => {
    const code = err?.code ?? err?.error_code ?? '';
    const message: string = err?.message ?? '';

    if (
      code === 'over_email_send_rate_limit' ||
      err?.status === 429 ||
      message.toLowerCase().includes('rate limit')
    ) {
      return 'Too many sign-up emails were sent recently. Please wait a few minutes and try again — or disable email confirmation in Supabase for testing.';
    }
    if (code === 'email_address_invalid' || message.includes('is invalid')) {
      return 'That email address was rejected. Please use a real email address (e.g. Gmail).';
    }
    return message || 'Failed to create account. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data.user) return;

      if (data.session) {
        // Email confirmation is disabled in Supabase — the user is signed in.
        toast.success('Account created successfully!');
        router.push('/books');
      } else {
        // Email confirmation is required — show inline instructions.
        toast.success('Account created! Check your email to confirm it.');
        setSent(true);
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const { score, label } = passwordStrength(password);

  if (sent) {
    return (
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
          <p className="text-muted-foreground mb-6">
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{email}</span>. Click it
            to activate your account, then sign in.
          </p>
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Back to sign in
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Didn&apos;t get the email? Check your spam folder and try again in a few
            minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 p-8">
      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
          <BookOpen className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
        <p className="text-muted-foreground">
          Join the library and start borrowing books
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              required
            />
          </div>
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
          {password && (
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${strengthColors[score]}`} />
              <span className={`text-xs font-medium ${strengthColors[score]}`}>
                {label}
              </span>
            </div>
          )}
          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
