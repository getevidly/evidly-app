import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Thermometer, Check, X, Clock, Package, ChevronDown, ChevronUp, Download, TrendingUp, Play, StopCircle, AlertTriangle, Wifi, WifiOff, Radio, Pen, Battery, Signal, QrCode, Pencil, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { generateTempDemoHistory, equipmentColors, type TempHistoryEntry } from '../data/tempDemoHistory';
import { PhotoEvidence, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { Camera } from 'lucide-react';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { EmptyState } from '../components/EmptyState';
import { iotSensors, iotSensorReadings, iotSensorProviders, type IoTSensor, type IoTSensorReading } from '../data/demoData';

interface TemperatureEquipment {
  id: string;
  name: string;
  equipment_type: string;
  min_temp: number;
  max_temp: number;
  unit: string;
  location?: string;
  last_check?: {
    temperature_value: number;
    created_at: string;
    is_within_range: boolean;
    recorded_by_name?: string;
  };
}

type InputMethod = 'manual' | 'qr_scan' | 'iot_sensor';

interface TempCheckCompletion {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  temperature_value: number;
  is_within_range: boolean;
  recorded_by_name: string;
  corrective_action: string | null;
  created_at: string;
  input_method?: InputMethod;
  shift?: 'morning' | 'afternoon' | 'evening';
  ccp_number?: string | null;
}

interface User {
  id: string;
  full_name: string;
}

interface BatchTempEntry {
  equipment_id: string;
  equipment_name: string;
  temperature: string;
  skipped: boolean;
  min_temp: number;
  max_temp: number;
}

interface ReceivingItem {
  itemDescription: string;
  temperature: number;
  isPass: boolean;
  category: string;
  maxTemp?: number;
  ccpDeviation?: {
    actionTaken: string;
    notes: string;
    reMeasuredTemp?: number;
  };
}

interface Cooldown {
  id: string;
  itemName: string;
  startTemp: number;
  startTime: Date;
  location: string;
  startedBy: string;
  checks: CooldownCheck[];
  status: 'active' | 'completed' | 'failed';
  completedAt?: Date;
}

interface CooldownCheck {
  temperature: number;
  time: Date;
}

// ── Receiving: Food category → temperature threshold config ──
const CATEGORY_TEMP_CONFIG: Record<string, { tempRequired: boolean; maxTemp?: number; label: string }> = {
  'refrigerated_meat_poultry': { tempRequired: true, maxTemp: 41, label: 'Refrigerated Meat & Poultry' },
  'refrigerated_seafood':      { tempRequired: true, maxTemp: 41, label: 'Refrigerated Seafood' },
  'refrigerated_dairy':        { tempRequired: true, maxTemp: 41, label: 'Refrigerated Dairy' },
  'refrigerated_produce':      { tempRequired: true, maxTemp: 41, label: 'Refrigerated Produce' },
  'refrigerated_other':        { tempRequired: true, maxTemp: 41, label: 'Refrigerated Other' },
  'frozen':                    { tempRequired: true, maxTemp: 0,  label: 'Frozen' },
  'dry_goods':                 { tempRequired: false, label: 'Dry Goods' },
  'beverages':                 { tempRequired: false, label: 'Beverages (non-refrigerated)' },
  'canned_shelf_stable':       { tempRequired: false, label: 'Canned / Shelf-Stable' },
};

// Equipment classification: which tab each type belongs to
const STORAGE_TYPES = ['storage_cold', 'storage_frozen', 'cooler', 'freezer'];
const HOLDING_COLD_TYPES = ['holding_cold', 'cold_holding'];
const HOLDING_HOT_TYPES = ['holding_hot', 'hot_hold', 'hot_holding'];
const HOLDING_TYPES = [...HOLDING_COLD_TYPES, ...HOLDING_HOT_TYPES];

const isStorageEquipment = (type: string) => STORAGE_TYPES.includes(type);
const isHoldingEquipment = (type: string) => HOLDING_TYPES.includes(type);
const isHoldingCold = (type: string) => HOLDING_COLD_TYPES.includes(type);
const isHoldingHot = (type: string) => HOLDING_HOT_TYPES.includes(type);
const isFreezerType = (type: string) => type === 'storage_frozen' || type === 'freezer';

export function TempLogs() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [equipment, setEquipment] = useState<TemperatureEquipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<TempCheckCompletion[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<TemperatureEquipment | null>(null);
  const [temperature, setTemperature] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [activeTab, setActiveTab] = useState<'equipment' | 'receiving' | 'history' | 'cooldown' | 'iot' | 'holding' | 'analytics'>('equipment');
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [tempPhotos, setTempPhotos] = useState<PhotoRecord[]>([]);

  // Current Readings filters
  const [sortBy, setSortBy] = useState<'outOfRange' | 'alphabetical' | 'mostRecent'>('outOfRange');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchEntries, setBatchEntries] = useState<BatchTempEntry[]>([]);

  // History filters
  const [historyDateRange, setHistoryDateRange] = useState('today');
  const [historyEquipment, setHistoryEquipment] = useState('all');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyMethod, setHistoryMethod] = useState<'all' | InputMethod>('all');
  const [historyShift, setHistoryShift] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [historyView, setHistoryView] = useState<'table' | 'chart'>('table');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [historySortField, setHistorySortField] = useState<'created_at' | 'equipment_name' | 'temperature_value' | 'is_within_range'>('created_at');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');

  // Receiving form state
  const [foodCategory, setFoodCategory] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [receivingTemp, setReceivingTemp] = useState('');
  const [receivingNotes, setReceivingNotes] = useState('');
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [receivedBy, setReceivedBy] = useState('');
  const [showVendorOther, setShowVendorOther] = useState(false);

  // CCP-04 corrective action state
  const [showCcpModal, setShowCcpModal] = useState(false);
  const [pendingFailItem, setPendingFailItem] = useState<ReceivingItem | null>(null);
  const [ccpActionTaken, setCcpActionTaken] = useState('');
  const [ccpNotes, setCcpNotes] = useState('');
  const [ccpReMeasuredTemp, setCcpReMeasuredTemp] = useState('');

  // Cooldown state
  const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
  const [completedCooldowns, setCompletedCooldowns] = useState<Cooldown[]>([]);
  const [showStartCooldown, setShowStartCooldown] = useState(false);
  const [cooldownForm, setCooldownForm] = useState({
    itemName: '',
    startTemp: '',
    startTime: '',
    location: '',
    startedBy: '',
  });
  const [selectedCooldown, setSelectedCooldown] = useState<Cooldown | null>(null);
  const [showCooldownCheckModal, setShowCooldownCheckModal] = useState(false);
  const [cooldownCheckTemp, setCooldownCheckTemp] = useState('');
  const [cooldownCheckTime, setCooldownCheckTime] = useState('');

  useEffect(() => {
    if (profile?.organization_id) {
      fetchEquipment();
      fetchUsers();
      fetchHistory();
    } else {
      loadDemoData();
    }
  }, [profile]);

  // Live countdown timer — 1-second interval for active cooldowns
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    if (cooldowns.length === 0) return;
    const timer = setInterval(() => {
      setTimerTick(t => t + 1); // Force re-render every second
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldowns.length]);

  // Persist active cooldowns to localStorage
  const COOLDOWN_STORAGE_KEY = 'evidly_active_cooldowns';
  const saveCooldownsToStorage = useCallback((items: Cooldown[]) => {
    const serializable = items.map(c => ({
      ...c,
      startTime: c.startTime.toISOString(),
      checks: c.checks.map(ch => ({ ...ch, time: ch.time.toISOString() })),
    }));
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(serializable));
  }, []);

  // Load cooldowns from localStorage on mount (resume timers)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restored: Cooldown[] = parsed.map((c: any) => ({
          ...c,
          startTime: new Date(c.startTime),
          checks: c.checks.map((ch: any) => ({ ...ch, time: new Date(ch.time) })),
        }));
        if (restored.length > 0) setCooldowns(restored);
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  const loadDemoData = () => {
    const now = new Date();
    const todayAt = (h: number, m: number) => {
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return d;
    };

    // Equipment classification:
    // storage_cold / storage_frozen → Current Readings tab only
    // holding_cold / holding_hot → Hot/Cold Holding tab only
    const demoEquipment: TemperatureEquipment[] = [
      // ── Storage equipment (Current Readings only) ──
      {
        id: '1',
        name: 'Walk-in Cooler #1', // demo
        equipment_type: 'storage_cold',
        min_temp: 35,
        max_temp: 38,
        unit: 'F',
        location: 'Downtown Kitchen', // demo
        last_check: {
          temperature_value: 36,
          created_at: todayAt(6, 0).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Sarah Chen',
        },
      },
      {
        id: '2',
        name: 'Walk-in Cooler #2',
        equipment_type: 'storage_cold',
        min_temp: 35,
        max_temp: 38,
        unit: 'F',
        location: 'Downtown Kitchen', // demo
        last_check: {
          temperature_value: 37,
          created_at: todayAt(6, 15).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Sarah Chen',
        },
      },
      {
        id: '3',
        name: 'Walk-in Freezer',
        equipment_type: 'storage_frozen',
        min_temp: -Infinity,
        max_temp: 0,
        unit: 'F',
        location: 'Downtown Kitchen', // demo
        last_check: {
          temperature_value: -3,
          created_at: todayAt(6, 30).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Mike Johnson',
        },
      },
      {
        id: '8',
        name: 'Blast Chiller',
        equipment_type: 'storage_cold',
        min_temp: 33,
        max_temp: 38,
        unit: 'F',
        location: 'University Dining', // demo
        last_check: {
          temperature_value: 35,
          created_at: new Date(now.getTime() - 14 * 60 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'John Smith',
        },
      },
      // ── Holding equipment (Hot/Cold Holding tab only) ──
      {
        id: '4',
        name: 'Prep Table Cooler',
        equipment_type: 'holding_cold',
        min_temp: 33,
        max_temp: 41,
        unit: 'F',
        location: 'Airport Cafe', // demo
        last_check: {
          temperature_value: 37,
          created_at: todayAt(6, 45).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Mike Johnson',
        },
      },
      {
        id: '5',
        name: 'Hot Holding Unit',
        equipment_type: 'holding_hot',
        min_temp: 135,
        max_temp: 165,
        unit: 'F',
        location: 'University Dining', // demo
        last_check: {
          temperature_value: 148,
          created_at: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Emma Davis',
        },
      },
      {
        id: '6',
        name: 'Salad Bar',
        equipment_type: 'holding_cold',
        min_temp: 33,
        max_temp: 41,
        unit: 'F',
        location: 'Airport Cafe', // demo
        last_check: {
          temperature_value: 38,
          created_at: new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Emma Davis',
        },
      },
      {
        id: '9',
        name: 'Steam Table',
        equipment_type: 'holding_hot',
        min_temp: 135,
        max_temp: 190,
        unit: 'F',
        location: 'Downtown Kitchen', // demo
        last_check: {
          temperature_value: 152,
          created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Sarah Chen',
        },
      },
      {
        id: '10',
        name: 'Cold Well',
        equipment_type: 'holding_cold',
        min_temp: 33,
        max_temp: 41,
        unit: 'F',
        location: 'Downtown Kitchen', // demo
        last_check: {
          temperature_value: 39,
          created_at: new Date(now.getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Sarah Chen',
        },
      },
    ];

    const demoHistory = generateTempDemoHistory(now);

    const demoUsers: User[] = [
      { id: '1', full_name: 'Sarah Chen' },
      { id: '2', full_name: 'Mike Johnson' },
      { id: '3', full_name: 'Emma Davis' },
      { id: '4', full_name: 'John Smith' },
    ];

    // Demo cooldowns
    const demoCooldowns: Cooldown[] = [
      {
        id: '1',
        itemName: 'Rice Pilaf',
        startTemp: 155,
        startTime: new Date(now.getTime() - 45 * 60 * 1000),
        location: 'Downtown Kitchen', // demo
        startedBy: 'Sarah Chen',
        checks: [
          { temperature: 155, time: new Date(now.getTime() - 45 * 60 * 1000) },
          { temperature: 95, time: new Date(now.getTime() - 15 * 60 * 1000) },
        ],
        status: 'active',
      },
      {
        id: '2',
        itemName: 'Chicken Noodle Soup',
        startTemp: 165,
        startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        location: 'University Dining', // demo
        startedBy: 'Mike Johnson',
        checks: [
          { temperature: 165, time: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
          { temperature: 115, time: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
          { temperature: 55, time: new Date(now.getTime() - 30 * 60 * 1000) },
        ],
        status: 'active',
      },
    ];

    const demoCompletedCooldowns: Cooldown[] = [
      {
        id: '3',
        itemName: 'Pasta Sauce',
        startTemp: 180,
        startTime: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        location: 'Downtown Kitchen', // demo
        startedBy: 'Emma Davis',
        checks: [
          { temperature: 180, time: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
          { temperature: 68, time: new Date(now.getTime() - 6.5 * 60 * 60 * 1000) },
          { temperature: 40, time: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
        ],
        status: 'completed',
        completedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        id: '4',
        itemName: 'Mashed Potatoes',
        startTemp: 170,
        startTime: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        location: 'Airport Cafe', // demo
        startedBy: 'John Smith',
        checks: [
          { temperature: 170, time: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
          { temperature: 65, time: new Date(now.getTime() - 10.5 * 60 * 60 * 1000) },
          { temperature: 38, time: new Date(now.getTime() - 7 * 60 * 60 * 1000) },
        ],
        status: 'completed',
        completedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      },
      {
        id: '5',
        itemName: 'Beef Stew',
        startTemp: 150,
        startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        location: 'University Dining', // demo
        startedBy: 'Sarah Chen',
        checks: [
          { temperature: 150, time: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          { temperature: 90, time: new Date(now.getTime() - 22 * 60 * 60 * 1000) },
          { temperature: 41, time: new Date(now.getTime() - 18 * 60 * 60 * 1000) },
        ],
        status: 'completed',
        completedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      },
      {
        id: '6',
        itemName: 'Turkey Gravy',
        startTemp: 160,
        startTime: new Date(now.getTime() - 30 * 60 * 60 * 1000),
        location: 'Downtown Kitchen', // demo
        startedBy: 'Mike Johnson',
        checks: [
          { temperature: 160, time: new Date(now.getTime() - 30 * 60 * 60 * 1000) },
          { temperature: 100, time: new Date(now.getTime() - 28 * 60 * 60 * 1000) },
          { temperature: 80, time: new Date(now.getTime() - 26 * 60 * 60 * 1000) },
        ],
        status: 'failed',
        completedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      },
    ];

    setEquipment(demoEquipment);
    setHistory(demoHistory);
    setUsers(demoUsers);
    setCooldowns(demoCooldowns);
    setCompletedCooldowns(demoCompletedCooldowns);
  };

  const fetchEquipment = async () => {
    const { data: equipmentData } = await supabase
      .from('temperature_equipment')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .eq('is_active', true)
      .order('name');

    if (equipmentData) {
      const equipmentWithLastCheck = await Promise.all(
        equipmentData.map(async (eq) => {
          const { data: lastCheck } = await supabase
            .from('temp_check_completions')
            .select('temperature_value, created_at, is_within_range')
            .eq('equipment_id', eq.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...eq,
            last_check: lastCheck || undefined,
          };
        })
      );

      setEquipment(equipmentWithLastCheck);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('organization_id', profile?.organization_id);

    if (data) setUsers(data);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('temp_check_completions')
      .select(`
        id,
        equipment_id,
        temperature_value,
        is_within_range,
        corrective_action,
        created_at,
        recorded_by,
        temperature_equipment!inner(name, equipment_type),
        user_profiles!temp_check_completions_recorded_by_fkey(full_name)
      `)
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      const formattedHistory = data.map((item: any) => ({
        id: item.id,
        equipment_id: item.equipment_id,
        equipment_name: item.temperature_equipment.name,
        equipment_type: item.temperature_equipment.equipment_type,
        temperature_value: item.temperature_value,
        is_within_range: item.is_within_range,
        recorded_by_name: item.user_profiles?.full_name || 'Unknown',
        corrective_action: item.corrective_action,
        created_at: item.created_at,
      }));
      setHistory(formattedHistory);
    }
  };

  const handleLogTemp = (eq: TemperatureEquipment) => {
    setSelectedEquipment(eq);
    setShowLogModal(true);
    setTemperature('');
    setCorrectiveAction('');
    setSelectedUser(profile?.id || '');
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmitTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;

    const tempValue = parseFloat(temperature);
    const isWithinRange = tempValue >= selectedEquipment.min_temp && tempValue <= selectedEquipment.max_temp;

    // Demo mode: auto-fill corrective action, don't block on it
    if (isDemoMode || !profile?.organization_id) {
      const now = new Date();
      const demoCorrectiveNote = !isWithinRange
        ? (correctiveAction.trim() || 'Temperature deviation noted — monitoring closely')
        : null;
      setEquipment(prev => prev.map(eq =>
        eq.id === selectedEquipment.id
          ? { ...eq, last_check: { temperature_value: tempValue, created_at: now.toISOString(), is_within_range: isWithinRange, recorded_by_name: 'Demo User' } }
          : eq
      ));
      setHistory(prev => [{
        id: `demo-${Date.now()}`,
        equipment_id: selectedEquipment.id,
        equipment_name: selectedEquipment.name,
        equipment_type: selectedEquipment.equipment_type,
        temperature_value: tempValue,
        is_within_range: isWithinRange,
        recorded_by_name: 'Demo User',
        corrective_action: demoCorrectiveNote,
        created_at: now.toISOString(),
      }, ...prev]);
      setShowLogModal(false);
      setTempPhotos([]);

      if (isWithinRange) {
        toast.success(`${tempValue}°F logged for ${selectedEquipment.name} — Within safe range`);
      } else {
        toast.warning(`${tempValue}°F logged for ${selectedEquipment.name} — Outside safe range`);
      }

      // Quick-log: auto-advance to next unlogged equipment after brief delay
      setTimeout(() => {
        const nextUnlogged = equipment.find(eq => {
          if (eq.id === selectedEquipment.id) return false;
          if (!eq.last_check) return true;
          const isLoggedToday = new Date(eq.last_check.created_at).toDateString() === new Date().toDateString();
          return !isLoggedToday;
        });
        if (nextUnlogged) {
          handleLogTemp(nextUnlogged);
        }
      }, 800);
      return;
    }

    if (!isWithinRange && !correctiveAction.trim()) {
      toast.warning('Corrective action required for out-of-range temp');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('temp_check_completions').insert({
      organization_id: profile?.organization_id,
      location_id: (selectedEquipment as any).location_id,
      equipment_id: selectedEquipment.id,
      temperature_value: tempValue,
      is_within_range: isWithinRange,
      recorded_by: selectedUser,
      corrective_action: !isWithinRange ? correctiveAction : null,
    });

    setLoading(false);

    if (!error) {
      setShowLogModal(false);
      setTempPhotos([]);
      showSuccessToast(`${tempValue}°F logged for ${selectedEquipment.name}`);
      fetchEquipment();
      fetchHistory();
    }
  };

  const handleOpenBatchLog = () => {
    const entries: BatchTempEntry[] = equipment.map(eq => ({
      equipment_id: eq.id,
      equipment_name: eq.name,
      temperature: '',
      skipped: false,
      min_temp: eq.min_temp,
      max_temp: eq.max_temp,
    }));
    setBatchEntries(entries);
    setShowBatchModal(true);
  };

  const handleBatchTempChange = (equipmentId: string, value: string) => {
    setBatchEntries(entries =>
      entries.map(entry =>
        entry.equipment_id === equipmentId
          ? { ...entry, temperature: value }
          : entry
      )
    );
  };

  const handleBatchSkip = (equipmentId: string) => {
    setBatchEntries(entries =>
      entries.map(entry =>
        entry.equipment_id === equipmentId
          ? { ...entry, skipped: !entry.skipped }
          : entry
      )
    );
  };

  const handleSubmitBatch = async () => {
    const validEntries = batchEntries.filter(entry => !entry.skipped && entry.temperature);

    if (validEntries.length === 0) {
      toast.warning('Please log at least one temperature');
      return;
    }

    // Demo mode: update local state only
    if (isDemoMode || !profile?.organization_id) {
      const now = new Date();
      const newHistory = validEntries.map((entry, i) => {
        const tempValue = parseFloat(entry.temperature);
        const isWithinRange = tempValue >= entry.min_temp && tempValue <= entry.max_temp;
        return {
          id: `demo-batch-${Date.now()}-${i}`,
          equipment_id: entry.equipment_id,
          equipment_name: entry.equipment_name,
          equipment_type: equipment.find(e => e.id === entry.equipment_id)?.equipment_type || 'cooler',
          temperature_value: tempValue,
          is_within_range: isWithinRange,
          recorded_by_name: 'Demo User',
          corrective_action: null,
          created_at: now.toISOString(),
        };
      });
      setHistory(prev => [...newHistory, ...prev]);
      setEquipment(prev => prev.map(eq => {
        const entry = validEntries.find(e => e.equipment_id === eq.id);
        if (!entry) return eq;
        const tempValue = parseFloat(entry.temperature);
        return { ...eq, last_check: { temperature_value: tempValue, created_at: now.toISOString(), is_within_range: tempValue >= eq.min_temp && tempValue <= eq.max_temp, recorded_by_name: 'Demo User' } };
      }));
      setShowBatchModal(false);
      showSuccessToast(`${validEntries.length} temperatures logged successfully`);
      return;
    }

    setLoading(true);

    const insertData = validEntries.map(entry => {
      const tempValue = parseFloat(entry.temperature);
      const isWithinRange = tempValue >= entry.min_temp && tempValue <= entry.max_temp;

      return {
        organization_id: profile?.organization_id,
        location_id: (equipment.find(e => e.id === entry.equipment_id) as any)?.location_id,
        equipment_id: entry.equipment_id,
        temperature_value: tempValue,
        is_within_range: isWithinRange,
        recorded_by: selectedUser || profile?.id,
      };
    });

    const { error } = await supabase.from('temp_check_completions').insert(insertData);

    setLoading(false);

    if (!error) {
      setShowBatchModal(false);
      showSuccessToast(`${validEntries.length} temperatures logged successfully`);
      fetchEquipment();
      fetchHistory();
    }
  };

  const handleSubmitReceiving = async (e: React.FormEvent) => {
    e.preventDefault();

    const cfg = getCategoryConfig(foodCategory);
    if (!cfg) return;

    // Non-temp categories: auto-pass, no temperature needed
    if (!cfg.tempRequired) {
      const newItem: ReceivingItem = {
        itemDescription,
        temperature: 0,
        isPass: true,
        category: foodCategory,
      };
      setReceivingItems([...receivingItems, newItem]);
      setItemDescription('');
      return;
    }

    // Temp-required: validate
    if (!receivingTemp || receivingTemp.trim() === '') {
      toast.error('Temperature is required for this food category.');
      return;
    }

    const tempValue = parseFloat(receivingTemp);
    const maxTemp = cfg.maxTemp ?? 41;
    const isPass = tempValue <= maxTemp;

    const newItem: ReceivingItem = {
      itemDescription,
      temperature: tempValue,
      isPass,
      category: foodCategory,
      maxTemp,
    };

    if (!isPass) {
      // CCP-04 deviation — show corrective action prompt
      setPendingFailItem(newItem);
      setCcpActionTaken('');
      setCcpNotes('');
      setCcpReMeasuredTemp('');
      setShowCcpModal(true);
      return;
    }

    setReceivingItems([...receivingItems, newItem]);
    setItemDescription('');
    setReceivingTemp('');
  };

  const handleCcpSave = () => {
    if (!ccpActionTaken || !ccpNotes.trim()) {
      toast.error('Action Taken and Notes are required for CCP-04 deviations.');
      return;
    }
    if (!pendingFailItem) return;

    const itemWithDeviation: ReceivingItem = {
      ...pendingFailItem,
      ccpDeviation: {
        actionTaken: ccpActionTaken,
        notes: ccpNotes,
        reMeasuredTemp: ccpReMeasuredTemp ? parseFloat(ccpReMeasuredTemp) : undefined,
      },
    };

    setReceivingItems([...receivingItems, itemWithDeviation]);
    setItemDescription('');
    setReceivingTemp('');
    setShowCcpModal(false);
    setPendingFailItem(null);
    toast.success('Item added with CCP-04 corrective action recorded.');
  };

  const handleFinalizeReceiving = async () => {
    if (receivingItems.length === 0) {
      toast.warning('Please add at least one item');
      return;
    }

    if (!vendorName || !receivedBy) {
      toast.warning('Please complete all required fields');
      return;
    }

    // Demo mode: skip Supabase, just show result
    if (isDemoMode || !profile?.organization_id) {
      const failedCount = receivingItems.filter(i => !i.isPass).length;
      const summary = failedCount > 0
        ? `${receivingItems.length} items from ${vendorName} - ${failedCount} item(s) failed`
        : `${receivingItems.length} items from ${vendorName} - All Pass`;
      showSuccessToast(summary);
      setVendorName('');
      setItemDescription('');
      setReceivingTemp('');
      setReceivingNotes('');
      setReceivingItems([]);
      setFoodCategory('');
      setReceivedBy('');
      setShowVendorOther(false);
      return;
    }

    setLoading(true);

    const { data: locationData } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', profile?.organization_id)
      .limit(1)
      .maybeSingle();

    const insertData = receivingItems.map(item => ({
      organization_id: profile?.organization_id,
      location_id: locationData?.id,
      vendor_name: vendorName,
      item_description: item.itemDescription,
      temperature_value: item.temperature,
      is_pass: item.isPass,
      received_by: receivedBy,
      notes: receivingNotes || null,
    }));

    const { error } = await supabase.from('receiving_temp_logs').insert(insertData);

    setLoading(false);

    if (!error) {
      const failedCount = receivingItems.filter(i => !i.isPass).length;
      const summary = failedCount > 0
        ? `${receivingItems.length} items from ${vendorName} - ${failedCount} item(s) failed`
        : `${receivingItems.length} items from ${vendorName} - All Pass`;

      showSuccessToast(summary);

      // Reset form
      setVendorName('');
      setItemDescription('');
      setReceivingTemp('');
      setReceivingNotes('');
      setReceivingItems([]);
      setFoodCategory('');
      setReceivedBy('');
      setShowVendorOther(false);
    }
  };

  const getCategoryConfig = (category: string) => CATEGORY_TEMP_CONFIG[category] || null;

  const getEquipmentIcon = (type: string) => {
    return <Thermometer className="h-6 w-6" />;
  };

  const getStatusBadge = (eq: TemperatureEquipment) => {
    if (!eq.last_check) {
      return (
        <div className="flex items-center space-x-1 text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{t('tempLogs.notLoggedToday')}</span>
        </div>
      );
    }

    const isToday = new Date(eq.last_check.created_at).toDateString() === new Date().toDateString();

    if (!isToday) {
      return (
        <div className="flex items-center space-x-1 text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{t('tempLogs.notLoggedToday')}</span>
        </div>
      );
    }

    if (eq.last_check.is_within_range) {
      return (
        <div className="flex items-center space-x-1 text-green-600">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">{t('tempLogs.inRange')}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1 text-red-600">
        <X className="h-5 w-5" />
        <span className="text-sm font-medium">{t('tempLogs.outOfRange')}</span>
      </div>
    );
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getEquipmentState = (eq: TemperatureEquipment): 'logged' | 'pending' | 'outOfRange' => {
    if (!eq.last_check) return 'pending';
    const isToday = new Date(eq.last_check.created_at).toDateString() === new Date().toDateString();
    if (!isToday) return 'pending';
    if (!eq.last_check.is_within_range) return 'outOfRange';
    return 'logged';
  };

  const isEquipmentOutOfRange = (eq: TemperatureEquipment) => {
    const state = getEquipmentState(eq);
    return state === 'outOfRange' || state === 'pending';
  };

  const getLoggedTodayCount = () => {
    return equipment.filter(eq => isStorageEquipment(eq.equipment_type) && getEquipmentState(eq) === 'logged').length;
  };

  const getStorageEquipmentCount = () => {
    return equipment.filter(eq => isStorageEquipment(eq.equipment_type)).length;
  };

  const getSortedEquipment = () => {
    // Current Readings tab: storage equipment only
    let filtered = equipment.filter(eq => isStorageEquipment(eq.equipment_type));

    if (locationFilter !== 'all') {
      filtered = filtered.filter(eq => eq.location === locationFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'outOfRange') {
        const aOutOfRange = isEquipmentOutOfRange(a);
        const bOutOfRange = isEquipmentOutOfRange(b);
        if (aOutOfRange && !bOutOfRange) return -1;
        if (!aOutOfRange && bOutOfRange) return 1;
        // Within same group, sort by most recent check (not alphabetical)
        const aTime = a.last_check ? new Date(a.last_check.created_at).getTime() : 0;
        const bTime = b.last_check ? new Date(b.last_check.created_at).getTime() : 0;
        return bTime - aTime;
      } else if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'mostRecent') {
        const aTime = a.last_check ? new Date(a.last_check.created_at).getTime() : 0;
        const bTime = b.last_check ? new Date(b.last_check.created_at).getTime() : 0;
        return bTime - aTime;
      }
      return 0;
    });

    return sorted;
  };

  const getFilteredHistory = () => {
    let filtered = [...history];

    // Date range filter
    const now = new Date();
    if (historyDateRange === 'today') {
      const todayStart = startOfDay(now);
      filtered = filtered.filter(h => new Date(h.created_at) >= todayStart);
    } else if (historyDateRange === 'yesterday') {
      const yesterdayStart = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      filtered = filtered.filter(h => {
        const date = new Date(h.created_at);
        return date >= yesterdayStart && date <= yesterdayEnd;
      });
    } else if (historyDateRange === 'week') {
      const weekStart = subDays(now, 7);
      filtered = filtered.filter(h => new Date(h.created_at) >= weekStart);
    } else if (historyDateRange === 'month') {
      const monthStart = subDays(now, 30);
      filtered = filtered.filter(h => new Date(h.created_at) >= monthStart);
    } else if (historyDateRange === 'custom' && customDateFrom && customDateTo) {
      const from = new Date(customDateFrom);
      const to = endOfDay(new Date(customDateTo));
      filtered = filtered.filter(h => {
        const date = new Date(h.created_at);
        return date >= from && date <= to;
      });
    }

    // Equipment filter
    if (historyEquipment !== 'all') {
      filtered = filtered.filter(h => h.equipment_id === historyEquipment);
    }

    // Status filter
    if (historyStatus !== 'all') {
      const passFilter = historyStatus === 'pass';
      filtered = filtered.filter(h => h.is_within_range === passFilter);
    }

    // Method filter
    if (historyMethod !== 'all') {
      filtered = filtered.filter(h => (h.input_method || 'manual') === historyMethod);
    }

    // Shift filter
    if (historyShift !== 'all') {
      filtered = filtered.filter(h => h.shift === historyShift);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (historySortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'equipment_name':
          comparison = a.equipment_name.localeCompare(b.equipment_name);
          break;
        case 'temperature_value':
          comparison = a.temperature_value - b.temperature_value;
          break;
        case 'is_within_range':
          comparison = (a.is_within_range ? 1 : 0) - (b.is_within_range ? 1 : 0);
          break;
      }

      return historySortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const handleHistoryHeaderClick = (field: typeof historySortField) => {
    if (historySortField === field) {
      setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setHistorySortField(field);
      setHistorySortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredHistory();

    const headers = ['Date & Time', 'Equipment', 'Temperature', 'Status', 'Method', 'Shift', 'CCP', 'Recorded By', 'Corrective Action'];
    const rows = filtered.map(log => [
      format(new Date(log.created_at), 'MMM d, yyyy h:mm a'),
      log.equipment_name,
      `${log.temperature_value}°F`,
      log.is_within_range ? 'Pass' : 'Fail',
      log.input_method || 'manual',
      log.shift || '',
      log.ccp_number || '',
      log.recorded_by_name,
      log.corrective_action || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `temperature-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getChartData = () => {
    const filtered = getFilteredHistory();

    let selectedEquipmentIds: string[];
    if (historyEquipment === 'all') {
      selectedEquipmentIds = equipment.map(eq => eq.id);
    } else {
      selectedEquipmentIds = [historyEquipment];
    }

    const chartLogs = filtered
      .filter(log => selectedEquipmentIds.includes(log.equipment_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Merge readings at the same time slot into single data points
    // so all equipment lines share the same X-axis points
    const timeMap = new Map<string, any>();

    for (const log of chartLogs) {
      const timeLabel = format(new Date(log.created_at), 'MMM d, HH:mm');

      if (!timeMap.has(timeLabel)) {
        timeMap.set(timeLabel, { time: timeLabel, timestamp: new Date(log.created_at).getTime() });
      }

      const point = timeMap.get(timeLabel)!;
      point[log.equipment_name] = log.temperature_value;
      point[`${log.equipment_name}_inRange`] = log.is_within_range;
    }

    return Array.from(timeMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
  };

  const getChartEquipmentNames = () => {
    const filtered = getFilteredHistory();

    if (historyEquipment === 'all') {
      const names = new Set<string>();
      filtered.forEach(log => names.add(log.equipment_name));
      return Array.from(names);
    } else {
      const name = filtered.find(log => log.equipment_id === historyEquipment)?.equipment_name || '';
      return name ? [name] : [];
    }
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    const equipmentName = dataKey;
    const inRange = payload[`${equipmentName}_inRange`];

    if (inRange === false) {
      return (
        <circle cx={cx} cy={cy} r={5} fill="red" stroke="darkred" strokeWidth={2} />
      );
    }
    return null;
  };

  // Cooldown functions
  const formatCooldownElapsed = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getCooldownCountdown = (cooldown: Cooldown) => {
    const now = new Date();
    const elapsedMs = now.getTime() - cooldown.startTime.getTime();
    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;

    // Determine deadline based on phase
    const phase1DeadlineMs = 2 * 60 * 60 * 1000; // 2 hours
    const totalDeadlineMs = 6 * 60 * 60 * 1000;  // 6 hours

    let deadlineMs: number;
    let phase: 1 | 2;
    let phaseLabel: string;

    if (currentTemp > 70) {
      phase = 1;
      deadlineMs = phase1DeadlineMs;
      phaseLabel = `Reach 70°F by ${format(new Date(cooldown.startTime.getTime() + phase1DeadlineMs), 'h:mm a')}`;
    } else {
      phase = 2;
      deadlineMs = totalDeadlineMs;
      phaseLabel = `Reach 41°F by ${format(new Date(cooldown.startTime.getTime() + totalDeadlineMs), 'h:mm a')}`;
    }

    const remainingMs = Math.max(0, deadlineMs - elapsedMs);
    const isOverdue = remainingMs <= 0;
    const totalSec = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    // Color state: green >30min, amber ≤30min, red = overdue
    let color: 'green' | 'amber' | 'red' = 'green';
    if (isOverdue) color = 'red';
    else if (remainingMs <= 30 * 60 * 1000) color = 'amber';

    return { hours, minutes, seconds, phase, phaseLabel, isOverdue, color, remainingMs };
  };

  const getCooldownStatus = (cooldown: Cooldown) => {
    const now = new Date();
    const elapsed = (now.getTime() - cooldown.startTime.getTime()) / (1000 * 60 * 60);
    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;

    if (currentTemp > 70) {
      if (elapsed > 2) return 'failed';
      if (elapsed > 1.5) return 'warning';
      return 'on-track';
    }

    if (currentTemp > 41) {
      if (elapsed > 6) return 'failed';
      if (elapsed > 5) return 'warning';
      return 'on-track';
    }

    return 'completed';
  };

  const getCooldownProgress = (cooldown: Cooldown) => {
    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;
    const now = new Date();
    const elapsed = (now.getTime() - cooldown.startTime.getTime()) / (1000 * 60 * 60);

    if (currentTemp > 70) {
      const progress = ((cooldown.startTemp - currentTemp) / (cooldown.startTemp - 70)) * 100;
      return { stage: 1, progress: Math.min(100, Math.max(0, progress)), elapsed, limit: 2 };
    } else {
      const progress = ((70 - currentTemp) / (70 - 41)) * 100;
      return { stage: 2, progress: Math.min(100, Math.max(0, progress)), elapsed, limit: 6 };
    }
  };

  const handleStartCooldown = async (e: React.FormEvent) => {
    e.preventDefault();

    const newCooldown: Cooldown = {
      id: Date.now().toString(),
      itemName: cooldownForm.itemName,
      startTemp: parseFloat(cooldownForm.startTemp),
      startTime: cooldownForm.startTime ? new Date(cooldownForm.startTime) : new Date(),
      location: cooldownForm.location,
      startedBy: cooldownForm.startedBy,
      checks: [{
        temperature: parseFloat(cooldownForm.startTemp),
        time: cooldownForm.startTime ? new Date(cooldownForm.startTime) : new Date(),
      }],
      status: 'active',
    };

    const updated = [...cooldowns, newCooldown];
    setCooldowns(updated);
    saveCooldownsToStorage(updated);
    setShowStartCooldown(false);
    setCooldownForm({
      itemName: '',
      startTemp: '',
      startTime: '',
      location: '',
      startedBy: '',
    });
    showSuccessToast(`Cooldown started for ${newCooldown.itemName}`);
  };

  const handleLogCooldownCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCooldown) return;

    const newCheck: CooldownCheck = {
      temperature: parseFloat(cooldownCheckTemp),
      time: cooldownCheckTime ? new Date(cooldownCheckTime) : new Date(),
    };

    const updatedCooldowns = cooldowns.map(c => {
      if (c.id === selectedCooldown.id) {
        return { ...c, checks: [...c.checks, newCheck] };
      }
      return c;
    });

    setCooldowns(updatedCooldowns);
    saveCooldownsToStorage(updatedCooldowns);
    setShowCooldownCheckModal(false);
    setSelectedCooldown(null);
    setCooldownCheckTemp('');
    setCooldownCheckTime('');
    showSuccessToast(`Temperature check logged: ${newCheck.temperature}°F`);
  };

  const handleCompleteCooldown = (cooldownId: string) => {
    const cooldown = cooldowns.find(c => c.id === cooldownId);
    if (!cooldown) return;

    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;
    if (currentTemp > 41) {
      toast.warning('Temperature must be 41°F or below to complete');
      return;
    }

    const completedCooldown: Cooldown = {
      ...cooldown,
      status: getCooldownStatus(cooldown) === 'failed' ? 'failed' : 'completed',
      completedAt: new Date(),
    };

    const remaining = cooldowns.filter(c => c.id !== cooldownId);
    setCooldowns(remaining);
    saveCooldownsToStorage(remaining);
    setCompletedCooldowns([completedCooldown, ...completedCooldowns]);
    showSuccessToast(`Cooldown completed for ${cooldown.itemName}`);
  };

  const getTotalCooldownTime = (cooldown: Cooldown) => {
    if (!cooldown.completedAt) return 'N/A';
    const diff = cooldown.completedAt.getTime() - cooldown.startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const tempValue = parseFloat(temperature);
  const isWithinRange = selectedEquipment && tempValue >= selectedEquipment.min_temp && tempValue <= selectedEquipment.max_temp;

  const locations = ['Downtown Kitchen', 'Airport Cafe', 'University Dining']; // demo
  const vendors = ['Sysco', 'US Foods', 'Performance Food Group', 'Restaurant Depot', 'Other'];

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: t('tempLogs.title') }]} />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-sm flex items-center space-x-2">
          <Check className="h-5 w-5" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('tempLogs.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('tempLogs.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/temp-logs/scan')}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto -mx-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'equipment'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.currentReadings')}
          </button>
          <button
            onClick={() => setActiveTab('receiving')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'receiving'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.receiving')}
          </button>
          <button
            onClick={() => setActiveTab('holding')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'holding'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Thermometer className="h-3.5 w-3.5" />
            Hot/Cold Holding
          </button>
          <button
            onClick={() => setActiveTab('cooldown')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'cooldown'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.cooldown')}
          </button>
          <button
            onClick={() => setActiveTab('iot')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'iot'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            IoT Live View
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.history')}
          </button>
        </div>

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            {/* Filters Section */}
            <div data-demo-allow className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.location')}</label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="all">{t('common.allLocations')}</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.sortBy')}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="outOfRange">{t('tempLogs.outOfRangeFirst')}</option>
                    <option value="alphabetical">{t('tempLogs.alphabetical')}</option>
                    <option value="mostRecent">{t('tempLogs.mostRecent')}</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenBatchLog}
                  className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium shadow-sm flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>{t('tempLogs.batchLog')}</span>
                </button>
              </div>
            </div>

            {/* Logging Progress */}
            {isDemoMode && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Today's Progress</span>
                  <span className="text-sm font-bold text-[#1e4d6b]">{getLoggedTodayCount()} of {getStorageEquipmentCount()} logged</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${getStorageEquipmentCount() > 0 ? (getLoggedTodayCount() / getStorageEquipmentCount()) * 100 : 0}%`, backgroundColor: getLoggedTodayCount() === getStorageEquipmentCount() ? '#16a34a' : '#d4af37' }}
                  />
                </div>
                {getLoggedTodayCount() === getStorageEquipmentCount() && (
                  <p className="text-xs text-green-600 font-medium mt-1">All equipment logged — great job!</p>
                )}
              </div>
            )}

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getSortedEquipment().map((eq) => {
                const eqState = getEquipmentState(eq);
                return (
                <div key={eq.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                  eqState === 'logged' ? 'border-2 border-green-300' :
                  eqState === 'outOfRange' ? 'border-2 border-red-300' :
                  'border-2 border-amber-300'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f0f5' }}>
                        {getEquipmentIcon(eq.equipment_type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{eq.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{eq.equipment_type.replace('_', ' ')}</p>
                        {eq.location && <p className="text-xs text-gray-400">{eq.location}</p>}
                      </div>
                    </div>
                  </div>

                  {eq.last_check && (
                    <div className="mb-3">
                      <div className="text-3xl font-bold text-gray-900 text-center">
                        {eq.last_check.temperature_value}°{eq.unit}
                      </div>
                      <p className="text-xs text-gray-500">
                        {eq.last_check.recorded_by_name && (
                          <span className="font-medium text-gray-600">{eq.last_check.recorded_by_name}</span>
                        )}
                        {eq.last_check.recorded_by_name && ' · '}
                        {getRelativeTime(eq.last_check.created_at)}
                      </p>
                    </div>
                  )}

                  <div className="mb-4">{getStatusBadge(eq)}</div>

                  <div className="text-sm text-gray-600 mb-4">
                    {isFreezerType(eq.equipment_type)
                      ? `Must remain: 0°${eq.unit} or below`
                      : `${t('tempLogs.range')} ${eq.min_temp}°${eq.unit} - ${eq.max_temp}°${eq.unit}`
                    }
                  </div>

                  <button
                    onClick={() => handleLogTemp(eq)}
                    className={`w-full px-4 py-2 min-h-[44px] text-white rounded-lg transition-colors font-medium shadow-sm ${
                      eqState === 'outOfRange' ? 'bg-red-600 hover:bg-red-700' :
                      eqState === 'pending' ? 'bg-amber-500 hover:bg-amber-600' :
                      'bg-[#1e4d6b] hover:bg-[#163a52]'
                    }`}
                  >
                    {eqState === 'outOfRange' ? t('tempLogs.logTempNowWarning') :
                     eqState === 'pending' ? 'Log Now' :
                     t('tempLogs.logTemp')}
                  </button>
                </div>
              );
              })}

              {equipment.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon={Thermometer}
                    title="No equipment configured yet"
                    description="Add temperature monitoring equipment to start logging readings."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receiving Tab */}
        {activeTab === 'receiving' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8EAF6' }}>
                <Package className="h-6 w-6" style={{ color: '#1e4d6b' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('tempLogs.logReceivingTemp')}</h2>
                <p className="text-sm text-gray-600">Record temperatures for incoming deliveries</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Food Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.foodCategory')}</label>
                <select
                  value={foodCategory}
                  onChange={(e) => { setFoodCategory(e.target.value); setReceivingTemp(''); }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select category...</option>
                  {Object.entries(CATEGORY_TEMP_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                {foodCategory && (() => {
                  const cfg = getCategoryConfig(foodCategory);
                  if (!cfg) return null;
                  return cfg.tempRequired ? (
                    <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #D1D9E6' }}>
                      <p className="text-sm font-medium" style={{ color: '#1e4d6b' }}>
                        Required: Must be ≤{cfg.maxTemp}°F
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">
                        No temperature check required for this category
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.vendorName')}</label>
                <select
                  value={showVendorOther ? 'Other' : vendorName}
                  onChange={(e) => {
                    if (e.target.value === 'Other') {
                      setShowVendorOther(true);
                      setVendorName('');
                    } else {
                      setShowVendorOther(false);
                      setVendorName(e.target.value);
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
                {showVendorOther && (
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Enter vendor name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] mt-2"
                  />
                )}
              </div>

              {/* Current Item Form */}
              <form onSubmit={handleSubmitReceiving} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900">{t('tempLogs.addItem')}</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.itemDescription')}</label>
                  <input
                    type="text"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="e.g., Ground Beef, Chicken Breast"
                  />
                </div>

                {(() => {
                  const cfg = getCategoryConfig(foodCategory);
                  if (cfg && !cfg.tempRequired) return null; // Hide temp input for non-temp categories
                  const maxTemp = cfg?.maxTemp ?? 41;
                  const tempVal = receivingTemp ? parseFloat(receivingTemp) : null;
                  const isPass = tempVal !== null && !isNaN(tempVal) ? tempVal <= maxTemp : null;
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.temperatureF')}</label>
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={receivingTemp}
                        onChange={(e) => setReceivingTemp(e.target.value)}
                        required
                        className={`w-full px-4 py-6 text-4xl font-bold text-center border-4 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                          isPass === true
                            ? 'border-green-500 focus:ring-green-200 bg-green-50'
                            : isPass === false
                            ? 'border-red-500 focus:ring-red-200 bg-red-50'
                            : 'border-gray-300 focus:ring-[#d4af37]'
                        }`}
                        placeholder="Enter temp"
                      />
                      {isPass === true && (
                        <div className="mt-3 flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Check className="h-5 w-5" style={{ color: '#2E7D32' }} />
                          <span className="font-bold text-lg" style={{ color: '#2E7D32' }}>PASS — Within acceptable range</span>
                        </div>
                      )}
                      {isPass === false && (
                        <div className="mt-3 flex items-center justify-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="h-5 w-5" style={{ color: '#C62828' }} />
                          <span className="font-bold text-lg" style={{ color: '#C62828' }}>FAIL — Exceeds {maxTemp}°F limit</span>
                        </div>
                      )}
                      {!receivingTemp && foodCategory && cfg?.tempRequired && (
                        <p className="mt-2 text-sm text-gray-400 text-center">Temperature is required for this food category</p>
                      )}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  className="w-full px-4 py-3 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: '#1e4d6b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0D1652')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                >
                  {t('tempLogs.addItem')}
                </button>
              </form>

              {/* CCP-04 Corrective Action Modal */}
              {showCcpModal && pendingFailItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-6 w-6" style={{ color: '#C62828' }} />
                      <h3 className="text-lg font-bold" style={{ color: '#C62828' }}>CCP-04 Deviation — Corrective Action Required</h3>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 mb-4 text-sm">
                      <p className="font-medium text-red-800">
                        {pendingFailItem.itemDescription} received at {pendingFailItem.temperature}°F — exceeds {pendingFailItem.maxTemp}°F limit
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken <span className="text-red-500">*</span></label>
                        <select
                          value={ccpActionTaken}
                          onChange={(e) => setCcpActionTaken(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        >
                          <option value="">Select action...</option>
                          <option value="Rejected Delivery">Rejected Delivery</option>
                          <option value="Accepted with Condition">Accepted with Condition</option>
                          <option value="Re-temped After Wait">Re-temped After Wait</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-red-500">*</span></label>
                        <textarea
                          value={ccpNotes}
                          onChange={(e) => setCcpNotes(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                          placeholder="Describe the corrective action taken..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Re-measured Temperature (optional)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ccpReMeasuredTemp}
                          onChange={(e) => setCcpReMeasuredTemp(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                          placeholder="°F"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => { setShowCcpModal(false); setPendingFailItem(null); }}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCcpSave}
                        className="flex-1 px-4 py-3 text-white rounded-lg font-bold hover:opacity-90 transition-colors"
                        style={{ backgroundColor: '#1e4d6b' }}
                      >
                        Save with Corrective Action
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Added Items List */}
              {receivingItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">{t('tempLogs.itemsAdded')} ({receivingItems.length})</h3>
                  {receivingItems.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${item.ccpDeviation ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.itemDescription}</p>
                          <p className="text-sm text-gray-600">{item.temperature > 0 || item.category === 'frozen' ? `${item.temperature}°F` : 'N/A (no temp required)'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.ccpDeviation && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800">CCP-04</span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            item.isPass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isPass ? t('common.pass') : t('common.fail')}
                          </span>
                        </div>
                      </div>
                      {item.ccpDeviation && (
                        <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-700">
                          <p><span className="font-semibold">Action:</span> {item.ccpDeviation.actionTaken}</p>
                          <p><span className="font-semibold">Notes:</span> {item.ccpDeviation.notes}</p>
                          {item.ccpDeviation.reMeasuredTemp !== undefined && (
                            <p><span className="font-semibold">Re-measured:</span> {item.ccpDeviation.reMeasuredTemp}°F</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Received By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.receivedBy')}</label>
                <select
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select employee...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.notesOptional')}</label>
                <textarea
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Summary Card */}
              {receivingItems.length > 0 && vendorName && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '2px solid #b8d4e8' }}>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#1e4d6b' }}>{t('tempLogs.summary')}</h3>
                  <p style={{ color: '#2a6a8f' }}>
                    {receivingItems.length} items from {vendorName} - {' '}
                    {receivingItems.every(i => i.isPass)
                      ? <span className="font-bold text-green-700">{t('tempLogs.allPass')}</span>
                      : <span className="font-bold text-red-700">{receivingItems.filter(i => !i.isPass).length} item(s) failed</span>
                    }
                  </p>
                </div>
              )}

              {/* Finalize Button */}
              <button
                onClick={handleFinalizeReceiving}
                disabled={loading || receivingItems.length === 0}
                className="w-full px-6 py-4 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#163a52] transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? t('common.saving') : t('tempLogs.saveReceivingLog')}
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.dateRange')}</label>
                  <select
                    value={historyDateRange}
                    onChange={(e) => setHistoryDateRange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="today">{t('common.today')}</option>
                    <option value="yesterday">{t('common.yesterday')}</option>
                    <option value="week">{t('common.thisWeek')}</option>
                    <option value="month">{t('common.thisMonth')}</option>
                    <option value="custom">{t('tempLogs.custom')}</option>
                  </select>
                </div>

                {historyDateRange === 'custom' && (
                  <>
                    <div className="flex-1 min-w-0 sm:min-w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.from')}</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                      />
                    </div>
                    <div className="flex-1 min-w-0 sm:min-w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.to')}</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                      />
                    </div>
                  </>
                )}

                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.equipmentName')}</label>
                  <select
                    value={historyEquipment}
                    onChange={(e) => setHistoryEquipment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="all">{t('tempLogs.allEquipment')}</option>
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-0 sm:min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.status')}</label>
                  <select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="all">{t('common.all')}</option>
                    <option value="pass">{t('tempLogs.inRange')}</option>
                    <option value="fail">{t('tempLogs.outOfRange')}</option>
                  </select>
                </div>

                <div className="flex-1 min-w-0 sm:min-w-[140px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                  <select
                    value={historyMethod}
                    onChange={(e) => setHistoryMethod(e.target.value as 'all' | InputMethod)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="all">All Methods</option>
                    <option value="manual">Manual</option>
                    <option value="qr_scan">QR Scan</option>
                    <option value="iot_sensor">IoT Sensor</option>
                  </select>
                </div>

                <div className="flex-1 min-w-0 sm:min-w-[120px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                  <select
                    value={historyShift}
                    onChange={(e) => setHistoryShift(e.target.value as 'all' | 'morning' | 'afternoon' | 'evening')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="all">All Shifts</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setHistoryView('table')}
                    className={`px-4 py-2 min-h-[44px] rounded-lg font-medium ${
                      historyView === 'table'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('tempLogs.table')}
                  </button>
                  <button
                    onClick={() => setHistoryView('chart')}
                    className={`px-4 py-2 min-h-[44px] rounded-lg font-medium ${
                      historyView === 'chart'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('tempLogs.chart')}
                  </button>
                </div>

                <button
                  onClick={() => guardAction('export', 'temperature logs', () => exportToCSV())}
                  className="px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('tempLogs.exportCsv')}</span>
                </button>
              </div>
            </div>

            {/* Table View */}
            {historyView === 'table' && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Temperature History</h2>
                  <button
                    onClick={() => setShowHistoryDetails(!showHistoryDetails)}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <span>{showHistoryDetails ? 'Hide' : 'Show'} Details</span>
                    {showHistoryDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        onClick={() => handleHistoryHeaderClick('created_at')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{t('tempLogs.dateTime')}</span>
                          {historySortField === 'created_at' && (
                            <span>{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleHistoryHeaderClick('equipment_name')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{t('tempLogs.equipmentName')}</span>
                          {historySortField === 'equipment_name' && (
                            <span>{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleHistoryHeaderClick('temperature_value')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{t('tempLogs.temp')}</span>
                          {historySortField === 'temperature_value' && (
                            <span>{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleHistoryHeaderClick('is_within_range')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{t('common.status')}</span>
                          {historySortField === 'is_within_range' && (
                            <span>{historySortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Shift
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CCP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('tempLogs.recordedBy')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredHistory().map((log) => (
                      <Fragment key={log.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Thermometer className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{log.equipment_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {log.temperature_value}°F
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                log.is_within_range
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {log.is_within_range ? t('common.pass') : t('common.fail')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              const m = log.input_method || 'manual';
                              const cfg = m === 'qr_scan'
                                ? { icon: QrCode, label: 'QR Scan', bg: '#eef4f8', fg: '#1e4d6b' }
                                : m === 'iot_sensor'
                                ? { icon: Wifi, label: 'IoT', bg: '#ecfdf5', fg: '#065f46' }
                                : { icon: Pencil, label: 'Manual', bg: '#f3f4f6', fg: '#4b5563' };
                              const Icon = cfg.icon;
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: cfg.bg, color: cfg.fg }}>
                                  <Icon className="h-3 w-3" /> {cfg.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                            {log.shift || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.ccp_number ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                {log.ccp_number}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.recorded_by_name}
                          </td>
                        </tr>
                        {showHistoryDetails && log.corrective_action && (
                          <tr key={`${log.id}-details`} className="bg-yellow-50">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Corrective Action: </span>
                                <span className="text-gray-600">{log.corrective_action}</span>
                              </div>
                              {!log.is_within_range && (
                                <div className="mt-2">
                                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                    <Camera className="h-3 w-3" />
                                    <span className="font-medium">Photo evidence attached</span>
                                  </div>
                                  {/* TODO: In production, fetch photos from Supabase Storage for this log entry */}
                                  {/* PhotoGallery will render once photos are loaded from the compliance-photos bucket */}
                                  <PhotoGallery photos={tempPhotos} title="Temperature Evidence" />
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                </div>

                {getFilteredHistory().length === 0 && (
                  <EmptyState
                    icon={Clock}
                    title="No temperature logs found"
                    description="No logs match the selected date range and filters. Try adjusting your criteria."
                  />
                )}
              </div>
            )}

            {/* Chart View */}
            {historyView === 'chart' && (() => {
              const chartData = getChartData();
              const chartNames = getChartEquipmentNames();
              const selectedEq = historyEquipment !== 'all' ? equipment.find(e => e.id === historyEquipment) : null;

              return (
                <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Temperature Trends</h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                        <YAxis label={{ value: 'Temperature (\u00B0F)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value: number, name: string) => [`${value}\u00B0F`, name]} />
                        <Legend />
                        {selectedEq && (
                          <ReferenceLine y={selectedEq.max_temp} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Max (${selectedEq.max_temp}\u00B0F)`, position: 'right', fontSize: 11 }} />
                        )}
                        {selectedEq && (
                          <ReferenceLine y={selectedEq.min_temp} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Min (${selectedEq.min_temp}\u00B0F)`, position: 'right', fontSize: 11 }} />
                        )}
                        {chartNames.map((name) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={equipmentColors[name] || '#888888'}
                            strokeWidth={2}
                            dot={<CustomDot />}
                            connectNulls
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No data available for chart. Try adjusting your filters.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Cooldown Tab */}
        {activeTab === 'cooldown' && (
          <div className="space-y-6">
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{t('tempLogs.cooldownTracker')}</h2>
              <button
                onClick={() => setShowStartCooldown(true)}
                className="px-6 py-3 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium shadow-sm flex items-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>{t('tempLogs.startCooldown')}</span>
              </button>
            </div>

            {/* Cooling Standards Reference */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-[#eef4f8] border-b border-[#b8d4e8]">
                <h3 className="text-lg font-bold text-[#1e4d6b]">Cooling Standards Reference</h3>
                <p className="text-xs text-gray-500 mt-0.5">Both standards must be met for California locations</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {/* FDA Standard */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">FDA Food Code</span>
                    <span className="text-xs text-gray-500">§3-501.14</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">135°F → 70°F within 2 hours</p>
                        <p className="text-xs text-gray-500">Clock starts at 135°F (not cooked temp)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">70°F → 41°F within 4 hours</p>
                        <p className="text-xs text-gray-500">6 hours total from 135°F</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* California Standard */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">California</span>
                    <span className="text-xs text-gray-500">CalCode §114002(a) — effective April 1, 2026</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Cooked temp → 70°F within 2 hours</p>
                        <p className="text-xs text-red-600 font-medium">Clock starts at actual cooked temperature (stricter)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">70°F → 41°F within 4 hours</p>
                        <p className="text-xs text-gray-500">6 hours total from start of cooling</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-200">
                <p className="text-xs text-amber-800"><strong>Why California is stricter:</strong> FDA starts the 2-hour clock at 135°F. California starts it at the actual cooked temperature (e.g., 165°F for poultry). Your food must travel a greater temperature range in the same 2 hours.</p>
              </div>
            </div>

            {/* Active Cooldowns */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('tempLogs.activeCooldowns')}</h3>
              {cooldowns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cooldowns.map(cooldown => {
                    const progress = getCooldownProgress(cooldown);
                    const status = getCooldownStatus(cooldown);
                    const countdown = getCooldownCountdown(cooldown);
                    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;
                    const lastCheck = cooldown.checks[cooldown.checks.length - 1];
                    const lastCheckAgo = formatDistanceToNow(lastCheck.time, { addSuffix: true });

                    const timerBg = countdown.color === 'red' ? 'bg-red-900' : countdown.color === 'amber' ? 'bg-amber-800' : 'bg-gray-800';
                    const timerBorder = countdown.color === 'red' ? 'border-red-500' : countdown.color === 'amber' ? 'border-amber-500' : 'border-green-500';
                    const timerText = countdown.color === 'red' ? 'text-red-400' : countdown.color === 'amber' ? 'text-amber-400' : 'text-green-400';
                    const borderColor = countdown.color === 'red' ? '#dc2626' : countdown.color === 'amber' ? '#f59e0b' : '#1e4d6b';

                    return (
                      <div key={cooldown.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ border: `2px solid ${borderColor}` }}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{cooldown.itemName} — Cooling in Progress</h4>
                            <p className="text-sm text-gray-600">{cooldown.location}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold shrink-0 ${
                            status === 'on-track' ? 'bg-green-100 text-green-800' :
                            status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {status === 'on-track' ? 'On Track' : status === 'warning' ? 'Warning' : 'Overdue'}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">
                          Started: {format(cooldown.startTime, 'h:mm a')} at {cooldown.startTemp}°F
                          <span className="mx-1.5">|</span>Elapsed: {formatCooldownElapsed(cooldown.startTime)}
                        </p>

                        {/* Phase label */}
                        <div className="text-sm font-semibold text-gray-700 mb-2">
                          PHASE {countdown.phase}: {countdown.phaseLabel}
                        </div>

                        {/* Live countdown timer */}
                        <div className={`${timerBg} rounded-xl p-4 mb-4 border ${timerBorder}`}>
                          {countdown.isOverdue ? (
                            <div className="text-center">
                              <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Time Exceeded</p>
                              <div className="font-mono text-4xl font-bold text-red-400 tracking-wider">
                                00 : 00 : 00
                              </div>
                              <p className="text-red-400/70 text-xs mt-1">Corrective action required</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className={`font-mono text-4xl font-bold ${timerText} tracking-wider`}>
                                {String(countdown.hours).padStart(2, '0')} : {String(countdown.minutes).padStart(2, '0')} : {String(countdown.seconds).padStart(2, '0')}
                              </div>
                              <div className={`flex justify-center gap-8 text-xs ${timerText}/60 mt-1`}>
                                <span>hrs</span><span>min</span><span>sec</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Current temp + last check */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Current</p>
                            <p className="text-2xl font-bold text-gray-900">{currentTemp}°F</p>
                          </div>
                          <p className="text-xs text-gray-400">logged {lastCheckAgo}</p>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all"
                              style={{
                                width: `${progress.progress}%`,
                                backgroundColor: countdown.color === 'red' ? '#dc2626' : countdown.color === 'amber' ? '#f59e0b' : '#1e4d6b',
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(progress.progress)}% cooled</p>
                        </div>

                        {/* Mini chart */}
                        <div className="mb-4" style={{ height: '80px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={cooldown.checks.map(check => ({
                              temp: check.temperature,
                              time: format(check.time, 'HH:mm'),
                            }))}>
                              <XAxis dataKey="time" fontSize={10} />
                              <YAxis fontSize={10} />
                              <Line type="monotone" dataKey="temp" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} />
                              <ReferenceLine y={70} stroke="orange" strokeDasharray="3 3" />
                              <ReferenceLine y={41} stroke="#22c55e" strokeDasharray="3 3" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setSelectedCooldown(cooldown);
                              setShowCooldownCheckModal(true);
                              setCooldownCheckTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                            }}
                            className="px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150 font-medium"
                          >
                            + Log Temperature Now
                          </button>
                          <button
                            onClick={() => handleCompleteCooldown(cooldown.id)}
                            className="px-4 py-2 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            {t('tempLogs.complete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active cooldowns</p>
                </div>
              )}
            </div>

            {/* Completed Cooldowns */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('tempLogs.completedCooldowns')}</h3>
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Temp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Temp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completedCooldowns.map(cooldown => {
                      const finalTemp = cooldown.checks[cooldown.checks.length - 1].temperature;
                      return (
                        <tr key={cooldown.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(cooldown.startTime, 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {cooldown.itemName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cooldown.startTemp}°F
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {finalTemp}°F
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getTotalCooldownTime(cooldown)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              cooldown.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {cooldown.status === 'completed' ? t('common.pass') : t('common.fail')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {completedCooldowns.length === 0 && (
                  <EmptyState
                    icon={StopCircle}
                    title="No completed cooldowns yet"
                    description="Completed cooldown tracking records will appear here."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* IoT Live View Tab */}
        {activeTab === 'iot' && (() => {
          const locationSensors = locationFilter === 'all'
            ? iotSensors
            : iotSensors.filter(s => s.locationName.toLowerCase().includes(locationFilter.toLowerCase()));
          const onlineCount = locationSensors.filter(s => s.status === 'online').length;
          const warningCount = locationSensors.filter(s => s.status === 'warning').length;
          const offlineCount = locationSensors.filter(s => s.status === 'offline' || s.status === 'error').length;

          // Generate sparkline data for each sensor
          const getSparkline = (sensor: IoTSensor) => {
            const readings = iotSensorReadings.filter(r => r.sensorId === sensor.id);
            const base = sensor.currentTempF;
            const points = [];
            for (let i = 23; i >= 0; i--) {
              const h = new Date();
              h.setHours(h.getHours() - i, 0, 0, 0);
              const jitter = (Math.sin(i * 2.1 + sensor.id.charCodeAt(5)) * 1.5) + (Math.cos(i * 0.7) * 0.5);
              points.push({ hour: format(h, 'ha'), temp: Math.round((base + jitter) * 10) / 10 });
            }
            return points;
          };

          const getStatusColor = (s: string) => s === 'online' ? '#16a34a' : s === 'warning' ? '#f59e0b' : '#dc2626';
          const getStatusLabel = (s: string) => s === 'online' ? 'Connected' : s === 'warning' ? 'Warning' : 'Disconnected';

          // Get threshold for sensor
          const getThreshold = (sensor: IoTSensor) => {
            const zone = sensor.zone.toLowerCase();
            if (zone.includes('freezer')) return { min: -Infinity, max: 0 };
            if (zone.includes('cooler') || zone.includes('walk-in') || zone.includes('reach-in') || zone.includes('salad') || zone.includes('beverage') || zone.includes('display')) return { min: 32, max: 41 };
            if (zone.includes('hot')) return { min: 135, max: 200 };
            if (zone.includes('dry')) return { min: 50, max: 75 };
            return { min: 32, max: 80 };
          };

          const isInRange = (sensor: IoTSensor) => {
            const t = getThreshold(sensor);
            return sensor.currentTempF >= t.min && sensor.currentTempF <= t.max;
          };

          // Build combined log: IoT readings + manual readings merged
          const combinedLog = [
            ...iotSensorReadings
              .filter(r => {
                if (locationFilter === 'all') return true;
                const s = iotSensors.find(s => s.id === r.sensorId);
                return s && s.locationName.toLowerCase().includes(locationFilter.toLowerCase());
              })
              .map(r => {
                const s = iotSensors.find(s => s.id === r.sensorId);
                return {
                  time: r.timestamp,
                  equipment: s?.name || 'Unknown',
                  temp: r.temperatureF,
                  inRange: r.complianceStatus === 'in_range',
                  source: 'iot' as const,
                };
              }),
            // Add recent manual readings from history
            ...history.slice(0, 5).map(h => ({
              time: h.created_at,
              equipment: h.equipment_name,
              temp: h.temperature_value,
              inRange: h.is_within_range,
              source: 'manual' as const,
            })),
          ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);

          const providerFor = (slug: string) => iotSensorProviders.find(p => p.slug === slug);

          return (
            <div className="space-y-6">
              {/* IoT Status Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-green-100"><Wifi className="h-5 w-5 text-green-600" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{onlineCount}</p><p className="text-xs text-gray-500">Online Sensors</p></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{warningCount}</p><p className="text-xs text-gray-500">Warnings</p></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-red-100"><WifiOff className="h-5 w-5 text-red-600" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{offlineCount}</p><p className="text-xs text-gray-500">Disconnected</p></div>
                </div>
              </div>

              {/* Live Sensor Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {locationSensors.map(sensor => {
                  const sparkline = getSparkline(sensor);
                  const threshold = getThreshold(sensor);
                  const inRange = isInRange(sensor);
                  const provider = providerFor(sensor.providerSlug);
                  const lastSeen = formatDistanceToNow(new Date(sensor.lastSeenAt), { addSuffix: true });

                  return (
                    <div key={sensor.id} className={`bg-white rounded-xl border-2 p-4 ${
                      sensor.status === 'offline' || sensor.status === 'error' ? 'border-red-200' :
                      !inRange || sensor.status === 'warning' ? 'border-amber-200' : 'border-green-200'
                    }`}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{sensor.name}</h4>
                          <p className="text-xs text-gray-500">{sensor.locationName} &middot; {sensor.zone}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(sensor.status) }} />
                          <span className="text-[10px] font-medium" style={{ color: getStatusColor(sensor.status) }}>
                            {getStatusLabel(sensor.status)}
                          </span>
                        </div>
                      </div>

                      {/* Current Reading */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-3xl font-bold ${inRange ? 'text-gray-900' : 'text-red-600'}`}>
                          {sensor.currentTempF}°F
                        </span>
                        {inRange ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">In Range</span>
                        ) : (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Out of Range</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{lastSeen} &middot; Range: {threshold.min}–{threshold.max}°F</p>

                      {/* Mini Sparkline */}
                      <div className="h-16 -mx-1 mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`grad-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={inRange ? '#16a34a' : '#dc2626'} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={inRange ? '#16a34a' : '#dc2626'} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="temp" stroke={inRange ? '#16a34a' : '#dc2626'} fill={`url(#grad-${sensor.id})`} strokeWidth={1.5} dot={false} />
                            <ReferenceLine y={threshold.max} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={0.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Footer: provider, battery, signal */}
                      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: provider?.color || '#888' }} />
                          <span>{provider?.name || sensor.providerSlug}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-0.5">
                            <Battery className="h-3 w-3" /> {sensor.batteryPct}%
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Signal className="h-3 w-3" /> {sensor.signalRssi}dBm
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combined Readings Log */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Combined Readings Log</h3>
                  <p className="text-xs text-gray-500">IoT sensor and manual readings in one timeline</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Time</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Equipment</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Temp</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedLog.map((entry, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                            {format(new Date(entry.time), 'h:mm a')}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{entry.equipment}</td>
                          <td className="px-4 py-2.5 text-sm font-bold text-right">{entry.temp}°F</td>
                          <td className="px-4 py-2.5 text-center">
                            {entry.inRange ? (
                              <span className="text-green-600 text-xs font-medium">In Range</span>
                            ) : (
                              <span className="text-red-600 text-xs font-medium">Out of Range</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {entry.source === 'iot' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Radio className="h-3 w-3" /> IoT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                <Pen className="h-3 w-3" /> Manual
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supported Sensors CTA */}
              <div className="bg-gradient-to-br from-[#1e4d6b]/5 to-[#d4af37]/5 rounded-xl border border-[#1e4d6b]/10 p-5">
                <h3 className="text-sm font-semibold text-[#1e4d6b] mb-2">Supported IoT Sensors</h3>
                <p className="text-xs text-gray-600 mb-3">Connect any of these sensors to auto-fill your temperature log. Zero manual entry.</p>
                <div className="flex flex-wrap gap-2">
                  {iotSensorProviders.filter(p => p.status !== 'available' || p.sensorCount > 0 || ['tempstick', 'sensorpush', 'compliancemate'].includes(p.slug)).slice(0, 6).map(p => (
                    <span key={p.slug} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-gray-200">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                      {p.status === 'connected' && <Check className="h-3 w-3 text-green-500" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hot/Cold Holding Tab */}
        {activeTab === 'holding' && (() => {
          const holdingEquip = equipment.filter(eq => isHoldingEquipment(eq.equipment_type));
          const coldHolding = holdingEquip.filter(eq => isHoldingCold(eq.equipment_type));
          const hotHolding = holdingEquip.filter(eq => isHoldingHot(eq.equipment_type));
          // Compliance badge: count holding equipment with valid recent readings
          const holdingCompliant = holdingEquip.filter(eq => {
            if (!eq.last_check) return false;
            const ageMin = (Date.now() - new Date(eq.last_check.created_at).getTime()) / (1000 * 60);
            return eq.last_check.is_within_range && ageMin <= 240;
          }).length;

          return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Hot/Cold Holding Status</h2>
                  <p className="text-xs text-gray-500 mt-0.5">CalCode §113996 — Temperature holding compliance</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${holdingCompliant === holdingEquip.length ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {holdingCompliant}/{holdingEquip.length} Compliant
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cold Holding */}
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Thermometer className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Cold Holding</h3>
                      <p className="text-xs text-gray-500">Must remain ≤ 41°F — check every 4 hours</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {coldHolding.map(eq => {
                      const inRange = eq.last_check?.is_within_range ?? true;
                      const lastCheckAge = eq.last_check ? (Date.now() - new Date(eq.last_check.created_at).getTime()) / (1000 * 60) : Infinity;
                      const isOverdue = lastCheckAge > 240; // 4 hours
                      const isDueSoon = lastCheckAge > 210 && lastCheckAge <= 240; // 3.5-4 hours
                      return (
                        <div key={eq.id} className={`py-2 px-3 bg-white rounded-lg border ${isOverdue ? 'border-red-300 bg-red-50/30' : isDueSoon ? 'border-amber-300 bg-amber-50/30' : !inRange ? 'border-red-300' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {inRange && !isOverdue ? <Check className="h-4 w-4 text-green-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                              <span className="text-sm text-gray-900 truncate">{eq.name}</span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 shrink-0">CHECK OVERDUE</span>
                              )}
                              {isDueSoon && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">DUE SOON</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className={`text-sm font-semibold ${inRange ? 'text-green-700' : 'text-red-700'}`}>
                                  {eq.last_check?.temperature_value ?? '--'}°F
                                </span>
                                {eq.last_check && (
                                  <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(eq.last_check.created_at), { addSuffix: true })}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleLogTemp(eq)}
                                className="ml-1 px-2 py-1 text-xs font-semibold rounded-md bg-[#1e4d6b] text-white hover:bg-[#163a52] transition-colors whitespace-nowrap"
                              >
                                + Log
                              </button>
                            </div>
                          </div>
                          {eq.last_check?.recorded_by_name === 'IoT Sensor' && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600">
                              <Radio className="h-3 w-3" /> IoT sensor reading
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {coldHolding.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No cold holding equipment</p>
                    )}
                  </div>
                </div>

                {/* Hot Holding */}
                <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Thermometer className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Hot Holding</h3>
                      <p className="text-xs text-gray-500">Must remain ≥ 135°F — check every 4 hours</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {hotHolding.map(eq => {
                      const inRange = eq.last_check?.is_within_range ?? true;
                      const lastCheckAge = eq.last_check ? (Date.now() - new Date(eq.last_check.created_at).getTime()) / (1000 * 60) : Infinity;
                      const isOverdue = lastCheckAge > 240; // 4 hours
                      const isDueSoon = lastCheckAge > 210 && lastCheckAge <= 240; // 3.5-4 hours
                      return (
                        <div key={eq.id} className={`py-2 px-3 bg-white rounded-lg border ${isOverdue ? 'border-red-300 bg-red-50/30' : isDueSoon ? 'border-amber-300 bg-amber-50/30' : !inRange ? 'border-red-300' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {inRange && !isOverdue ? <Check className="h-4 w-4 text-green-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                              <span className="text-sm text-gray-900 truncate">{eq.name}</span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 shrink-0">CHECK OVERDUE</span>
                              )}
                              {isDueSoon && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">DUE SOON</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className={`text-sm font-semibold ${inRange ? 'text-green-700' : 'text-red-700'}`}>
                                  {eq.last_check?.temperature_value ?? '--'}°F
                                </span>
                                {eq.last_check && (
                                  <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(eq.last_check.created_at), { addSuffix: true })}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleLogTemp(eq)}
                                className="ml-1 px-2 py-1 text-xs font-semibold rounded-md bg-[#1e4d6b] text-white hover:bg-[#163a52] transition-colors whitespace-nowrap"
                              >
                                + Log
                              </button>
                            </div>
                          </div>
                          {eq.last_check?.recorded_by_name === 'IoT Sensor' && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600">
                              <Radio className="h-3 w-3" /> IoT sensor reading
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {hotHolding.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No hot holding equipment</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Reference */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Regulatory Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="font-semibold text-blue-800">CalCode §113996(a)</span> — Cold potentially hazardous food shall be held at 41°F or below
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <span className="font-semibold text-orange-800">CalCode §113996(b)</span> — Hot potentially hazardous food shall be held at 135°F or above
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (() => {
          const allHistory = history;
          const manualCount = allHistory.filter(h => (h.input_method || 'manual') === 'manual').length;
          const qrCount = allHistory.filter(h => h.input_method === 'qr_scan').length;
          const iotCount = allHistory.filter(h => h.input_method === 'iot_sensor').length;
          const totalCount = allHistory.length;
          const passCount = allHistory.filter(h => h.is_within_range).length;
          const complianceRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

          const methodData = [
            { name: 'Manual', value: manualCount, color: '#6b7280' },
            { name: 'QR Scan', value: qrCount, color: '#1e4d6b' },
            { name: 'IoT Sensor', value: iotCount, color: '#059669' },
          ].filter(d => d.value > 0);

          // Weekly compliance trend
          const weeklyData: { week: string; rate: number; count: number }[] = [];
          for (let w = 3; w >= 0; w--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - w * 7);
            const weekLogs = allHistory.filter(h => {
              const d = new Date(h.created_at);
              return d >= weekStart && d < weekEnd;
            });
            const weekPass = weekLogs.filter(h => h.is_within_range).length;
            weeklyData.push({
              week: `Week ${4 - w}`,
              rate: weekLogs.length > 0 ? Math.round((weekPass / weekLogs.length) * 100) : 0,
              count: weekLogs.length,
            });
          }

          // Equipment compliance
          const eqNames = [...new Set(allHistory.map(h => h.equipment_name))];
          const eqComplianceData = eqNames.slice(0, 8).map(name => {
            const logs = allHistory.filter(h => h.equipment_name === name);
            const pass = logs.filter(h => h.is_within_range).length;
            return { name: name.length > 15 ? name.slice(0, 15) + '...' : name, rate: logs.length > 0 ? Math.round((pass / logs.length) * 100) : 0, total: logs.length };
          });

          // Time of day distribution
          const hourBuckets: Record<string, number> = {};
          for (const h of allHistory) {
            const hour = new Date(h.created_at).getHours();
            const label = hour < 10 ? `0${hour}:00` : `${hour}:00`;
            hourBuckets[label] = (hourBuckets[label] || 0) + 1;
          }
          const timeData = Object.entries(hourBuckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, count]) => ({ time, count }));

          return (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>{totalCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Readings</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                  <p className={`text-2xl font-bold ${complianceRate >= 95 ? 'text-green-600' : complianceRate >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {complianceRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Compliance Rate</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{manualCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Manual Entries</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: '#059669' }}>{iotCount + qrCount}</p>
                  <p className="text-xs text-gray-500 mt-1">QR + IoT Entries</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Input Method Breakdown</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={methodData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {methodData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {methodData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Compliance Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Weekly Compliance Rate</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <ReferenceLine y={95} stroke="#d4af37" strokeDasharray="5 5" label={{ value: 'Target 95%', fill: '#d4af37', fontSize: 10 }} />
                        <Line type="monotone" dataKey="rate" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Equipment Compliance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Equipment Compliance</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eqComplianceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[80, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="rate" fill="#1e4d6b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Time of Day Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Time of Day Distribution</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#d4af37" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Log Temperature Modal */}
      {showLogModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-5 w-[95vw] sm:w-auto max-w-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-2 text-center">{selectedEquipment.name}</h3>
            <p className="text-center text-gray-600 mb-6">
              {t('tempLogs.range')} {selectedEquipment.min_temp}°{selectedEquipment.unit} - {selectedEquipment.max_temp}°
              {selectedEquipment.unit}
            </p>

            <form onSubmit={handleSubmitTemp} className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">{t('tempLogs.temperatureF')}</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  autoFocus
                  required
                  className={`w-full px-4 py-6 text-4xl font-bold text-center border-4 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                    temperature && isWithinRange
                      ? 'border-green-500 focus:ring-green-200 bg-green-50'
                      : temperature && !isWithinRange
                      ? 'border-red-500 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:ring-[#d4af37]'
                  }`}
                  placeholder="00.0"
                />
                {temperature && (
                  <div className="mt-3 text-center">
                    {isWithinRange ? (
                      <span className="text-green-600 font-bold text-2xl">Within safe range ✅</span>
                    ) : (
                      <span className="text-red-600 font-bold text-2xl">Outside safe range ⚠️</span>
                    )}
                  </div>
                )}
              </div>

              {temperature && !isWithinRange && (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <span className="text-lg font-bold text-red-600">
                      {tempValue > selectedEquipment.max_temp
                        ? `${tempValue}°F is above the safe range (${selectedEquipment.min_temp}–${selectedEquipment.max_temp}°F)`
                        : `${tempValue}°F is below the safe range (${selectedEquipment.min_temp}–${selectedEquipment.max_temp}°F)`
                      }
                    </span>
                  </div>

                  {isDemoMode ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">A corrective action is recommended</p>
                      <button
                        type="button"
                        onClick={() => guardAction('edit', 'corrective actions', () => {})}
                        className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                      >
                        Create Corrective Action
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('common.correctiveActionRequired')} <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        value={correctiveAction}
                        onChange={(e) => setCorrectiveAction(e.target.value)}
                        required
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        placeholder="Describe the corrective action taken..."
                      />
                    </>
                  )}
                </div>
              )}

              {/* Photo Evidence */}
              <PhotoEvidence
                photos={tempPhotos}
                onChange={setTempPhotos}
                highlight={!!temperature && !isWithinRange}
                highlightText={temperature && !isWithinRange ? 'Photo evidence recommended' : undefined}
                label={temperature && !isWithinRange ? t('tempLogs.photoRecommended') : t('common.photoEvidence')}
                required={false}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.recordedBy')}</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select employee...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-6 py-4 border-2 border-[#1e4d6b] rounded-xl text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-4 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#163a52] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Log Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Batch Temperature Logging</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.recordedBy')}</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              >
                <option value="">Select employee...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4 mb-6">
              {batchEntries.map(entry => {
                const tempValue = parseFloat(entry.temperature);
                const isValid = !isNaN(tempValue) && tempValue >= entry.min_temp && tempValue <= entry.max_temp;

                return (
                  <div key={entry.equipment_id} className={`p-4 border-2 rounded-lg ${
                    entry.skipped ? 'bg-gray-50 border-gray-300' :
                    entry.temperature && !isValid ? 'bg-red-50 border-red-300' :
                    entry.temperature && isValid ? 'bg-green-50 border-green-300' :
                    'border-gray-300'
                  }`}>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900">{entry.equipment_name}</h4>
                        <p className="text-sm text-gray-600">
                          {entry.min_temp === -Infinity
                            ? `Must remain: ${entry.max_temp}°F or below`
                            : `${t('tempLogs.range')} ${entry.min_temp}°F - ${entry.max_temp}°F`
                          }
                        </p>
                      </div>

                      {!entry.skipped && (
                        <div className="flex items-center space-x-4">
                          <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            value={entry.temperature}
                            onChange={(e) => handleBatchTempChange(entry.equipment_id, e.target.value)}
                            placeholder="Temp"
                            className="w-28 sm:w-32 px-3 sm:px-4 py-2 min-h-[44px] text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                          />
                          {entry.temperature && (
                            <span className={`font-bold text-lg ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                              {isValid ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleBatchSkip(entry.equipment_id)}
                        className={`ml-0 sm:ml-4 px-4 py-2 min-h-[44px] rounded-lg font-medium ${
                          entry.skipped
                            ? 'bg-[#1e4d6b] text-white hover:bg-[#163a52]'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {entry.skipped ? 'Include' : 'Skip'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-6 py-4 border-2 border-[#1e4d6b] rounded-xl text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmitBatch}
                disabled={loading || !selectedUser}
                className="px-6 py-4 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#163a52] transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? t('common.saving') : t('tempLogs.saveAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Cooldown Modal */}
      {showStartCooldown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-5 w-[95vw] sm:w-auto max-w-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Start New Cooldown</h3>

            <form onSubmit={handleStartCooldown} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.foodItemName')}</label>
                <input
                  type="text"
                  value={cooldownForm.itemName}
                  onChange={(e) => setCooldownForm({ ...cooldownForm, itemName: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="e.g., Rice Pilaf, Chicken Soup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.startingTempF')}</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={cooldownForm.startTemp}
                  onChange={(e) => setCooldownForm({ ...cooldownForm, startTemp: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="e.g., 165"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.startTime')}</label>
                <input
                  type="datetime-local"
                  value={cooldownForm.startTime}
                  onChange={(e) => setCooldownForm({ ...cooldownForm, startTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use current time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.location')}</label>
                <select
                  value={cooldownForm.location}
                  onChange={(e) => setCooldownForm({ ...cooldownForm, location: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select location...</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.startedBy')}</label>
                <select
                  value={cooldownForm.startedBy}
                  onChange={(e) => setCooldownForm({ ...cooldownForm, startedBy: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select employee...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.full_name}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowStartCooldown(false)}
                  className="px-6 py-3 border-2 border-[#1e4d6b] rounded-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg font-bold hover:bg-[#163a52] transition-colors"
                >
                  Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demo Upgrade Prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}

      {/* Cooldown Check Modal */}
      {showCooldownCheckModal && selectedCooldown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-5 w-[95vw] sm:w-auto max-w-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-2">{selectedCooldown.itemName}</h3>
            <p className="text-gray-600 mb-6">Log Temperature Check</p>

            <form onSubmit={handleLogCooldownCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.temperatureF')}</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={cooldownCheckTemp}
                  onChange={(e) => setCooldownCheckTemp(e.target.value)}
                  required
                  className="w-full px-4 py-6 text-4xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="00.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check Time</label>
                <input
                  type="datetime-local"
                  value={cooldownCheckTime}
                  onChange={(e) => setCooldownCheckTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCooldownCheckModal(false);
                    setSelectedCooldown(null);
                  }}
                  className="px-6 py-3 border-2 border-[#1e4d6b] rounded-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg font-bold hover:bg-[#163a52] transition-colors"
                >
                  Save Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
