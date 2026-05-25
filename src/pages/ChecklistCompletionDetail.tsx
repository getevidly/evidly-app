import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, XCircle, Camera, Thermometer, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CompletionDetail {
  id: string;
  instance_id: string;
  location_id: string;
  completed_by: string;
  completed_at: string | null;
  score_percentage: number | null;
  notes: string | null;
  status: string | null;
  checklist_name: string;
  cadence: string;
  location_name: string;
  completed_by_name: string;
}

interface ItemWithResponse {
  item_id: string;
  title: string;
  order: number;
  response_id: string | null;
  response_value: string | null;
  is_pass: boolean | null;
  photo_url: string | null;
  temperature_reading: number | null;
  corrective_action: string | null;
  responded_at: string | null;
}

export function ChecklistCompletionDetail() {
  const { completionId } = useParams<{ completionId: string }>();
  const navigate = useNavigate();

  const [completion, setCompletion] = useState<CompletionDetail | null>(null);
  const [items, setItems] = useState<ItemWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!completionId) return;

    async function fetchCompletion() {
      try {
        setLoading(true);
        setError(null);

        const { data: c, error: cErr } = await supabase
          .from('customer_checklist_instance_completions')
          .select(`
            id, instance_id, location_id, completed_by, completed_at,
            score_percentage, notes, status,
            customer_checklist_instances (
              name_override,
              cadence_override,
              master_checklist_definitions ( name, cadence )
            ),
            locations ( name )
          `)
          .eq('id', completionId)
          .maybeSingle();

        if (cErr) throw cErr;
        if (!c) {
          setError('Completion not found');
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', c.completed_by)
          .maybeSingle();

        const completedByName = profile?.full_name || 'Unknown';

        const instance = Array.isArray(c.customer_checklist_instances)
          ? c.customer_checklist_instances[0]
          : c.customer_checklist_instances;
        const masterDef = instance?.master_checklist_definitions;
        const location = Array.isArray(c.locations)
          ? c.locations[0]
          : c.locations;

        setCompletion({
          id: c.id,
          instance_id: c.instance_id,
          location_id: c.location_id,
          completed_by: c.completed_by,
          completed_at: c.completed_at,
          score_percentage: c.score_percentage,
          notes: c.notes,
          status: c.status,
          checklist_name: instance?.name_override || masterDef?.name || 'Unknown Checklist',
          cadence: instance?.cadence_override || masterDef?.cadence || 'on_demand',
          location_name: location?.name || 'Unknown Location',
          completed_by_name: completedByName,
        });

        const { data: itemRows, error: iErr } = await supabase
          .from('customer_checklist_instance_items')
          .select('id, master_item_id, master_checklist_definition_items(sort_order, prompt, display_label)')
          .eq('instance_id', c.instance_id)
          .eq('is_active', true);

        if (iErr) throw iErr;

        const { data: respRows, error: rErr } = await supabase
          .from('customer_checklist_instance_responses')
          .select('id, master_item_id, response_value, is_pass, photo_url, temperature_reading, corrective_action, responded_at')
          .eq('completion_id', completionId);

        if (rErr) throw rErr;

        const respByItem = new Map(
          (respRows || []).map(r => [r.master_item_id, r])
        );

        const mappedItems = (itemRows || []).map(item => {
          const mi = item.master_checklist_definition_items;
          const r = respByItem.get(item.master_item_id);
          return {
            item_id: item.id,
            title: mi?.display_label || mi?.prompt || 'Untitled',
            order: mi?.sort_order ?? 0,
            response_id: r?.id ?? null,
            response_value: r?.response_value ?? null,
            is_pass: r?.is_pass ?? null,
            photo_url: r?.photo_url ?? null,
            temperature_reading: r?.temperature_reading ?? null,
            corrective_action: r?.corrective_action ?? null,
            responded_at: r?.responded_at ?? null,
          };
        });
        mappedItems.sort((a, b) => a.order - b.order);
        setItems(mappedItems);
      } catch (err) {
        console.error('Error loading completion:', err);
        setError('Failed to load completion details');
      } finally {
        setLoading(false);
      }
    }

    fetchCompletion();
  }, [completionId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-[#1E2D4D]/50">Loading completion details...</div>
      </div>
    );
  }

  if (error || !completion) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/checklists')}
          className="flex items-center text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D] mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Checklists
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error || 'Completion not found'}
        </div>
      </div>
    );
  }

  const passCount = items.filter(i => i.is_pass === true).length;
  const failCount = items.filter(i => i.is_pass === false).length;
  const unansweredCount = items.filter(i => i.response_id === null).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/checklists')}
        className="flex items-center text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D]"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Checklists
      </button>

      <div>
        <h1 className="text-2xl font-bold text-[#1E2D4D]">{completion.checklist_name}</h1>
        <div className="text-sm text-[#1E2D4D]/50 mt-1 capitalize">
          {completion.cadence.replace('_', ' ')}
        </div>
      </div>

      <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-[#1E2D4D]/50 text-xs uppercase">Completed By</div>
          <div className="text-[#1E2D4D] font-medium mt-1">{completion.completed_by_name}</div>
        </div>
        <div>
          <div className="text-[#1E2D4D]/50 text-xs uppercase">Completed At</div>
          <div className="text-[#1E2D4D] font-medium mt-1">
            {completion.completed_at
              ? format(new Date(completion.completed_at), 'MMM d, yyyy h:mm a')
              : '—'}
          </div>
        </div>
        <div>
          <div className="text-[#1E2D4D]/50 text-xs uppercase">Score</div>
          <div className="text-[#1E2D4D] font-medium mt-1">
            {completion.score_percentage ?? 0}% ({passCount}/{items.length})
          </div>
        </div>
        <div>
          <div className="text-[#1E2D4D]/50 text-xs uppercase">Location</div>
          <div className="text-[#1E2D4D] font-medium mt-1">{completion.location_name}</div>
        </div>
      </div>

      {completion.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-xs uppercase text-amber-800 font-medium mb-1">Notes</div>
          <div className="text-sm text-amber-900">{completion.notes}</div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#1E2D4D]">
          Items ({items.length}) — {passCount} passed, {failCount} failed
          {unansweredCount > 0 && `, ${unansweredCount} unanswered`}
        </h2>

        {items.map((item, idx) => (
          <div
            key={item.item_id}
            className="bg-white border border-[#1E2D4D]/10 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {item.response_id === null ? (
                  <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-[#1E2D4D]/10 text-[#1E2D4D]/40 text-xs">
                    {idx + 1}
                  </span>
                ) : item.is_pass === true ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : item.is_pass === false ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-[#1E2D4D]/10 text-[#1E2D4D]/70 text-xs">
                    {idx + 1}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1E2D4D]">{item.title}</div>
                {item.response_id === null ? (
                  <div className="text-xs text-[#1E2D4D]/40 mt-1 italic">Not answered</div>
                ) : (
                  <div className="text-xs text-[#1E2D4D]/60 mt-1">
                    {item.response_value}
                    {item.responded_at && (
                      <span className="ml-2 text-[#1E2D4D]/40">
                        · {format(new Date(item.responded_at), 'h:mm a')}
                      </span>
                    )}
                  </div>
                )}

                {item.temperature_reading !== null && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs bg-[#FAF7F0] text-[#1E2D4D]/80 px-2 py-1 rounded-full">
                    <Thermometer className="w-3 h-3" /> {item.temperature_reading}°
                  </div>
                )}

                {item.photo_url && (
                  <div className="mt-2">
                    <a
                      href={item.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#A08C5A] hover:underline"
                    >
                      <Camera className="w-3 h-3" /> View photo
                    </a>
                  </div>
                )}

                {item.corrective_action && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{item.corrective_action}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChecklistCompletionDetail;
