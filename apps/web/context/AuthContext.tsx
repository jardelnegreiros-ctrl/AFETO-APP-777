'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  token: string | null;
  user: { id: string; email: string; name: string } | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (session?.token) {
      setToken(session.token as string);
    } else {
      setToken(null);
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user: session?.user || null,
        isLoading: status === 'loading',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}