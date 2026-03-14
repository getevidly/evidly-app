import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  org_id: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  /** The currently authenticated Supabase user, or null. */
  user: User | null;
  /** Extended profile row from `profiles` table. */
  profile: UserProfile | null;
  /** True while the initial session is being restored. */
  loading: boolean;
  /** Sign in with email + password. Throws on failure. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign out and clear session. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- fetch profile helper ---------- */
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, org_id, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[AuthContext] profile fetch error:', error.message);
        setProfile(null);
        return;
      }
      setProfile(data as UserProfile);
    } catch {
      setProfile(null);
    }
  }, []);

  /* ---------- session listener ---------- */
  useEffect(() => {
    // 1. Restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /* ---------- actions ---------- */
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  /* ---------- memoised value ---------- */
  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signIn, signOut }),
    [user, profile, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
