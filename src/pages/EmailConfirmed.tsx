import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Loader, AlertTriangle } from 'lucide-react';

type Status = 'verifying' | 'provisioning' | 'success' | 'error';

/** Generate slug: lowercase name + 6-char random suffix */
function generateSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${base}-${suffix}`;
}

/**
 * Provision org + profile + location access for a freshly confirmed user.
 * Reads signup form data from user_metadata written by signUp().
 * Returns null on success, or an error message string.
 */
async function provisionNewUser(userId: string, meta: Record<string, string>): Promise<string | null> {
  const orgName = meta.org_name;
  const state = meta.state || '';
  const fullName = meta.full_name || '';
  const phone = meta.phone || '';
  const kitchenType = meta.kitchen_type || '';
  const termsAcceptedAt = meta.terms_accepted_at || new Date().toISOString();

  // 1. Create organization with slug — retry up to 3x on unique violation
  let orgId: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug(orgName);
    const { data: orgResult, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: orgName, slug, state }])
      .select('id')
      .single();

    if (!orgError && orgResult) {
      orgId = orgResult.id;
      break;
    }
    if (orgError?.code !== '23505' || !orgError.message?.includes('slug')) {
      return orgError?.message || 'Failed to create organization';
    }
    // Slug collision — retry
  }

  if (!orgId) {
    return 'Failed to create organization after retries';
  }

  // 2. Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert([{
      id: userId,
      full_name: fullName,
      phone,
      organization_id: orgId,
      role: 'owner_operator',
      terms_accepted_at: termsAcceptedAt,
      first_login_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    }]);

  if (profileError) {
    return profileError.message || 'Failed to create profile';
  }

  // 3. Create user location access
  const { error: accessError } = await supabase
    .from('user_location_access')
    .insert([{
      user_id: userId,
      organization_id: orgId,
      role: 'owner',
    }]);

  if (accessError) {
    return accessError.message || 'Failed to create location access';
  }

  // 4. Clear transient signup metadata (keep full_name, kitchen_type)
  await supabase.auth.updateUser({
    data: {
      org_name: null,
      state: null,
      phone: null,
      terms_accepted_at: null,
    },
  });

  return null;
}

export function EmailConfirmed() {
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const provisioningRef = useRef(false);

  useEffect(() => {
    async function handleSession() {
      // Get current session (Supabase exchanges the token from the URL automatically)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Wait for auth state change
        return;
      }

      const user = session.user;
      const meta = (user.user_metadata || {}) as Record<string, string>;

      // If org_name is present in metadata → fresh signup, needs provisioning
      if (meta.org_name) {
        // Guard against double-provisioning
        if (provisioningRef.current) return;
        provisioningRef.current = true;

        setStatus('provisioning');

        // Check if profile already exists (e.g. user refreshed page after success)
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (existingProfile) {
          // Already provisioned — just redirect
          setStatus('success');
          setTimeout(() => navigate('/signup/locations', { replace: true }), 1500);
          return;
        }

        const err = await provisionNewUser(user.id, meta);
        if (err) {
          setStatus('error');
          setErrorMsg(err);
          provisioningRef.current = false;
          return;
        }

        setStatus('success');
        setTimeout(() => navigate('/signup/locations', { replace: true }), 1500);
      } else {
        // Returning user or OAuth user — just redirect
        setStatus('success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      }
    }

    // Listen for auth state change (token exchange from URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        handleSession();
      }
    });

    // Also check immediately (in case session already exists)
    handleSession();

    // Timeout: if nothing happens in 15 seconds, show error
    const timeout = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'verifying') {
          setErrorMsg('Verification timed out. The link may have expired.');
          return 'error';
        }
        return prev;
      });
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  const handleRetry = async () => {
    setStatus('provisioning');
    setErrorMsg('');
    provisioningRef.current = false;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setStatus('error');
      setErrorMsg('No active session. Please sign in again.');
      return;
    }

    const meta = (session.user.user_metadata || {}) as Record<string, string>;
    if (!meta.org_name) {
      // Metadata already cleared — profile may exist
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (existingProfile) {
        setStatus('success');
        setTimeout(() => navigate('/signup/locations', { replace: true }), 1500);
        return;
      }

      setStatus('error');
      setErrorMsg('Account setup data was lost. Please contact support.');
      return;
    }

    provisioningRef.current = true;
    const err = await provisionNewUser(session.user.id, meta);
    if (err) {
      setStatus('error');
      setErrorMsg(err);
      provisioningRef.current = false;
      return;
    }

    setStatus('success');
    setTimeout(() => navigate('/signup/locations', { replace: true }), 1500);
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-3xl font-bold tracking-tight">
            <span className="text-[#1E2D4D]">Evid</span>
            <span className="text-[#A08C5A]">LY</span>
          </span>
        </div>

        {status === 'verifying' && (
          <>
            <Loader className="h-12 w-12 text-[#1E2D4D] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Verifying your email...</h2>
            <p className="text-[#1E2D4D]/70">Just a moment.</p>
          </>
        )}

        {status === 'provisioning' && (
          <>
            <Loader className="h-12 w-12 text-[#A08C5A] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Setting up your account...</h2>
            <p className="text-[#1E2D4D]/70">Creating your organization and profile.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Email Confirmed!</h2>
            <p className="text-[#1E2D4D]/70">Redirecting you to finish setup...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle className="h-14 w-14 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Setup Issue</h2>
            <p className="text-[#1E2D4D]/70 mb-4">
              {errorMsg || 'Something went wrong during account setup.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-[#1E2D4D] text-white rounded-md hover:bg-[#162340]"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 border border-[#1E2D4D]/20 text-[#1E2D4D] rounded-md hover:bg-[#1E2D4D]/5"
              >
                Go to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
