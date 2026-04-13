import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MapPin, Thermometer, CheckSquare, FileText, Users, QrCode, PartyPopper, Plus, Clock } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useOperatingHours, formatTime24to12, generateAllTimes } from '../contexts/OperatingHoursContext';
import { supabase } from '../lib/supabase';
import { INDUSTRY_TEMPLATES, getCategoryLabel, TemplateItem } from '../config/industryTemplates';
import { toast } from 'sonner';
import { lookupJurisdiction, linkJurisdictionToLocation } from '../utils/jurisdictionLookup';
import { GhostInput } from '../components/ai/GhostInput';
import { useCrispHide } from '../hooks/useCrisp';
import { usePageTitle } from '../hooks/usePageTitle';

const steps = [
  { id: 1, name: 'Welcome', icon: () => <EvidlyIcon size={20} /> },
  { id: 2, name: 'Org Details', icon: () => <EvidlyIcon size={20} /> },
  { id: 3, name: 'Add Location', icon: MapPin },
  { id: 4, name: 'Shifts', icon: Clock },
  { id: 5, name: 'Equipment', icon: Thermometer },
  { id: 6, name: 'Checklists', icon: CheckSquare },
  { id: 7, name: 'Documents', icon: FileText },
  { id: 8, name: 'Team', icon: Users },
  { id: 9, name: 'QR Codes', icon: QrCode },
  { id: 10, name: 'Done', icon: PartyPopper },
];

