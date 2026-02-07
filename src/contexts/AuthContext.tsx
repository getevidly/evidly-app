import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  organization_id: string;
  avatar_url: string | null;
  role: string;
  points: number;
  first_login_at: string | null;
  last_login_at: string | null;
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone: string, orgName: string, industryType?: string, industrySubtype?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const updateLoginTimestamps = async (userId: string) => {
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('first_login_at')
      .eq('id', userId)
      .maybeSingle();

    const now = new Date().toISOString();
    const updates: any = {
      last_login_at: now,
    };

    if (!currentProfile?.first_login_at) {
      updates.first_login_at = now;
    }

    await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      setProfile(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
        setLoading(false);
      })();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      await updateLoginTimestamps(data.user.id);
      await fetchProfile(data.user.id);
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, orgName: string, industryType?: string, industrySubtype?: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirmed`,
        data: {
          user_type: 'restaurant',
          full_name: fullName,
          industry_type: industryType,
          industry_subtype: industrySubtype,
        },
      },
    });

    if (authError || !authData.user) {
      return { error: authError };
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        name: orgName,
        industry_type: industryType || null,
        industry_subtype: industrySubtype || null,
      }])
      .select()
      .single();

    if (orgError) {
      return { error: orgError };
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: authData.user.id,
          full_name: fullName,
          phone: phone || null,
          organization_id: orgData.id,
          role: 'admin',
        },
      ]);

    if (profileError) {
      return { error: profileError };
    }

    const { error: accessError } = await supabase
      .from('user_location_access')
      .insert([
        {
          user_id: authData.user.id,
          organization_id: orgData.id,
          role: 'admin',
        },
      ]);

    if (accessError) {
      return { error: accessError };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
