/**
 * HACCP-AI-01 — AI-Based HACCP Plan Creation
 *
 * Three-phase flow:
 *   1. Intake form (kitchen type, menu, methods, equipment, allergens, populations)
 *   2. AI generation (streaming or demo fallback)
 *   3. Plan review (disclaimer, section display, save to documents, PDF)
 *
 * Demo mode: uses hardcoded plan text (no API call).
 * Production: calls ai-chat edge function with HACCP-specific system prompt.
 */

import { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Download,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSaveDocument } from '../../hooks/useSaveDocument';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

// ── Types ───────────────────────────────────────────────────────────

interface IntakeData {
  kitchenType: string;
  menuCategories: string[];
  cookingMethods: string[];
  equipment: string;
  allergens: string[];
  vulnerablePopulations: boolean;
  additionalNotes: string;
}

interface PlanSection {
  title: string;
  content: string;
}

type Phase = 'intake' | 'generating' | 'review';

// ── Constants ───────────────────────────────────────────────────────

const KITCHEN_TYPES = [
  'Full-Service Restaurant',
  'Quick-Service / Fast Food',
  'Catering / Commissary',
  'Hotel / Resort Kitchen',
  'Hospital / Healthcare',
  'School / University Dining',
  'Grocery / Deli',
  'Food Truck / Mobile',
  'Bakery / Pastry',
  'Bar / Lounge with Food',
];

const MENU_CATEGORIES = [
  'Poultry',
  'Beef / Pork',
  'Seafood / Shellfish',
  'Produce / Salads',
  'Dairy / Eggs',
  'Baked Goods',
  'Soups / Sauces',
  'Fried Foods',
  'Sushi / Raw Fish',
  'Desserts',
];

const COOKING_METHODS = [
  'Grilling',
  'Frying (deep / shallow)',
  'Baking / Roasting',
  'Steaming',
  'Sous Vide',
  'Smoking',
  'Cold Prep (no cook)',
  'Reheating / Holding',
];

const ALLERGEN_LIST = [
  'Peanuts',
  'Tree Nuts',
  'Milk / Dairy',
  'Eggs',
  'Wheat / Gluten',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
];

// ── Demo plan (used in demo mode instead of API call) ───────────────

