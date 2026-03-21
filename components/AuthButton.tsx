'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Cloud,
  CloudOff,
  LogOut,
  User,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { SyncStatus } from '@/lib/syncManager';

interface AuthButtonProps {
  syncStatus?: SyncStatus;
  onSync?: () => void;
}

export default function AuthButton({ syncStatus = 'idle', onSync }: AuthButtonProps) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
    );
  }

  // Not signed in — show compact sign-in button
  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-gray-800/90
                   backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-full
                   hover:bg-white dark:hover:bg-gray-700 transition-all
                   text-gray-700 dark:text-gray-300 text-sm font-medium shadow-sm
                   hover:shadow-md"
      >
        <Cloud className="w-4 h-4 text-blue-500" />
        <span className="hidden sm:inline">Sync</span>
      </button>
    );
  }

  // Signed in — show avatar with dropdown
  const syncColor =
    syncStatus === 'syncing' ? 'text-blue-500' :
    syncStatus === 'synced' ? 'text-green-500' :
    syncStatus === 'error' ? 'text-red-500' :
    'text-gray-400';

  const SyncIcon =
    syncStatus === 'syncing' ? RefreshCw :
    syncStatus === 'synced' ? Check :
    syncStatus === 'error' ? AlertCircle :
    Cloud;

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
                   border border-gray-200 dark:border-gray-600 rounded-full pl-1.5 pr-2 py-1.5
                   shadow-sm hover:shadow-md transition-all"
      >
        {session.user?.image ? (
          <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <User className="w-6 h-6 p-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
        )}
        <SyncIcon className={`w-3.5 h-3.5 ${syncColor} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {session.user?.image ? (
                <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <User className="w-10 h-10 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.user?.email || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Sync status */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SyncIcon className={`w-4 h-4 ${syncColor} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {syncStatus === 'syncing' ? 'Syncing...' :
                   syncStatus === 'synced' ? 'All synced' :
                   syncStatus === 'error' ? 'Sync failed' :
                   'Cloud sync ready'}
                </span>
              </div>
              {onSync && syncStatus !== 'syncing' && (
                <button
                  onClick={() => { onSync(); setMenuOpen(false); }}
                  className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium"
                >
                  Sync now
                </button>
              )}
            </div>
            {syncStatus === 'error' && (
              <p className="text-xs text-red-500 mt-1.5">
                Could not reach cloud. Your data is safe locally.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
