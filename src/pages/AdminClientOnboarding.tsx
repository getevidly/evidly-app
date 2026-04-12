import { useState, useEffect } from 'react';
import { Building2, MapPin, Users, Mail, Send, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '../components/admin/AdminBreadcrumb';
import { useDemo } from '../contexts/DemoContext';

// 7 CA tribal jurisdictions seeded by CASINO-JIE-01 migration
const TRIBAL_OPTIONS = [
  { label: 'Table Mountain Rancheria', county: 'Fresno' },
  { label: 'Tachi-Yokut Tribe', county: 'Kings' },
  { label: 'Santa Ynez Band of Chumash', county: 'Santa Barbara' },
  { label: 'Morongo Band of Mission Indians', county: 'Riverside' },
  { label: 'Agua Caliente Band of Cahuilla Indians', county: 'Riverside' },
  { label: 'Pechanga Band of Luiseno Indians', county: 'Riverside' },
  { label: 'San Manuel Band of Mission Indians', county: 'San Bernardino' },
];

const DEFAULT_OUTLET_NAMES = [
  'Main Buffet', 'Steakhouse', 'Cafe', 'Sports Bar', 'Noodle Bar',
  'Food Court - Station 1', 'Food Court - Station 2', 'Banquet Kitchen',
  'Employee Dining', 'Pool Bar & Grill', 'VIP Lounge', 'Bakery',
  'Sushi Bar', 'Pizza Station', 'Grab & Go',
];

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

  // Tribal casino fields
  const [selectedTribe, setSelectedTribe] = useState('');
  const [outletCount, setOutletCount] = useState(5);

  const isTribal = industryType === 'tribal_casino';

  // When tribal casino selected, default subtype
  useEffect(() => {
    if (isTribal) {
      setIndustrySubtype('tribal-casino');
      setLocationCount(1); // 1 property, multiple outlets
    }
  }, [isTribal]);

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
      // For tribal, look up jurisdiction IDs
      let tribalJurisdictionId: string | null = null;
      let countyJurisdictionId: string | null = null;

      if (isTribal && selectedTribe) {
        const tribe = TRIBAL_OPTIONS.find(t => t.label === selectedTribe);
        if (tribe) {
          // Find tribal TEHO jurisdiction
          const { data: tribalJ } = await supabase
            .from('jurisdictions')
            .select('id')
            .eq('tribal_entity_name', selectedTribe)
            .eq('governmental_level', 'tribal')
            .maybeSingle();

          tribalJurisdictionId = tribalJ?.id || null;

          // Find county jurisdiction for fire safety
          const { data: countyJ } = await supabase
            .from('jurisdictions')
            .select('id')
            .eq('county', tribe.county)
            .eq('governmental_level', 'county')
            .is('city', null)
            .maybeSingle();

          countyJurisdictionId = countyJ?.id || null;
        }
      }

      const orgInsert: Record<string, any> = {
        name: orgName,
        industry_type: industryType,
        industry_subtype: industrySubtype,
        planned_location_count: isTribal ? outletCount : locationCount,
        primary_contact_name: ownerName,
        primary_contact_email: ownerEmail,
        primary_contact_phone: ownerPhone || null,
        status: 'pending',
        plan: 'trial',
      };

      if (isTribal) {
        orgInsert.is_tribal = true;
        orgInsert.food_safety_mode = 'advisory';
        orgInsert.food_safety_authority = 'Tribal Environmental Health Office (TEHO)';
        orgInsert.food_safety_advisory_text =
          `Food safety compliance for this property is governed by the ` +
          `${selectedTribe || 'Tribal'} Environmental Health Office (TEHO) under tribal sovereignty. ` +
          `EvidLY tracks fire safety and operational compliance in full.`;
        if (tribalJurisdictionId) orgInsert.tribal_jurisdiction_id = tribalJurisdictionId;
        if (countyJurisdictionId) orgInsert.county_jurisdiction_id = countyJurisdictionId;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert(orgInsert)
        .select()
        .single();

      if (orgError) throw orgError;

      // Create outlet locations for tribal casinos
      if (isTribal && outletCount > 0) {
        const outlets = [];
        for (let i = 0; i < outletCount; i++) {
          outlets.push({
            organization_id: orgData.id,
            name: DEFAULT_OUTLET_NAMES[i] || `Outlet ${i + 1}`,
            status: 'active',
          });
        }
        await supabase.from('locations').insert(outlets);
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`,
          data: {
            full_name: ownerName,
            user_type: isTribal ? 'tribal_casino' : 'restaurant',
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
        setSelectedTribe('');
        setOutletCount(5);
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
      <AdminBreadcrumb crumbs={[{ label: 'Client Onboarding' }]} />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-2">Create Client Organization</h2>
            <p className="text-[#1E2D4D]/70">
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
            <div className="bg-[#FAF7F0] rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-[#1E2D4D] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#d4af37]" />
                Organization Details
              </h3>

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  placeholder={isTribal ? 'Table Mountain Casino Resort' : 'Main Street Restaurant Group'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="industryType" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    Industry Type
                  </label>
                  <select
                    id="industryType"
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Catering">Catering</option>
                    <option value="tribal_casino">Tribal Casino (Indian Gaming)</option>
                  </select>
                </div>

                {!isTribal && (
                  <div>
                    <label htmlFor="industrySubtype" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                      Subtype
                    </label>
                    <select
                      id="industrySubtype"
                      value={industrySubtype}
                      onChange={(e) => setIndustrySubtype(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                    >
                      <option value="restaurant-full">Full-Service</option>
                      <option value="restaurant-quick">Quick-Service</option>
                      <option value="hotel">Hotel</option>
                      <option value="healthcare">Healthcare/Senior Living</option>
                      <option value="education">K-12 Education</option>
                      <option value="catering">Catering</option>
                    </select>
                  </div>
                )}

                {isTribal && (
                  <div>
                    <label htmlFor="tribeName" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                      Tribe Name
                    </label>
                    <select
                      id="tribeName"
                      required
                      value={selectedTribe}
                      onChange={(e) => setSelectedTribe(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                    >
                      <option value="">Select tribe...</option>
                      {TRIBAL_OPTIONS.map(t => (
                        <option key={t.label} value={t.label}>
                          {t.label} ({t.county} County)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {isTribal ? (
                <div>
                  <label htmlFor="outletCount" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    Food Outlets per Property
                  </label>
                  <input
                    id="outletCount"
                    type="number"
                    min="1"
                    max="15"
                    required
                    value={outletCount}
                    onChange={(e) => setOutletCount(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  />
                  <p className="text-xs text-[#1E2D4D]/50 mt-1">
                    Typical casino properties have 5-15 food outlets (buffet, steakhouse, cafe, etc.)
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="locationCount" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
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
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  />
                </div>
              )}
            </div>

            {/* Tribal advisory mode info */}
            {isTribal && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">
                      Tribal Sovereignty — Advisory Food Safety Mode
                    </p>
                    <p className="text-sm text-amber-700">
                      Food safety compliance is governed by the Tribal Environmental Health Office (TEHO)
                      under tribal sovereignty. EvidLY will track fire safety and operational compliance in full.
                      Food safety intelligence will be set to advisory mode.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#FAF7F0] rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-[#1E2D4D] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d4af37]" />
                Primary Contact / Owner
              </h3>

              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Full Name
                </label>
                <input
                  id="ownerName"
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="ownerEmail" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email Address
                </label>
                <input
                  id="ownerEmail"
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="ownerPhone" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Phone Number
                </label>
                <input
                  id="ownerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
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
                className="flex-1 px-4 py-3 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