const DEMO_PLAN_SECTIONS: PlanSection[] = [
  {
    title: '1. Product Description',
    content: `This HACCP plan covers the preparation and service of cooked protein items (poultry, beef, seafood), cold salads, and reheated/held items in a full-service restaurant kitchen. Products are prepared on-site from raw ingredients, cooked to required internal temperatures, and served hot or held for service. Cold items (salads, sushi) are prepared from pre-washed produce and maintained at or below 41\u00B0F.`,
  },
  {
    title: '2. Hazard Analysis',
    content: `Biological Hazards:
\u2022 Salmonella spp. in raw poultry \u2014 control: cooking to \u2265165\u00B0F for 15 seconds
\u2022 E. coli O157:H7 in ground beef \u2014 control: cooking to \u2265155\u00B0F for 15 seconds
\u2022 Vibrio spp. in raw shellfish \u2014 control: cooking to \u2265145\u00B0F; proper cold storage
\u2022 Listeria monocytogenes in ready-to-eat items \u2014 control: cold holding \u226441\u00B0F, date marking
\u2022 Norovirus from infected staff \u2014 control: handwashing, exclusion policy

Chemical Hazards:
\u2022 Allergen cross-contact (peanuts, shellfish, gluten) \u2014 control: dedicated prep areas, labeling
\u2022 Sanitizer residue on food-contact surfaces \u2014 control: test strips, proper dilution

Physical Hazards:
\u2022 Metal fragments from worn equipment \u2014 control: equipment inspection, can opener maintenance
\u2022 Glass from broken light covers \u2014 control: shatter-resistant bulbs in prep areas`,
  },
  {
    title: '3. Critical Control Points (CCPs)',
    content: `CCP-1: COOKING
\u2022 Hazard: Survival of pathogens due to insufficient cooking
\u2022 Critical Limit: Poultry \u2265165\u00B0F/15s; Ground meats \u2265155\u00B0F/15s; Seafood/whole cuts \u2265145\u00B0F/15s
\u2022 Monitoring: Check internal temp with calibrated thermometer for each batch
\u2022 Corrective Action: Continue cooking until critical limit is met; discard if quality is compromised
\u2022 Verification: Daily thermometer calibration; weekly cooking log review
\u2022 Records: Cooking temperature log (date, item, temp, initials)

CCP-2: HOT HOLDING
\u2022 Hazard: Pathogen growth in time/temperature-abused cooked food
\u2022 Critical Limit: \u2265135\u00B0F at all times during holding
\u2022 Monitoring: Check holding temps every 2 hours with calibrated thermometer
\u2022 Corrective Action: Reheat to 165\u00B0F within 2 hours if below 135\u00B0F; discard if held below 135\u00B0F for >4 hours
\u2022 Verification: Review holding logs daily; monthly equipment calibration
\u2022 Records: Hot holding temperature log

CCP-3: COLD HOLDING / REFRIGERATED STORAGE
\u2022 Hazard: Pathogen growth in improperly stored TCS foods
\u2022 Critical Limit: \u226441\u00B0F for refrigerated storage; \u22640\u00B0F for frozen storage
\u2022 Monitoring: Check walk-in/reach-in temps every 4 hours during operating hours
\u2022 Corrective Action: Move product to functioning unit; evaluate for safety if above 41\u00B0F for unknown duration
\u2022 Verification: Review cold storage logs daily; calibrate thermometers monthly
\u2022 Records: Cold storage temperature log

CCP-4: COOLING
\u2022 Hazard: Pathogen growth during slow cooling of cooked foods
\u2022 Critical Limit: 135\u00B0F to 70\u00B0F within 2 hours; 70\u00B0F to 41\u00B0F within next 4 hours (total 6 hours)
\u2022 Monitoring: Record temp at start of cooling, at 2-hour mark, and at 6-hour mark
\u2022 Corrective Action: If not 70\u00B0F by 2 hours, reheat to 165\u00B0F and restart cooling with smaller portions or ice bath
\u2022 Verification: Weekly review of cooling logs; quarterly staff retraining
\u2022 Records: Cooling temperature log`,
  },
  {
    title: '4. Monitoring Procedures',
    content: `Daily Monitoring Schedule:
\u2022 Opening: Verify cold storage temps (walk-in cooler, walk-in freezer, reach-in units)
\u2022 Every 2 hours: Check hot holding temps for all items on the line
\u2022 Every 4 hours: Check cold holding temps for all storage units
\u2022 Each batch: Measure internal cooking temp before service
\u2022 End of shift: Record all cooling items with start temp and time

Equipment Calibration:
\u2022 Thermometers: Ice-point calibration daily (32\u00B0F \u00B12\u00B0F)
\u2022 Thermocouples: Factory calibration annually
\u2022 Sanitizer test strips: Verify concentration each use (chlorine 50\u2013100 ppm; quat 200\u2013400 ppm per manufacturer)`,
  },
  {
    title: '5. Corrective Action Procedures',
    content: `When a critical limit is not met:
1. Immediately isolate the affected product
2. Determine if product can be safely corrected (recooked, reheated, moved to proper temp)
3. If product cannot be corrected, discard and document the discard
4. Identify and correct the root cause (equipment malfunction, staff error, procedure gap)
5. Document corrective action in the HACCP corrective action log
6. Notify the manager on duty within 30 minutes of discovery
7. Review with affected staff within 24 hours

Responsible parties: Shift lead initiates; kitchen manager verifies; owner/operator reviews weekly.`,
  },
  {
    title: '6. Verification Activities',
    content: `Daily:
\u2022 Manager reviews all temperature logs before end of shift
\u2022 Thermometer calibration check (ice point)

Weekly:
\u2022 HACCP coordinator reviews corrective action log
\u2022 Walk-through observation of CCP monitoring procedures

Monthly:
\u2022 Internal audit of HACCP records (completeness, accuracy)
\u2022 Equipment calibration verification
\u2022 Review of supplier COAs (Certificates of Analysis) if applicable

Annually:
\u2022 Full HACCP plan review and update
\u2022 Third-party audit or health department inspection comparison
\u2022 Staff retraining on HACCP principles and procedures`,
  },
  {
    title: '7. Record-Keeping',
    content: `The following records are maintained and retained for a minimum of 1 year:
\u2022 Cooking temperature logs (daily)
\u2022 Hot holding temperature logs (daily)
\u2022 Cold storage temperature logs (daily)
\u2022 Cooling logs (as needed)
\u2022 Corrective action reports (as needed)
\u2022 Thermometer calibration records (daily/monthly)
\u2022 Employee training records (ongoing)
\u2022 Supplier verification documents (as received)
\u2022 HACCP plan review records (annual)

All records are stored in EvidLY and available for inspector review on demand.`,
  },
  {
    title: '8. Allergen Control Program',
    content: `Allergens handled in this kitchen: Peanuts, Tree Nuts, Milk/Dairy, Eggs, Wheat/Gluten, Shellfish, Sesame

Controls:
\u2022 Dedicated cutting boards and utensils for allergen-free prep (color-coded purple)
\u2022 Allergen ingredient matrix posted at each prep station
\u2022 Staff trained on allergen awareness during onboarding and annually
\u2022 Server communication protocol: allergen questions → kitchen manager confirmation
\u2022 "Allergen Alert" ticket modifier in POS system
\u2022 Deep-clean between allergen/non-allergen prep on shared equipment
\u2022 Supplier spec sheets reviewed for hidden allergens (soy lecithin, milk powder, etc.)`,
  },
];

