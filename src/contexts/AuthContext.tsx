import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { syncOrgToIntelligence } from '../lib/intelligenceBridge';

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  organization_id: string;
  avatar_url: string | null;
  role: string;
  points: number;
  first_login_at: string | null;
  last_login_at: string | null;
  onboarding_completed: boolean;
  is_suspended?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isEvidlyAdmin: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone: string, orgName: string, industryType?: string, industrySubtype?: string, qualificationFlags?: { k12_enrolled?: boolean; k12_enrolled_at?: string | null; sb1383_enrolled?: boolean; sb1383_enrolled_at?: string | null; org_type?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Override profile.organization_id during emulation */
  setOrgOverride: (orgId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgOverride, setOrgOverride] = useState<string | null>(null);

  // Computed profile — organization_id overridden during emulation
  const profile = useMemo(() => {
    if (!rawProfile) return null;
    if (!orgOverride) return rawProfile;
    return { ...rawProfile, organization_id: orgOverride };
  }, [rawProfile, orgOverride]);

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
      // AUDIT-FIX-05 / A-1: Enforce suspension — sign out immediately
      if (data.is_suspended) {
        console.warn('[AuthContext] User is suspended:', userId);
        await supabase.auth.signOut();
        setRawProfile(null);
        setUser(null);
        setSession(null);
        window.location.href = '/suspended';
        return;
      }

      if (!data.organization_id) {
        console.warn('[AuthContext] fetchProfile: organization_id is null for user', userId, '— check user_location_access row exists');
      }
      setRawProfile(data);
    } else {
      console.warn('[AuthContext] fetchProfile failed or empty:', { userId, error: error?.message, data });
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
          setRawProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Intelligence bridge sync (fire-and-forget on profile load) ──
  const intelligenceSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    const orgId = profile?.organization_id;
    if (!orgId) return;
    // Only sync once per org per session
    if (intelligenceSyncedRef.current === orgId) return;
    intelligenceSyncedRef.current = orgId;

    (async () => {
      try {
        const [{ data: org }, { data: locations }] = await Promise.all([
          supabase.from('organizations').select('name, subscription_tier').eq('id', orgId).maybeSingle(),
          supabase.from('locations').select('name, jurisdiction_id, county').eq('organization_id', orgId),
        ]);

        syncOrgToIntelligence({
          orgId,
          orgName: org?.name || '',
          subscriptionTier: org?.subscription_tier || 'founder',
          jurisdictionIds: (locations || []).map((l: any) => l.jurisdiction_id).filter(Boolean),
          locationCounties: (locations || []).map((l: any) => l.county).filter(Boolean),
          locationNames: (locations || []).map((l: any) => l.name),
          complianceSnapshot: null, // pushed separately when scores calculate
        }).catch(() => {}); // explicit catch — never throw
      } catch {
        // silent — Intelligence sync must never break auth
      }
    })();
  }, [profile?.organization_id]);

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

  const signUp = async (email: string, password: string, fullName: string, phone: string, orgName: string, industryType?: string, industrySubtype?: string, qualificationFlags?: { k12_enrolled?: boolean; k12_enrolled_at?: string | null; sb1383_enrolled?: boolean; sb1383_enrolled_at?: string | null; org_type?: string }) => {
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
        org_type: qualificationFlags?.org_type || 'standard',
        k12_enrolled: qualificationFlags?.k12_enrolled || false,
        k12_enrolled_at: qualificationFlags?.k12_enrolled_at || null,
        sb1383_enrolled: qualificationFlags?.sb1383_enrolled || false,
        sb1383_enrolled_at: qualificationFlags?.sb1383_enrolled_at || null,
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
    setRawProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isEvidlyAdmin = Boolean(user?.email?.endsWith('@getevidly.com'));
  const isAdmin = isEvidlyAdmin || profile?.role === 'platform_admin';

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, isEvidlyAdmin, isAdmin, signIn, signUp, signOut, refreshProfile, setOrgOverride }}
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
