import { useState } from 'react';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { VoiceIntroTooltip } from './VoiceIntroTooltip';

const VOICE_ROLES = ['kitchen_staff', 'chef', 'kitchen_manager', 'owner_operator'];

export function VoiceButton({ orgId, locationId, size = 'lg' }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !localStorage.getItem('evidly_voice_intro');
    } catch {
      return false;
    }
  });

  if (!VOICE_ROLES.includes(profile?.role)) return null;

  function showResult(message, type = 'success') {
    setFeedback(message);
    setFeedbackType(type);
    setShowFeedback(true);
    try {
      navigator.vibrate?.(type === 'success' ? [50, 30, 50] : [100]);
    } catch { /* vibrate not available */ }
    setTimeout(() => setShowFeedback(false), 3500);
  }

  function dismissIntro() {
    setShowIntro(false);
    try {
      localStorage.setItem('evidly_voice_intro', 'true');
    } catch { /* noop */ }
  }

  async function handleCommand(action) {
    // Dismiss intro on first command
    if (showIntro) dismissIntro();

    switch (action.type) {

      case 'LOG_TEMP': {
        const { error } = await supabase.from('temperature_logs').insert({
          org_id: orgId,
          location_id: locationId,
          equipment_name: action.equipment,
          temperature: action.temperature,
          unit: action.unit,
          logged_by: profile?.id,
          source: 'voice',
          logged_at: new Date().toISOString(),
        });
        if (!error) {
          showResult(`${action.equipment}: ${action.temperature}\u00B0F logged`, 'success');
        } else {
          showResult('Could not save temp log \u2014 try again', 'error');
        }
        break;
      }

      case 'START_CHECKLIST': {
        navigate(`/checklists?type=${action.checklistType}&voice=true`);
        showResult(`Opening ${action.checklistType} checklist`, 'info');
        break;
      }

      case 'COMPLETE_ITEM': {
        showResult(`Marking "${action.itemName}" complete`, 'info');
        break;
      }

      case 'NEXT_TASK': {
        navigate('/dashboard?voice=next-task');
        showResult('Checking your next task...', 'info');
        break;
      }

      case 'OPEN_CA': {
        const { data, error } = await supabase.from('corrective_actions').insert({
          org_id: orgId,
          location_id: locationId,
          title: action.description || action.category,
          category: action.category,
          description: action.description,
          severity: 'high',
          status: 'open',
          source: 'voice',
          created_by: profile?.id,
        }).select().single();
        if (!error && data) {
          showResult(`Corrective action created: ${action.category}`, 'success');
          navigate(`/corrective-actions/${data.id}`);
        } else {
          showResult('Could not create corrective action', 'error');
        }
        break;
      }

      case 'RESOLVE_CA': {
        showResult('Navigate to corrective actions to resolve', 'info');
        navigate('/corrective-actions');
        break;
      }

      case 'SHIFT_HANDOFF': {
        navigate('/shift-handoff?voice=true');
        showResult('Starting shift handoff...', 'info');
        break;
      }

      case 'UNKNOWN': {
        showResult("Didn't catch that \u2014 try again", 'error');
        break;
      }
    }
  }

  const { isListening, isSupported, startListening, stopListening } = useVoiceCommand({
    onCommand: handleCommand,
    onTranscript: setTranscript,
    onError: (err) => showResult(err, 'error'),
  });

  if (!isSupported) return null;

  const btnSize = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const iconSize = size === 'lg' ? 24 : 18;

  return (
    <div className="relative flex flex-col items-center">
      {/* Intro tooltip — shown once */}
      {showIntro && <VoiceIntroTooltip onDismiss={dismissIntro} />}

      <button
        onPointerDown={startListening}
        onPointerUp={stopListening}
        onPointerLeave={stopListening}
        className={`${btnSize} rounded-full flex items-center justify-center
                    transition-all duration-200 active:scale-95
                    ${isListening
                      ? 'bg-[#A08C5A] shadow-lg ring-4 ring-[#A08C5A]/30'
                      : 'bg-[#1E2D4D] hover:bg-[#2a3d6b]'
                    }`}
        aria-label="Voice command"
      >
        {/* Mic icon */}
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none"
             stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>

        {/* Pulse ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-[#A08C5A]/20 animate-ping" />
        )}
      </button>

      {/* Listening label */}
      {isListening && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        bg-[#A08C5A] text-white text-xs font-medium px-3 py-1 rounded-full">
          Listening...
        </div>
      )}

      {/* Transcript bubble */}
      {transcript && !isListening && !showFeedback && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                        bg-[#1E2D4D] text-white text-xs px-3 py-1.5 rounded-lg max-w-[200px]
                        truncate">
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Feedback toast */}
      {showFeedback && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50
                         px-4 py-3 rounded-xl text-sm font-medium shadow-lg
                         transition-all duration-300 whitespace-nowrap
                         ${feedbackType === 'success'
                           ? 'bg-[#166534] text-white'
                           : feedbackType === 'error'
                             ? 'bg-[#991B1B] text-white'
                             : 'bg-[#1E2D4D] text-white'
                         }`}>
          {feedback}
        </div>
      )}
    </div>
  );
}
