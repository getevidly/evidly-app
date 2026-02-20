import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MapPin, Thermometer, CheckSquare, FileText, Users, QrCode, PartyPopper, Plus } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { INDUSTRY_TEMPLATES, getCategoryLabel, TemplateItem } from '../config/industryTemplates';
import { toast } from 'sonner';
import { lookupJurisdiction, linkJurisdictionToLocation } from '../utils/jurisdictionLookup';

const steps = [
  { id: 1, name: 'Welcome', icon: () => <EvidlyIcon size={20} /> },
  { id: 2, name: 'Org Details', icon: () => <EvidlyIcon size={20} /> },
  { id: 3, name: 'Add Location', icon: MapPin },
  { id: 4, name: 'Equipment', icon: Thermometer },
  { id: 5, name: 'Checklists', icon: CheckSquare },
  { id: 6, name: 'Documents', icon: FileText },
  { id: 7, name: 'Team', icon: Users },
  { id: 8, name: 'QR Codes', icon: QrCode },
  { id: 9, name: 'Done', icon: PartyPopper },
];

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [equipment, setEquipment] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamPhone, setTeamPhone] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'both'>('sms');
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [industryType, setIndustryType] = useState<string>('');
  const [customItems, setCustomItems] = useState<{ [category: string]: string }>({});
  const { profile, refreshProfile } = useAuth();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.organization_id) {
      const fetchOnboardingProgress = async () => {
        const { data } = await supabase
          .from('organizations')
          .select('onboarding_step, onboarding_completed, industry_type, industry_subtype')
          .eq('id', profile.organization_id)
          .maybeSingle();

        if (data?.onboarding_completed) {
          navigate('/dashboard');
        } else if (data?.onboarding_step) {
          setCurrentStep(data.onboarding_step);
        }

        if (data?.industry_subtype) {
          const templateKey = data.industry_subtype.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
          setIndustryType(data.industry_subtype);
          const template = INDUSTRY_TEMPLATES[templateKey];
          if (template) {
            setTemplateItems(template.items);
          }
        }
      };
      fetchOnboardingProgress();
    }
  }, [profile, navigate]);

  const updateOnboardingStep = async (step: number) => {
    if (isDemoMode || !profile?.organization_id) return;
    await supabase
      .from('organizations')
      .update({ onboarding_step: step })
      .eq('id', profile.organization_id);
  };

  const completeOnboarding = async () => {
    if (isDemoMode || !profile?.organization_id) return;
    await supabase
      .from('organizations')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', profile.organization_id);
  };

  const toggleTemplateItem = (index: number) => {
    const updatedItems = [...templateItems];
    updatedItems[index].enabled = !updatedItems[index].enabled;
    setTemplateItems(updatedItems);
  };

  const addCustomItem = (category: string) => {
    const itemName = customItems[category];
    if (itemName && itemName.trim()) {
      const newItem: TemplateItem = {
        name: itemName.trim(),
        enabled: true,
        required: false,
        custom: true,
        category: category as any,
      };
      setTemplateItems([...templateItems, newItem]);
      setCustomItems({ ...customItems, [category]: '' });
    }
  };

  const saveChecklistItems = async () => {
    if (isDemoMode || !profile?.organization_id) return;

    const enabledItems = templateItems.filter(item => item.enabled).map(item => ({
      organization_id: profile.organization_id,
      category: item.category,
      item_name: item.name,
      is_enabled: true,
      is_required: item.required,
      custom: item.custom || false,
    }));

    if (enabledItems.length > 0) {
      await supabase
        .from('onboarding_checklist_items')
        .insert(enabledItems);
    }
  };

  const groupItemsByCategory = () => {
    const grouped: { [key: string]: TemplateItem[] } = {};
    templateItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  };

  const handleNext = async () => {
    if (currentStep === 3 && locationName) {
      if (!isDemoMode && profile?.organization_id) {
        const { data: insertedLocation } = await supabase.from('locations').insert([
          {
            organization_id: profile.organization_id,
            name: locationName,
            address: locationAddress,
          },
        ]).select('id').single();

        // Auto-detect jurisdiction for the new location
        // SUGGESTION: Add geocoding to parse address into city/county/state/zip components
        if (insertedLocation?.id && locationAddress) {
          try {
            const matches = await lookupJurisdiction(locationAddress, '', '', 'CA', '');
            if (matches.length > 0) {
              await linkJurisdictionToLocation(insertedLocation.id, matches);
            }
          } catch {
            // Non-blocking — jurisdiction detection is best-effort during onboarding
          }
        }
      }
      setLocationName('');
      setLocationAddress('');
    }

    if (currentStep === 4 || currentStep === 5 || currentStep === 6) {
      await saveChecklistItems();
    }

    if (currentStep < 9) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingStep(nextStep);
    } else {
      await completeOnboarding();
      navigate('/dashboard');
    }
  };

  const handleSkip = async () => {
    if (currentStep < 9) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingStep(nextStep);
    } else {
      await completeOnboarding();
      navigate('/dashboard');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <EvidlyIcon size={96} className="mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to EvidLY</h2>
            <p className="text-lg text-gray-600 mb-8">
              Let's get your food safety compliance system set up. This will only take a few minutes.
            </p>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Organization Details</h2>
            <p className="text-gray-600 mb-6">Your organization is already set up. Let's continue with your locations.</p>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Your First Location</h2>
            <p className="text-gray-600 mb-6">Add a restaurant, kitchen, or facility to get started.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Main Street Restaurant"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address (Optional)</label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
            </div>
          </div>
        );

      case 4:
      case 5:
      case 6:
        const groupedItems = groupItemsByCategory();
        const categories = Object.keys(groupedItems);
        const stepCategory = currentStep === 4 ? 'temperature_logs' : currentStep === 5 ? 'checklists' : 'documents';
        const displayCategories = categories.filter(cat => {
          if (currentStep === 4) return cat === 'temperature_logs';
          if (currentStep === 5) return cat === 'checklists';
          if (currentStep === 6) return cat === 'documents' || cat === 'vendor_services';
          return false;
        });

        const stepTitles = {
          4: 'Set Up Temperature Monitoring',
          5: 'Configure Daily Operations',
          6: 'Set Up Documentation & Services',
        };

        const stepDescriptions = {
          4: 'We\'ve pre-selected common temperature monitoring points for your industry. Uncheck any that don\'t apply.',
          5: 'We\'ve pre-selected common checklists for your operations. Uncheck any that don\'t apply.',
          6: 'We\'ve pre-selected common documents and vendor services needed. Uncheck any that don\'t apply.',
        };

        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{stepTitles[currentStep]}</h2>
            {industryType && (
              <p className="text-sm text-[#d4af37] font-medium mb-4">
                {industryType} Template
              </p>
            )}
            <p className="text-gray-600 mb-6">{stepDescriptions[currentStep]}</p>

            <div className="space-y-6 max-h-[400px] overflow-y-auto">
              {displayCategories.map(category => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{getCategoryLabel(category)}</h3>
                  <div className="space-y-2">
                    {groupedItems[category].map((item, index) => {
                      const globalIndex = templateItems.findIndex(t => t.name === item.name && t.category === item.category);
                      return (
                        <label
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => toggleTemplateItem(globalIndex)}
                            className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] mt-1"
                          />
                          <span className={`flex-1 ${!item.required ? 'text-gray-500' : 'text-gray-900'}`}>
                            {item.name}
                            {item.custom && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                                Custom
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}

                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="Add custom item..."
                        value={customItems[category] || ''}
                        onChange={(e) => setCustomItems({ ...customItems, [category]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem(category)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomItem(category)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentStep === 6 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  I'll set this up later →
                </button>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invite Team Members</h2>
            <p className="text-gray-600 mb-6">Add your team to collaborate on compliance tasks.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={teamPhone}
                    onChange={(e) => setTeamPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send invite via
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteMethod('sms')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      inviteMethod === 'sms'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteMethod('email')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      inviteMethod === 'email'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteMethod('both')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      inviteMethod === 'both'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                SMS is recommended for kitchen staff who rarely check email
              </p>
            </div>
          </div>
        );

      case 8:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Print QR Codes</h2>
            <p className="text-gray-600 mb-6">Generate QR codes for equipment and locations for easy mobile access.</p>
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-300 text-center">
              <QrCode className="h-32 w-32 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Your QR codes will be generated after setup</p>
              <button onClick={() => toast.info('QR codes generated after setup is complete')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f]">
                Preview QR Codes
              </button>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="text-center">
            <PartyPopper className="h-24 w-24 text-[#d4af37] mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">You're All Set!</h2>
            <p className="text-lg text-gray-600 mb-8">
              Your EvidLY account is ready. Start logging temperatures, completing checklists, and staying compliant.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step.id < currentStep
                      ? 'bg-green-500 text-white'
                      : step.id === currentStep
                      ? 'bg-[#d4af37] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.id < currentStep ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 w-8 ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            {steps.map((step) => (
              <span key={step.id} className="w-10 text-center">
                {step.name.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">{renderStepContent()}</div>

        <div className="flex justify-between">
          <button
            onClick={handleSkip}
            className="px-6 py-2 border-2 border-[#1e4d6b] text-[#1e4d6b] rounded-md hover:bg-gray-50 bg-white"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === 3 && !locationName}
            className={`px-8 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
              currentStep === 9
                ? 'bg-[#1e4d6b] text-white hover:bg-[#2a6a8f] font-bold'
                : 'bg-[#1e4d6b] text-white hover:bg-[#2a6a8f]'
            }`}
          >
            {currentStep === 9 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
