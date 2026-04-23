import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Auth callback error:', sessionError);
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login?error=auth_failed'), 2000);
          return;
        }

        if (!session) {
          navigate('/login');
          return;
        }

        const authUser = session.user;

        // Check if this user already has a profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, organization_id')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profile) {
          // Existing user — update login timestamps
          const now = new Date().toISOString();
          await supabase
            .from('user_profiles')
            .update({ last_login_at: now })
            .eq('id', authUser.id);

          // Route based on user type
          const userType = authUser.user_metadata?.user_type;
          navigate(userType === 'vendor' ? '/vendor/dashboard' : '/dashboard', { replace: true });
        } else {
          // New OAuth user — create organization and profile
          const fullName = authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || '';
          const avatarUrl = authUser.user_metadata?.avatar_url || null;
          const provider = authUser.app_metadata?.provider || 'email';

          // Generate slug: lowercase org name + 6-char random suffix
          const orgName = `${fullName}'s Organization`;
          const generateSlug = (name: string) => {
            const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let suffix = '';
            for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
            return `${base}-${suffix}`;
          };

          // Create organization with slug — retry up to 3x on unique violation
          let orgData: { id: string } | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const slug = generateSlug(orgName);
            const { data: orgResult, error: orgError } = await supabase
              .from('organizations')
              .insert([{ name: orgName, slug }])
              .select()
              .single();

            if (!orgError) {
              orgData = orgResult;
              break;
            }
            if (orgError.code !== '23505' || !orgError.message?.includes('slug')) {
              console.error('Org creation error:', orgError);
              navigate('/dashboard', { replace: true });
              return;
            }
          }

          if (!orgData) {
            console.error('Failed to create org after 3 slug retries');
            navigate('/dashboard', { replace: true });
            return;
          }

          // Create user profile
          const now = new Date().toISOString();
          await supabase.from('user_profiles').insert([{
            id: authUser.id,
            full_name: fullName,
            organization_id: orgData.id,
            avatar_url: avatarUrl,
            role: 'owner_operator',
            first_login_at: now,
            last_login_at: now,
            terms_accepted_at: now,
          }]);

          // Create user location access
          await supabase.from('user_location_access').insert([{
            user_id: authUser.id,
            organization_id: orgData.id,
            role: 'owner',
          }]);

          // New user — could route to onboarding or dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback unexpected error:', err);
        setError('Something went wrong. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A08C5A] mx-auto"></div>
            <p className="mt-4 text-lg font-medium text-[#1E2D4D]">Signing you in...</p>
            <p className="mt-1 text-sm text-[#1E2D4D]/50">Please wait</p>
          </>
        )}
      </div>
    </div>
  );
}
