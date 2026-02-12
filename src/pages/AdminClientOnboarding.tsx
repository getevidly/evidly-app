import { useState } from 'react';
import { Building2, MapPin, Users, Mail, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';

export function AdminClientOnboarding() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [orgName, setOrgName] = useState('');
  const [industryType, setIndustryType] = useState('Restaurant');
  const [industrySubtype, setIndustrySubtype] = useState('restaurant-full');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [locationCount, setLocationCount] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Demo mode: simulate success without writing to database
    if (isDemoMode) {
      setSuccess(`Client organization created successfully! An account claim email will be sent to ${ownerEmail}.`);
      setTimeout(() => {
        setOrgName(''); setOwnerName(''); setOwnerEmail(''); setOwnerPhone(''); setLocationCount(1); setSuccess('');
      }, 5000);
      setLoading(false);
      return;
    }

    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          industry_type: industryType,
          industry_subtype: industrySubtype,
          planned_location_count: locationCount,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: ownerName,
            user_type: 'restaurant',
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('user_profiles').insert({
          id: authData.user.id,
          full_name: ownerName,
          phone: ownerPhone,
          organization_id: orgData.id,
          role: 'owner',
        });

        await supabase.from('user_location_access').insert({
          user_id: authData.user.id,
          organization_id: orgData.id,
          role: 'owner',
        });
      }

      setSuccess(`Client organization created successfully! An account claim email will be sent to ${ownerEmail}.`);
      setTimeout(() => {
        setOrgName('');
        setOwnerName('');
        setOwnerEmail('');
        setOwnerPhone('');
        setLocationCount(1);
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to create client organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Client Onboarding' }]} />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Client Organization</h2>
            <p className="text-gray-600">
              Set up a new client organization with pre-populated data. The client will receive an email to claim their account.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#d4af37]" />
                Organization Details
              </h3>

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="Main Street Restaurant Group"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="industryType" className="block text-sm font-medium text-gray-700 mb-1">
                    Industry Type
                  </label>
                  <select
                    id="industryType"
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Catering">Catering</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="industrySubtype" className="block text-sm font-medium text-gray-700 mb-1">
                    Subtype
                  </label>
                  <select
                    id="industrySubtype"
                    value={industrySubtype}
                    onChange={(e) => setIndustrySubtype(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="restaurant-full">Full-Service</option>
                    <option value="restaurant-quick">Quick-Service</option>
                    <option value="hotel">Hotel</option>
                    <option value="healthcare">Healthcare/Senior Living</option>
                    <option value="education">K-12 Education</option>
                    <option value="catering">Catering</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="locationCount" className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Number of Locations
                </label>
                <input
                  id="locationCount"
                  type="number"
                  min="1"
                  required
                  value={locationCount}
                  onChange={(e) => setLocationCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d4af37]" />
                Primary Contact / Owner
              </h3>

              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="ownerName"
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email Address
                </label>
                <input
                  id="ownerEmail"
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="ownerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="ownerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The client will receive an email with instructions to claim their account and set their password. The organization will be pre-configured with industry-specific templates.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Create Client & Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
