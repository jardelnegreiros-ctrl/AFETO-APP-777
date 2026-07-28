import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { User } from '../types';
import { db, initializeDatabase } from '../db';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'afeto_admin_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: () => void;

    async function checkExistingAuth() {
      try {
        await initializeDatabase();

        // Initial check for locally persisted session
        const savedUserId = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedUserId) {
          const foundUser = await db.users.get(savedUserId);
          if (foundUser && foundUser.active) {
            setUser(foundUser);
          }
        }
      } catch (err) {
        console.error('Error initializing DB:', err);
      }

      unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser) {
          const cleanEmail = fbUser.email?.toLowerCase() || '';
          let matchedUser = await db.users
            .where('email')
            .equalsIgnoreCase(cleanEmail)
            .first();

          if (!matchedUser) {
            const role = cleanEmail.includes('admin') ? 'admin' : 'funcionario';
            matchedUser = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário AFETO',
              email: cleanEmail,
              passwordHash: 'firebase_auth',
              role: role as any,
              active: true,
              createdAt: new Date().toISOString()
            };
            await db.users.put(matchedUser);
          }

          if (matchedUser.active) {
            setUser(matchedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, matchedUser.id);
          } else {
            await signOut(firebaseAuth);
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
        setIsLoading(false);
      });
    }

    checkExistingAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Attempt Firebase Authentication first
      let firebaseSuccess = false;
      try {
        await signInWithEmailAndPassword(firebaseAuth, cleanEmail, pass);
        firebaseSuccess = true;
      } catch (fbErr: any) {
        console.warn('Firebase Auth note:', fbErr?.code || fbErr?.message);

        // If user not found, try auto-provisioning
        if (
          fbErr.code === 'auth/user-not-found' ||
          fbErr.code === 'auth/invalid-credential'
        ) {
          const localUser = await db.users
            .where('email')
            .equalsIgnoreCase(cleanEmail)
            .first();

          if (localUser && localUser.passwordHash === pass) {
            try {
              await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, pass);
              firebaseSuccess = true;
            } catch (createErr) {
              console.warn('Firebase Auth user creation note:', createErr);
            }
          }
        }
      }

      // If Firebase Auth succeeded, return success (onAuthStateChanged will set state)
      if (firebaseSuccess && firebaseAuth.currentUser) {
        return { success: true };
      }

      // Local fallback auth check against Dexie DB (for seeded users or when email-pass provider isn't enabled)
      const localUser = await db.users
        .where('email')
        .equalsIgnoreCase(cleanEmail)
        .first();

      if (localUser && localUser.passwordHash === pass) {
        if (!localUser.active) {
          setIsLoading(false);
          return { success: false, message: 'Conta desativada. Fale com o administrador.' };
        }
        setUser(localUser);
        localStorage.setItem(AUTH_STORAGE_KEY, localUser.id);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, message: 'E-mail ou senha incorretos.' };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, message: 'Erro ao realizar login.' };
    }
  };

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (err) {
      console.error('Error signing out of Firebase:', err);
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

