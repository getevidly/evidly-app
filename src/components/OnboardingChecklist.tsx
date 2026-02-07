import { useEffect, useState } from 'react';
import { Check, X, ChevronRight, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '../hooks/useConfetti';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  link: string;
}

export function OnboardingChecklist() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const { triggerConfetti } = useConfetti();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchChecklistStatus();
    }
  }, [profile]);

  const fetchChecklistStatus = async () => {
    setLoading(true);
    const orgId = profile?.organization_id;

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', orgId);

    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('organization_id', orgId);

    const { data: equipment } = await supabase
      .from('temperature_equipment')
      .select('id')
      .eq('organization_id', orgId);

    const { data: documents } = await supabase
      .from('vendor_upload_requests')
      .select('id')
      .eq('organization_id', orgId);

    const { data: logs } = await supabase
      .from('temp_check_completions')
      .select('id')
      .eq('organization_id', orgId);

    const checklistItems: ChecklistItem[] = [
      {
        id: 'locations',
        label: 'Add your first location',
        completed: (locations?.length || 0) > 0,
        link: '/settings',
      },
      {
        id: 'team',
        label: 'Invite team members',
        completed: (users?.length || 0) > 1,
        link: '/team',
      },
      {
        id: 'equipment',
        label: 'Set up temperature equipment',
        completed: (equipment?.length || 0) > 0,
        link: '/temp-logs',
      },
      {
        id: 'vendors',
        label: 'Add vendor contacts',
        completed: (documents?.length || 0) > 0,
        link: '/vendors',
      },
      {
        id: 'logs',
        label: 'Complete first temperature log',
        completed: (logs?.length || 0) > 0,
        link: '/temp-logs',
      },
    ];

    setItems(checklistItems);

    const completedCount = checklistItems.filter((item) => item.completed).length;
    const wasComplete = isComplete;
    const nowComplete = completedCount === checklistItems.length;

    if (nowComplete && !wasComplete) {
      setIsComplete(true);
      setTimeout(() => {
        triggerConfetti('onboarding-complete');
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }, 500);
    } else if (completedCount >= checklistItems.length - 1 || org?.onboarding_completed) {
      setIsVisible(false);
    }

    setLoading(false);
  };

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  if (!isVisible || loading) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {isComplete ? 'Setup Complete!' : 'Getting Started'}
          </h3>
          <p className="text-sm text-gray-600">
            {isComplete
              ? 'Great job! Your account is fully set up.'
              : `Complete these steps to get the most out of EvidLY`}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completedCount} of {totalCount} completed
          </span>
          <span className="text-sm font-semibold text-[#1e4d6b]">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#1e4d6b] to-[#2a6a8f] transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-30 animate-shimmer"></div>
          </div>
          <svg
            className="absolute top-0 left-0 w-full h-full"
            style={{ left: `${progressPercentage}%`, transform: 'translateX(-50%)' }}
          >
            <circle
              cx="6"
              cy="6"
              r="6"
              fill="#d4af37"
              className={progressPercentage > 0 ? 'animate-pulse' : 'hidden'}
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
              item.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
            }`}
            onClick={() => !item.completed && navigate(item.link)}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  item.completed
                    ? 'bg-green-500 scale-110'
                    : 'bg-white border-2 border-gray-300'
                }`}
              >
                {item.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </div>
              <span
                className={`text-sm font-medium ${
                  item.completed ? 'text-green-900 line-through' : 'text-gray-900'
                }`}
              >
                {item.label}
              </span>
            </div>
            {!item.completed && <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}
