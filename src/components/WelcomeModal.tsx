import { useEffect, useState } from 'react';
import { X, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface WelcomeModalProps {
  onDismiss: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  link: string;
  completed: boolean;
}

export function WelcomeModal({ onDismiss }: WelcomeModalProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'onboarding', label: 'Complete your organization setup', link: '/onboarding', completed: false },
    { id: 'temp_log', label: 'Log your first temperature reading', link: '/temp-logs', completed: false },
    { id: 'checklist', label: "Complete today's opening checklist", link: '/checklists', completed: false },
    { id: 'document', label: 'Upload your first compliance document', link: '/documents', completed: false },
    { id: 'team', label: 'Invite your team members', link: '/team', completed: false },
  ]);

  useEffect(() => {
    if (profile?.organization_id) {
      checkCompletionStatus();
    }
  }, [profile]);

  const checkCompletionStatus = async () => {
    const orgId = profile?.organization_id;

    const { data: org } = await supabase
      .from('organizations')
      .select('industry_type')
      .eq('id', orgId)
      .maybeSingle();

    const { data: tempLogs } = await supabase
      .from('temp_check_completions')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: checklistCompletions } = await supabase
      .from('checklist_template_completions')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: documents } = await supabase
      .from('vendor_upload_requests')
      .select('id')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .limit(1);

    const { data: invitations } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    setChecklist([
      { id: 'onboarding', label: 'Complete your organization setup', link: '/onboarding', completed: !!org?.industry_type },
      { id: 'temp_log', label: 'Log your first temperature reading', link: '/temp-logs', completed: (tempLogs?.length || 0) > 0 },
      { id: 'checklist', label: "Complete today's opening checklist", link: '/checklists', completed: (checklistCompletions?.length || 0) > 0 },
      { id: 'document', label: 'Upload your first compliance document', link: '/documents', completed: (documents?.length || 0) > 0 },
      { id: 'team', label: 'Invite your team members', link: '/team', completed: (invitations?.length || 0) > 0 },
    ]);
  };

  const handleItemClick = (link: string) => {
    navigate(link);
    onDismiss();
  };

  const completedCount = checklist.filter(item => item.completed).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome to EvidLY, {profile?.full_name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Here's how to get the most out of your compliance platform
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Getting Started Progress</span>
              <span className="text-sm text-gray-500">{completedCount}/{checklist.length} completed</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${(completedCount / checklist.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.link)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                  item.completed
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-blue-500 hover:shadow-sm'
                }`}
              >
                {item.completed ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${item.completed ? 'text-green-900' : 'text-gray-900'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {completedCount === checklist.length ? "Let's Go!" : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}
