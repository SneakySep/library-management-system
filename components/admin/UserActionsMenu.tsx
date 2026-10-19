'use client';

import { useState } from 'react';
import {
  Ban,
  Eye,
  KeyRound,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

/** Whether Auth currently reports the account as banned. */
export function isUserSuspended(user: User) {
  return Boolean(
    user.banned_until && new Date(user.banned_until).getTime() > Date.now()
  );
}

interface UserActionsMenuProps {
  user: User;
  isSelf: boolean;
  onViewDetails: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleSuspend: (user: User) => void;
  onDelete: (user: User) => void;
}

/** Kebab menu with the per-user admin actions (suspend, reset, delete…). */
export function UserActionsMenu({
  user,
  isSelf,
  onViewDetails,
  onResetPassword,
  onToggleSuspend,
  onDelete,
}: UserActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const suspended = isUserSuspended(user);
  const name = user.full_name?.trim() || user.email || 'this user';

  const run = (action: (user: User) => void) => {
    setOpen(false);
    action(user);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Actions for ${name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <MenuItem icon={Eye} onClick={() => run(onViewDetails)}>
          View details
        </MenuItem>
        <MenuItem icon={KeyRound} onClick={() => run(onResetPassword)}>
          Send password reset
        </MenuItem>
        {suspended ? (
          <MenuItem icon={RotateCcw} onClick={() => run(onToggleSuspend)}>
            Reactivate account
          </MenuItem>
        ) : (
          <MenuItem
            icon={Ban}
            destructive
            disabled={isSelf}
            title={isSelf ? "You can't suspend your own account" : undefined}
            onClick={() => run(onToggleSuspend)}
          >
            Suspend account
          </MenuItem>
        )}
        <div className="my-1 h-px bg-border" />
        <MenuItem
          icon={Trash2}
          destructive
          disabled={isSelf}
          title={isSelf ? "You can't delete your own account" : undefined}
          onClick={() => run(onDelete)}
        >
          Delete account
        </MenuItem>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({
  icon: Icon,
  destructive,
  disabled,
  title,
  onClick,
  children,
}: {
  icon: typeof Eye;
  destructive?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-accent hover:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}
