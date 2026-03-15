'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, Cloud, CloudOff, User } from 'lucide-react';
import { SyncStatus } from '@/lib/syncManager';

interface AuthButtonProps {
  syncStatus?: SyncStatus;
}

export default function AuthButton({ syncStatus = 'idle' }: AuthButtonProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80
                   backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg
                   hover:bg-white dark:hover:bg-gray-700 transition-colors
                   text-gray-700 dark:text-gray-300 text-sm font-medium shadow-sm"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign in to sync</span>
        <span className="sm:hidden">Sign in</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sync indicator */}
      {syncStatus !== 'idle' && (
        <div className="flex items-center gap-1">
          {syncStatus === 'syncing' && (
            <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
          )}
          {syncStatus === 'synced' && (
            <Cloud className="w-4 h-4 text-green-500" />
          )}
          {syncStatus === 'error' && (
            <CloudOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            {syncStatus === 'syncing' ? 'Syncing...' :
             syncStatus === 'synced' ? 'Synced' :
             'Sync failed'}
          </span>
        </div>
      )}

      {/* User avatar + sign out */}
      <div className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                      border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 shadow-sm">
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <User className="w-6 h-6 p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
        )}
        <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline max-w-[100px] truncate">
          {session.user?.name?.split(' ')[0]}
        </span>
        <button
          onClick={() => signOut()}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