// ── Component ───────────────────────────────────────────────────────

export function HACCPAICreate() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();

  // Phase management
  const [phase, setPhase] = useState<Phase>('intake');

  // Intake form
  const [intake, setIntake] = useState<IntakeData>({
    kitchenType: '',
    menuCategories: [],
    cookingMethods: [],
    equipment: '',
    allergens: [],
    vulnerablePopulations: false,
    additionalNotes: '',
  });

  // Generation
  const [streamText, setStreamText] = useState('');
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Plan review
  const [planSections, setPlanSections] = useState<PlanSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Toggle helpers ──────────────────────────────────────────────

  const toggleMulti = useCallback((field: 'menuCategories' | 'cookingMethods' | 'allergens', value: string) => {
    setIntake(prev => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }, []);

  const toggleSection = useCallback((idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Validation ──────────────────────────────────────────────────

  const canGenerate = intake.kitchenType && intake.menuCategories.length > 0 && intake.cookingMethods.length > 0;

  // ── AI Generation ─────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) {
      toast.warning('Please fill in kitchen type, at least one menu category, and at least one cooking method.');
      return;
    }

    setPhase('generating');
    setGenerating(true);
    setStreamText('');
    setPlanSections([]);

    if (isDemoMode) {
      // Demo mode: simulate streaming with pre-built plan
      let accumulated = '';
      for (const section of DEMO_PLAN_SECTIONS) {
        const sectionText = `## ${section.title}\n\n${section.content}\n\n`;
        for (let i = 0; i < sectionText.length; i += 8) {
          accumulated += sectionText.slice(i, i + 8);
          setStreamText(accumulated);
          await new Promise(r => setTimeout(r, 12));
        }
      }
      setPlanSections(DEMO_PLAN_SECTIONS);
      setGenerating(false);
      setPhase('review');
      return;
    }

    // Production: call ai-chat edge function
    const systemPrompt = buildHACCPSystemPrompt(intake);
    const userMessage = buildHACCPUserMessage(intake);

    try {
      abortRef.current = new AbortController();

      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.delta?.text || parsed.text || '';
              if (text) {
                accumulated += text;
                setStreamText(accumulated);
              }
            } catch {
              if (data.trim()) {
                accumulated += data;
                setStreamText(accumulated);
              }
            }
          }
        }
      }

      // Parse sections from accumulated text
      const sections = parseGeneratedPlan(accumulated);
      setPlanSections(sections);
      setPhase('review');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to generate HACCP plan. Please try again.');
      setPhase('intake');
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, isDemoMode, intake]);

  // ── Save to Documents ─────────────────────────────────────────

  const { saveDocument } = useSaveDocument();

  const handleSave = useCallback(async () => {
    if (isDemoMode) {
      toast.success('Demo mode \u2014 HACCP plan saved to Documents');
      setSaved(true);
      return;
    }

    setSaving(true);
    try {
      const planContent = planSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');

      const success = await saveDocument({
        organization_id: profile?.organization_id || '',
        title: `AI-Generated HACCP Plan \u2014 ${intake.kitchenType}`,
        category: 'HACCP',
        status: 'draft',
        tags: ['haccp', 'ai-generated', intake.kitchenType.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
        file_type: 'text/markdown',
        notes: planContent,
      });

      if (!success) throw new Error('Save failed');
      toast.success('HACCP plan saved to Documents');
      setSaved(true);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isDemoMode, planSections, profile, intake.kitchenType]);

  // ── PDF Export ─────────────────────────────────────────────────

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxW = pageW - 2 * margin;
    let y = 20;

    // Header
    doc.setFillColor(30, 45, 77); // Navy
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setTextColor(160, 140, 90); // Gold
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('EvidLY', margin, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('AI-Generated HACCP Plan', margin, 28);

    y = 46;

    // Disclaimer
    doc.setFillColor(254, 243, 199);
    doc.rect(margin, y, maxW, 18, 'F');
    doc.setTextColor(133, 77, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT DISCLAIMER', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    const disclaimerText = 'This AI-generated plan is a starting point only. It must be reviewed, customized, and validated by a qualified food safety professional before use. Your local Authority Having Jurisdiction (AHJ) for fire safety and Environmental Health Department (EHD) for food safety may have additional requirements.';
    const disclaimerLines = doc.splitTextToSize(disclaimerText, maxW - 8);
    doc.text(disclaimerLines, margin + 4, y + 11);
    y += 24 + (disclaimerLines.length - 1) * 3;

    // Intake summary
    doc.setTextColor(30, 77, 107);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Kitchen: ' + intake.kitchenType, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text('Menu: ' + intake.menuCategories.join(', '), margin, y);
    y += 4;
    doc.text('Methods: ' + intake.cookingMethods.join(', '), margin, y);
    y += 4;
    if (intake.allergens.length > 0) {
      doc.text('Allergens: ' + intake.allergens.join(', '), margin, y);
      y += 4;
    }
    if (intake.vulnerablePopulations) {
      doc.text('Serves vulnerable populations (children, elderly, immunocompromised)', margin, y);
      y += 4;
    }
    y += 4;

    // Plan sections
    for (const section of planSections) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(30, 77, 107);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 6;

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Handle special chars for PDF
      const safeContent = section.content
        .replace(/\u2265/g, '>=')
        .replace(/\u2264/g, '<=')
        .replace(/\u2022/g, '-')
        .replace(/\u2014/g, '--')
        .replace(/\u00B0/g, ' deg')
        .replace(/\u00B1/g, '+/-');

      const lines = doc.splitTextToSize(safeContent, maxW);
      for (const line of lines) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 4;
      }
      y += 4;
    }

    // Footer
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(7);
    doc.text(
      `Generated by EvidLY AI \u2014 ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} \u2014 Review required before use`,
      margin,
      doc.internal.pageSize.getHeight() - 10,
    );

    doc.save(`HACCP-Plan-${intake.kitchenType.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`);
    toast.success('PDF downloaded');
  }, [planSections, intake]);

  // ── Render: Intake Phase ──────────────────────────────────────

  if (phase === 'intake') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
              <Sparkles className="h-5 w-5" style={{ color: '#A08C5A' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create HACCP Plan with AI</h2>
              <p className="text-sm text-gray-500">Describe your kitchen and the AI will generate a customized HACCP plan</p>
            </div>
          </div>
          {/* Disclaimer banner */}
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              AI-generated plans are a <strong>starting point only</strong>. The output must be reviewed, customized, and validated by a qualified food safety professional. Your local AHJ (fire) and EHD (food safety) may impose additional requirements.
            </p>
          </div>
        </div>

        {/* Kitchen Type */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Kitchen Type *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {KITCHEN_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setIntake(prev => ({ ...prev, kitchenType: type }))}
                className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left"
                style={{
                  borderColor: intake.kitchenType === type ? '#A08C5A' : '#D1D9E6',
                  backgroundColor: intake.kitchenType === type ? 'rgba(160,140,90,0.1)' : '#fff',
                  color: intake.kitchenType === type ? '#7A6C3A' : '#3D5068',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Categories */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Menu Categories *</label>
          <p className="text-xs text-gray-500 mb-2">Select all food types your kitchen handles</p>
          <div className="flex flex-wrap gap-2">
            {MENU_CATEGORIES.map(cat => {
              const selected = intake.menuCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleMulti('menuCategories', cat)}
                  className="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
                  style={{
                    borderColor: selected ? '#A08C5A' : '#D1D9E6',
                    backgroundColor: selected ? 'rgba(160,140,90,0.12)' : '#fff',
                    color: selected ? '#7A6C3A' : '#3D5068',
                  }}
                >
                  {selected ? '\u2713 ' : ''}{cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cooking Methods */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Cooking Methods *</label>
          <p className="text-xs text-gray-500 mb-2">Select all methods used in your kitchen</p>
          <div className="flex flex-wrap gap-2">
            {COOKING_METHODS.map(method => {
              const selected = intake.cookingMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => toggleMulti('cookingMethods', method)}
                  className="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
                  style={{
                    borderColor: selected ? '#A08C5A' : '#D1D9E6',
                    backgroundColor: selected ? 'rgba(160,140,90,0.12)' : '#fff',
                    color: selected ? '#7A6C3A' : '#3D5068',
                  }}
                >
                  {selected ? '\u2713 ' : ''}{method}
                </button>
              );
            })}
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Major Equipment</label>
          <p className="text-xs text-gray-500 mb-2">List major equipment (grills, fryers, walk-in coolers, etc.)</p>
          <textarea
            value={intake.equipment}
            onChange={e => setIntake(prev => ({ ...prev, equipment: e.target.value }))}
            placeholder="e.g., 2 commercial grills, 1 deep fryer, walk-in cooler, walk-in freezer, 3 reach-in refrigerators, steam table..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
          />
        </div>

        {/* Allergens */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Allergens Present</label>
          <p className="text-xs text-gray-500 mb-2">Select all allergens handled in your kitchen</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_LIST.map(a => {
              const selected = intake.allergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleMulti('allergens', a)}
                  className="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
                  style={{
                    borderColor: selected ? '#DC2626' : '#D1D9E6',
                    backgroundColor: selected ? 'rgba(220,38,38,0.08)' : '#fff',
                    color: selected ? '#991B1B' : '#3D5068',
                  }}
                >
                  {selected ? '\u2713 ' : ''}{a}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vulnerable Populations */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={intake.vulnerablePopulations}
              onChange={e => setIntake(prev => ({ ...prev, vulnerablePopulations: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300"
              style={{ accentColor: '#A08C5A' }}
            />
            <div>
              <span className="text-sm font-semibold text-gray-800">Serves Vulnerable Populations</span>
              <p className="text-xs text-gray-500">Children, elderly, pregnant, or immunocompromised individuals</p>
            </div>
          </label>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Additional Notes</label>
          <textarea
            value={intake.additionalNotes}
            onChange={e => setIntake(prev => ({ ...prev, additionalNotes: e.target.value }))}
            placeholder="Any specific concerns, unique processes, or regulatory requirements..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
          />
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: canGenerate ? '#1e4d6b' : '#94A3B8' }}
            onMouseEnter={e => { if (canGenerate) (e.currentTarget as HTMLElement).style.backgroundColor = '#2a6a8f'; }}
            onMouseLeave={e => { if (canGenerate) (e.currentTarget as HTMLElement).style.backgroundColor = '#1e4d6b'; }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate HACCP Plan
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Generating Phase ──────────────────────────────────

  if (phase === 'generating') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#A08C5A' }} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generating Your HACCP Plan</h2>
              <p className="text-xs text-gray-500">{intake.kitchenType} \u2014 {intake.menuCategories.length} menu categories, {intake.cookingMethods.length} cooking methods</p>
            </div>
          </div>
          {/* Streaming text display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px] max-h-[500px] overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{streamText}<span className="animate-pulse">|</span></pre>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Review Phase ──────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Review Required</p>
          <p className="text-xs text-amber-800 mt-0.5">
            This AI-generated HACCP plan is a <strong>starting point</strong>. It must be reviewed and validated by a qualified food safety professional before implementation. Your local Authority Having Jurisdiction (AHJ) for fire safety and Environmental Health Department (EHD) for food safety may have additional requirements. Do not rely on this output as a final, compliant document.
          </p>
        </div>
      </div>

      {/* Plan header */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">AI-Generated HACCP Plan</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {intake.kitchenType} \u2014 Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {intake.menuCategories.map(c => (
                <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
              style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F4F6FA'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fff'; }}
            >
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: saved ? '#16a34a' : '#1e4d6b' }}
              onMouseEnter={e => { if (!saved) (e.currentTarget as HTMLElement).style.backgroundColor = '#2a6a8f'; }}
              onMouseLeave={e => { if (!saved) (e.currentTarget as HTMLElement).style.backgroundColor = '#1e4d6b'; }}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</>
              ) : saved ? (
                <><CheckCircle className="h-4 w-4 mr-1.5" />Saved</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" />Save to Documents</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Plan sections */}
      {planSections.map((section, idx) => {
        const isExpanded = expandedSections.has(idx);
        return (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(idx)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">{section.title}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {isExpanded && (
              <div className="px-5 pb-4 border-t border-gray-100">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed mt-3">{section.content}</pre>
              </div>
            )}
          </div>
        );
      })}

      {/* Expand/collapse all + back */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPhase('intake')}
          className="inline-flex items-center text-sm font-medium transition-colors"
          style={{ color: '#1e4d6b' }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Intake
        </button>
        <button
          type="button"
          onClick={() => {
            if (expandedSections.size === planSections.length) {
              setExpandedSections(new Set());
            } else {
              setExpandedSections(new Set(planSections.map((_, i) => i)));
            }
          }}
          className="text-xs font-medium transition-colors"
          style={{ color: '#6B7F96' }}
        >
          {expandedSections.size === planSections.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* AI disclaimer footer */}
      <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Info className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-gray-500">
          Generated by EvidLY AI. This is not a substitute for professional food safety consultation. AHJ = Authority Having Jurisdiction (fire safety); EHD = Environmental Health Department (food safety). Always verify requirements with your local regulatory agencies.
        </p>
      </div>
    </div>
  );
}

// ── Prompt Builders (production only) ───────────────────────────────

function buildHACCPSystemPrompt(intake: IntakeData): string {
  return `You are a HACCP plan generation expert for commercial kitchens. Generate a complete, professional HACCP plan based on the operator's kitchen profile. Follow FDA Food Code and Codex Alimentarius HACCP principles.

STRUCTURE YOUR RESPONSE WITH THESE EXACT SECTION HEADERS (use ## markdown headers):
## 1. Product Description
## 2. Hazard Analysis
## 3. Critical Control Points (CCPs)
## 4. Monitoring Procedures
## 5. Corrective Action Procedures
## 6. Verification Activities
## 7. Record-Keeping
## 8. Allergen Control Program (include only if allergens are present)

IMPORTANT RULES:
- Use FDA Food Code temperature standards (cooking: poultry 165F/15s, ground meat 155F/15s, whole cuts/seafood 145F/15s; cold holding: 41F or below; hot holding: 135F or above)
- Be specific with temperatures, times, and procedures — no vague language
- Include monitoring frequency (every 2 hours for hot holding, every 4 hours for cold storage, etc.)
- Reference specific regulatory standards where appropriate
- If the kitchen serves vulnerable populations, apply stricter controls (e.g., no bare-hand contact with RTE foods, more frequent monitoring)
- AHJ refers to fire safety authority; EHD refers to food safety authority — use correctly
- Do not fabricate data, statistics, or regulatory citations you are not certain about
- Keep language professional but accessible to kitchen managers`;
}

function buildHACCPUserMessage(intake: IntakeData): string {
  let msg = `Generate a complete HACCP plan for the following kitchen:\n\n`;
  msg += `Kitchen Type: ${intake.kitchenType}\n`;
  msg += `Menu Categories: ${intake.menuCategories.join(', ')}\n`;
  msg += `Cooking Methods: ${intake.cookingMethods.join(', ')}\n`;
  if (intake.equipment) msg += `Major Equipment: ${intake.equipment}\n`;
  if (intake.allergens.length > 0) msg += `Allergens Present: ${intake.allergens.join(', ')}\n`;
  if (intake.vulnerablePopulations) msg += `Serves Vulnerable Populations: Yes (children, elderly, immunocompromised)\n`;
  if (intake.additionalNotes) msg += `Additional Notes: ${intake.additionalNotes}\n`;
  return msg;
}

// ── Parse generated plan into sections ──────────────────────────────

function parseGeneratedPlan(text: string): PlanSection[] {
  const lines = text.split('\n');
  const sections: PlanSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = headerMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  // Fallback: if parsing found no sections, wrap entire text as one section
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: 'HACCP Plan', content: text.trim() });
  }

  return sections;
}
