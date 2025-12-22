'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { setAuthTokenGetter } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setAuthTokenGetter(getToken);
      setReady(true);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Don't render children until Clerk is loaded and token getter is set
  if (!ready) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--taupe)] border-t-[var(--coffee)] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
