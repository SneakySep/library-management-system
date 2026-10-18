'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Book,
  User,
  Shield,
  LogOut,
  Settings,
  X,
  LayoutDashboard,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { signOut, isLibrarian } = useAuth();

  const memberItems = isLibrarian
    ? [
        { href: '/', label: 'Overview', icon: LayoutDashboard },
        { href: '/books', label: 'Catalog', icon: BookOpen },
        { href: '/profile', label: 'Profile', icon: User },
      ]
    : [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/books', label: 'Catalog', icon: BookOpen },
        { href: '/borrowed', label: 'My Borrowed Books', icon: Book },
        { href: '/profile', label: 'Profile', icon: User },
      ];

  const adminItems = [
    { href: '/admin/loans', label: 'Loans', icon: ArrowLeftRight },
    { href: '/admin/books', label: 'Manage Books', icon: Book },
    { href: '/admin/users', label: 'Manage Users', icon: Shield },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const isItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const renderItem = (item: { href: string; label: string; icon: typeof Book }) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex min-h-[56px] items-center justify-between border-b border-border p-6">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="whitespace-nowrap text-lg font-bold tracking-tight">Library</span>
        </Link>
        <button
          onClick={onClose}
          className="-mr-1 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <h2 className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Browse
        </h2>
        {memberItems.map(renderItem)}

        {isLibrarian && (
          <div className="pt-4">
            <h2 className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </h2>
            {adminItems.map(renderItem)}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
