'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';

const errorMessages: Record<string, { title: string; description: string; icon: 'config' | 'access' | 'network' }> = {
  Configuration: {
    title: 'Authentication Not Configured',
    description: 'Google sign-in is not set up yet. The app administrator needs to configure the AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, and AUTH_SECRET environment variables on Vercel.',
    icon: 'config',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in. Please try with a different Google account or contact support.',
    icon: 'access',
  },
  OAuthSignin: {
    title: 'Sign-in Failed',
    description: 'Could not start the Google sign-in process. This usually means the OAuth credentials are misconfigured. Check that your Google Cloud Console redirect URIs include this domain.',
    icon: 'config',
  },
  OAuthCallback: {
    title: 'Sign-in Callback Error',
    description: 'Google authentication completed but the callback failed. Ensure the redirect URI in Google Cloud Console matches your deployment URL exactly.',
    icon: 'config',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    description: 'This email is already associated with another sign-in method. Try signing in with your original method.',
    icon: 'access',
  },
  Default: {
    title: 'Authentication Error',
    description: 'Something went wrong during sign-in. Please try again. If the problem persists, the authentication service may be temporarily unavailable.',
    icon: 'network',
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorType = searchParams.get('error') || 'Default';
  const errorInfo = errorMessages[errorType] || errorMessages.Default;

  const IconComponent = errorInfo.icon === 'config' ? ShieldAlert : errorInfo.icon === 'access' ? AlertTriangle : WifiOff;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <IconComponent className="w-8 h-8 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {errorInfo.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {errorInfo.description}
          </p>

          {errorType !== 'Default' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 font-mono">
              Error code: {errorType}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            Cloud sync is optional. You can use the app without signing in — all data saves locally.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
