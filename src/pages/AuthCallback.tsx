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

          // Create a default organization
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert([{ name: `${fullName}'s Organization` }])
            .select()
            .single();

          if (orgError) {
            console.error('Org creation error:', orgError);
            // Still route to dashboard — profile creation will be handled on first access
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
            role: 'admin',
            first_login_at: now,
            last_login_at: now,
          }]);

          // Create user location access
          await supabase.from('user_location_access').insert([{
            user_id: authUser.id,
            organization_id: orgData.id,
            role: 'admin',
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
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto"></div>
            <p className="mt-4 text-lg font-medium text-gray-900">Signing you in...</p>
            <p className="mt-1 text-sm text-gray-500">Please wait</p>
          </>
        )}
      </div>
    </div>
  );
}