export function Onboarding() {
  useCrispHide();
  usePageTitle('Get Started');
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
  const [shiftOpenTime, setShiftOpenTime] = useState('06:00');
  const [shiftCloseTime, setShiftCloseTime] = useState('22:00');
  const [shiftChangeover, setShiftChangeover] = useState('14:00');
  const [savedLocationName, setSavedLocationName] = useState('');
  const { profile, refreshProfile } = useAuth();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const { setLocationHours, setShifts } = useOperatingHours();

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
      setSavedLocationName(locationName);
      if (!isDemoMode && profile?.organization_id) {
        const { data: insertedLocation } = await supabase.from('locations').insert([
          {
            organization_id: profile.organization_id,
            name: locationName,
            address: locationAddress,
          },
        ]).select('id').single();

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

    if (currentStep === 4) {
      const locName = savedLocationName || 'Main Location';
      setLocationHours([{
        locationName: locName,
        days: [false, true, true, true, true, true, false],
        openTime: shiftOpenTime,
        closeTime: shiftCloseTime,
      }]);
      setShifts([
        { id: 's-morning', name: 'Morning', locationName: locName, startTime: shiftOpenTime, endTime: shiftChangeover, days: [false, true, true, true, true, true, false] },
        { id: 's-evening', name: 'Evening', locationName: locName, startTime: shiftChangeover, endTime: shiftCloseTime, days: [false, true, true, true, true, true, false] },
      ]);
    }

    if (currentStep === 5 || currentStep === 6 || currentStep === 7) {
      await saveChecklistItems();
    }

    if (currentStep === 8 && teamEmail && !isDemoMode) {
      try {
        const inviteUrl = `${window.location.origin}/signup?invited=true`;
        await supabase.functions.invoke('send-team-invite', {
          body: {
            email: teamEmail,
            inviteUrl,
            role: 'kitchen_staff',
            inviterName: profile?.full_name || 'Your manager',
            organizationName: profile?.organization_name || 'your team',
          },
        });
        toast.success('Team invite sent!');
      } catch {
        toast.warning('Invite could not be sent — you can re-invite from the Team page.');
      }
    }

    if (currentStep < 10) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingStep(nextStep);
    } else {
      await completeOnboarding();
      navigate('/dashboard');
    }
  };

  const handleSkip = async () => {
    if (currentStep < 10) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingStep(nextStep);
    } else {
      await completeOnboarding();
      navigate('/dashboard');
    }
  };

  const allTimes = generateAllTimes();

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <EvidlyIcon size={96} className="mx-auto mb-6" />
            <h2 className="text-3xl font-bold tracking-tight text-[#1E2D4D] mb-4">Welcome to EvidLY</h2>
            <p className="text-lg text-[#1E2D4D]/70 mb-8">
              Let's get your food safety compliance system set up. This will only take a few minutes.
            </p>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-4">Organization Details</h2>
            <p className="text-[#1E2D4D]/70 mb-6">Your organization is already set up. Let's continue with your locations.</p>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-4">Add Your First Location</h2>
            <p className="text-[#1E2D4D]/70 mb-6">Add a restaurant, kitchen, or facility to get started.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Location Name</label>
                <GhostInput
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Main Street Restaurant"
                  className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  fieldLabel="Location Name"
                  formContext={{ address: locationAddress || '' }}
                  entityType="location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Address (Optional)</label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-4">Configure Shifts</h2>
            <p className="text-[#1E2D4D]/70 mb-6">
              Set your operating hours and shift changeover time. This determines when temperature checks and tasks are assigned.
            </p>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Opening Time</label>
                  <select
                    value={shiftOpenTime}
                    onChange={(e) => setShiftOpenTime(e.target.value)}
                    className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  >
                    {allTimes.filter(t => {
                      const h = parseInt(t.value.split(':')[0]);
                      return h >= 4 && h <= 12;
                    }).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Closing Time</label>
                  <select
                    value={shiftCloseTime}
                    onChange={(e) => setShiftCloseTime(e.target.value)}
                    className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  >
                    {allTimes.filter(t => {
                      const h = parseInt(t.value.split(':')[0]);
                      return h >= 16 || h === 0;
                    }).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Shift Changeover Time</label>
                <p className="text-xs text-[#1E2D4D]/50 mb-2">This is when your Morning shift ends and Evening shift begins.</p>
                <select
                  value={shiftChangeover}
                  onChange={(e) => setShiftChangeover(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                >
                  {allTimes.filter(t => {
                    const h = parseInt(t.value.split(':')[0]);
                    return h >= 10 && h <= 18;
                  }).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="bg-[#FAF7F0] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#1E2D4D] mb-3">Shift Preview</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white border border-[#1E2D4D]/10 rounded-md">
                    <span className="font-medium text-[#1E2D4D]">Morning Shift</span>
                    <span className="text-[#1E2D4D]/70">{formatTime24to12(shiftOpenTime)} — {formatTime24to12(shiftChangeover)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white border border-[#1E2D4D]/10 rounded-md">
                    <span className="font-medium text-[#1E2D4D]">Evening Shift</span>
                    <span className="text-[#1E2D4D]/70">{formatTime24to12(shiftChangeover)} — {formatTime24to12(shiftCloseTime)}</span>
                  </div>
                </div>
                <p className="text-xs text-[#1E2D4D]/50 mt-3">You can add more shifts and adjust days later in Settings.</p>
              </div>
            </div>
          </div>
        );

      case 5:
      case 6:
      case 7: {
        const groupedItems = groupItemsByCategory();
        const categories = Object.keys(groupedItems);
        const displayCategories = categories.filter(cat => {
          if (currentStep === 5) return cat === 'temperature_logs';
          if (currentStep === 6) return cat === 'checklists';
          if (currentStep === 7) return cat === 'documents' || cat === 'vendor_services';
          return false;
        });

        const stepTitles: Record<number, string> = {
          5: 'Set Up Temperature Monitoring',
          6: 'Configure Daily Operations',
          7: 'Set Up Documentation & Services',
        };

        const stepDescriptions: Record<number, string> = {
          5: 'We\'ve pre-selected common temperature monitoring points for your industry. Uncheck any that don\'t apply.',
          6: 'We\'ve pre-selected common checklists for your operations. Uncheck any that don\'t apply.',
          7: 'We\'ve pre-selected common documents and vendor services needed. Uncheck any that don\'t apply.',
        };

        return (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-2">{stepTitles[currentStep]}</h2>
            {industryType && (
              <p className="text-sm text-[#A08C5A] font-medium mb-4">
                {industryType} Template
              </p>
            )}
            <p className="text-[#1E2D4D]/70 mb-6">{stepDescriptions[currentStep]}</p>

            <div className="space-y-6 max-h-[400px] overflow-y-auto">
              {displayCategories.map(category => (
                <div key={category} className="bg-[#FAF7F0] rounded-xl p-4">
                  <h3 className="font-semibold text-[#1E2D4D] mb-3">{getCategoryLabel(category)}</h3>
                  <div className="space-y-2">
                    {groupedItems[category].map((item, index) => {
                      const globalIndex = templateItems.findIndex(t => t.name === item.name && t.category === item.category);
                      return (
                        <label
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-white border border-[#1E2D4D]/10 rounded-md hover:bg-[#FAF7F0] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => toggleTemplateItem(globalIndex)}
                            className="h-4 w-4 text-[#A08C5A] focus:ring-[#A08C5A] mt-1"
                          />
                          <span className={`flex-1 ${!item.required ? 'text-[#1E2D4D]/50' : 'text-[#1E2D4D]'}`}>
                            {item.name}
                            {item.custom && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#eef4f8', color: '#1E2D4D' }}>
                                Custom
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}

                    <div className="flex gap-2 mt-3">
                      <GhostInput
                        type="text"
                        placeholder="Add custom item..."
                        value={customItems[category] || ''}
                        onChange={(e) => setCustomItems({ ...customItems, [category]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem(category)}
                        className="flex-1 px-3 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] text-sm"
                        fieldLabel="Custom Item"
                        formContext={{}}
                        entityType="checklist"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomItem(category)}
                        className="px-3 py-2 bg-white border border-[#1E2D4D]/15 rounded-md hover:bg-[#FAF7F0] transition-colors"
                      >
                        <Plus className="w-4 h-4 text-[#1E2D4D]/70" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentStep === 7 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D]/90"
                >
                  I'll set this up later →
                </button>
              </div>
            )}
          </div>
        );
      }

      case 8:
        return (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-4">Invite Team Members</h2>
            <p className="text-[#1E2D4D]/70 mb-6">Add your team to collaborate on compliance tasks.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={teamPhone}
                    onChange={(e) => setTeamPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
                  Send invite via
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteMethod('sms')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      inviteMethod === 'sms'
                        ? 'bg-[#1E2D4D] text-white'
                        : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/10'
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteMethod('email')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      inviteMethod === 'email'
                        ? 'bg-[#1E2D4D] text-white'
                        : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/10'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteMethod('both')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      inviteMethod === 'both'
                        ? 'bg-[#1E2D4D] text-white'
                        : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/10'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#1E2D4D]/50">
                SMS is recommended for kitchen staff who rarely check email
              </p>
            </div>
          </div>
        );

      case 9:
        return (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-4">Print QR Codes</h2>
            <p className="text-[#1E2D4D]/70 mb-6">Generate QR codes for equipment and locations for easy mobile access.</p>
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#1E2D4D]/15 text-center">
              <QrCode className="h-32 w-32 text-[#1E2D4D]/30 mx-auto mb-4" />
              <p className="text-[#1E2D4D]/70 mb-4">Your QR codes will be generated after setup</p>
              <button onClick={() => toast.info('QR codes generated after setup is complete')} className="px-6 py-2 bg-[#1E2D4D] text-white rounded-md hover:bg-[#162340]">
                Preview QR Codes
              </button>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="text-center">
            <PartyPopper className="h-24 w-24 text-[#A08C5A] mx-auto mb-6" />
            <h2 className="text-3xl font-bold tracking-tight text-[#1E2D4D] mb-4">You're All Set!</h2>
            <p className="text-lg text-[#1E2D4D]/70 mb-8">
              Your EvidLY account is ready. Start logging temperatures, completing checklists, and staying compliant.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 px-4 sm:px-6 lg:px-8">
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
                      ? 'bg-[#A08C5A] text-white'
                      : 'bg-[#1E2D4D]/10 text-[#1E2D4D]/50'
                  }`}
                >
                  {step.id < currentStep ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 w-8 ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-[#1E2D4D]/8'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[#1E2D4D]/70">
            {steps.map((step) => (
              <span key={step.id} className="w-10 text-center">
                {step.name.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 mb-6">{renderStepContent()}</div>

        <div className="flex justify-between">
          {currentStep !== 4 ? (
            <button
              onClick={handleSkip}
              className="px-6 py-2 border-2 border-[#1E2D4D] text-[#1E2D4D] rounded-md hover:bg-[#FAF7F0] bg-white"
            >
              Skip
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={currentStep === 3 && !locationName}
            className={`px-8 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
              currentStep === 10
                ? 'bg-[#1E2D4D] text-white hover:bg-[#162340] font-bold'
                : 'bg-[#1E2D4D] text-white hover:bg-[#162340]'
            }`}
          >
            {currentStep === 10 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
