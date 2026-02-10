import { useState, useEffect, Fragment } from 'react';
import { Plus, Thermometer, Check, X, Clock, Package, ChevronDown, ChevronUp, Download, TrendingUp, Play, StopCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { generateTempDemoHistory, equipmentColors } from '../data/tempDemoHistory';
import { PhotoEvidence, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { Camera } from 'lucide-react';

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

export function TempLogs() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<TemperatureEquipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<TempCheckCompletion[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<TemperatureEquipment | null>(null);
  const [temperature, setTemperature] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [activeTab, setActiveTab] = useState<'equipment' | 'receiving' | 'history' | 'cooldown'>('equipment');
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

  // Timer for active cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns([...cooldowns]); // Force re-render to update timers
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [cooldowns]);

  const loadDemoData = () => {
    const now = new Date();
    const demoEquipment: TemperatureEquipment[] = [
      {
        id: '1',
        name: 'Walk-in Cooler',
        equipment_type: 'cooler',
        min_temp: 32,
        max_temp: 41,
        unit: 'F',
        location: 'Downtown Kitchen',
        last_check: {
          temperature_value: 38,
          created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Mike Johnson',
        },
      },
      {
        id: '2',
        name: 'Walk-in Freezer',
        equipment_type: 'freezer',
        min_temp: -10,
        max_temp: 0,
        unit: 'F',
        location: 'Downtown Kitchen',
        last_check: {
          temperature_value: -2,
          created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Mike Johnson',
        },
      },
      {
        id: '3',
        name: 'Prep Cooler',
        equipment_type: 'cooler',
        min_temp: 32,
        max_temp: 41,
        unit: 'F',
        location: 'Airport Cafe',
        last_check: {
          temperature_value: 40,
          created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          is_within_range: true,
          recorded_by_name: 'Sarah Chen',
        },
      },
      {
        id: '4',
        name: 'Hot Hold Cabinet',
        equipment_type: 'hot_hold',
        min_temp: 135,
        max_temp: 165,
        unit: 'F',
        location: 'University Dining',
        last_check: {
          temperature_value: 127,
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          is_within_range: false,
          recorded_by_name: 'Sarah Chen',
        },
      },
      {
        id: '5',
        name: 'Salad Bar',
        equipment_type: 'cooler',
        min_temp: 32,
        max_temp: 41,
        unit: 'F',
        location: 'Airport Cafe',
        last_check: {
          temperature_value: 43,
          created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
          is_within_range: false,
          recorded_by_name: 'Emma Davis',
        },
      },
      {
        id: '6',
        name: 'Reach-in Freezer',
        equipment_type: 'freezer',
        min_temp: -10,
        max_temp: 0,
        unit: 'F',
        location: 'University Dining',
        last_check: {
          temperature_value: 2,
          created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          is_within_range: false,
          recorded_by_name: 'Mike Johnson',
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
        location: 'Downtown Kitchen',
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
        location: 'University Dining',
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
        location: 'Downtown Kitchen',
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
        location: 'Airport Cafe',
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
        location: 'University Dining',
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
        location: 'Downtown Kitchen',
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

    if (!isWithinRange && !correctiveAction.trim()) {
      alert('Corrective action is required when temperature is out of range');
      return;
    }

    // Demo mode: update local state only
    if (isDemoMode || !profile?.organization_id) {
      const now = new Date();
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
        corrective_action: !isWithinRange ? correctiveAction : null,
        created_at: now.toISOString(),
      }, ...prev]);
      setShowLogModal(false);
      setTempPhotos([]);
      showSuccessToast(`${tempValue}°F logged for ${selectedEquipment.name}`);
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
      alert('Please log at least one temperature');
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

    const tempValue = parseFloat(receivingTemp);
    const isPass = getCategoryStandard(foodCategory) === 'check'
      ? tempValue <= 41
      : foodCategory === 'Frozen'
      ? tempValue <= 0
      : tempValue <= 41;

    const newItem: ReceivingItem = {
      itemDescription,
      temperature: tempValue,
      isPass,
    };

    setReceivingItems([...receivingItems, newItem]);
    setItemDescription('');
    setReceivingTemp('');
  };

  const handleFinalizeReceiving = async () => {
    if (receivingItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (!vendorName || !receivedBy) {
      alert('Please complete all required fields');
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

  const getCategoryStandard = (category: string) => {
    switch (category) {
      case 'Frozen':
        return '≤ 0°F';
      case 'Produce':
        return 'No specific temp';
      default:
        return '≤ 41°F';
    }
  };

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

  const isEquipmentOutOfRange = (eq: TemperatureEquipment) => {
    if (!eq.last_check) return true;
    const isToday = new Date(eq.last_check.created_at).toDateString() === new Date().toDateString();
    return !isToday || !eq.last_check.is_within_range;
  };

  const getSortedEquipment = () => {
    let filtered = equipment;

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

    const headers = ['Date & Time', 'Equipment', 'Temperature', 'Status', 'Recorded By', 'Corrective Action'];
    const rows = filtered.map(log => [
      format(new Date(log.created_at), 'MMM d, yyyy h:mm a'),
      log.equipment_name,
      `${log.temperature_value}°F`,
      log.is_within_range ? 'Pass' : 'Fail',
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
  const formatCooldownTime = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getCooldownStatus = (cooldown: Cooldown) => {
    const now = new Date();
    const elapsed = (now.getTime() - cooldown.startTime.getTime()) / (1000 * 60 * 60); // hours
    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;

    // Stage 1: 135°F to 70°F within 2 hours
    if (currentTemp > 70) {
      if (elapsed > 2) return 'failed';
      if (elapsed > 1.5) return 'warning';
      return 'on-track';
    }

    // Stage 2: 70°F to 41°F within 6 hours total (4 more hours)
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
      // Stage 1
      const progress = ((cooldown.startTemp - currentTemp) / (cooldown.startTemp - 70)) * 100;
      return { stage: 1, progress: Math.min(100, Math.max(0, progress)), elapsed, limit: 2 };
    } else {
      // Stage 2
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

    setCooldowns([...cooldowns, newCooldown]);
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
        const updatedChecks = [...c.checks, newCheck];
        return { ...c, checks: updatedChecks };
      }
      return c;
    });

    setCooldowns(updatedCooldowns);
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
      alert('Cannot complete cooldown - temperature must be 41°F or below');
      return;
    }

    const completedCooldown: Cooldown = {
      ...cooldown,
      status: getCooldownStatus(cooldown) === 'failed' ? 'failed' : 'completed',
      completedAt: new Date(),
    };

    setCooldowns(cooldowns.filter(c => c.id !== cooldownId));
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

  const locations = ['Downtown Kitchen', 'Airport Cafe', 'University Dining'];
  const vendors = ['Sysco', 'US Foods', 'Performance Food Group', 'Restaurant Depot', 'Other'];

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: t('tempLogs.title') }]} />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-2">
          <Check className="h-5 w-5" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tempLogs.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('tempLogs.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'equipment'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.currentReadings')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'history'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.history')}
          </button>
          <button
            onClick={() => setActiveTab('receiving')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'receiving'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.receiving')}
          </button>
          <button
            onClick={() => setActiveTab('cooldown')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'cooldown'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('tempLogs.cooldown')}
          </button>
        </div>

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
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

                <div className="flex-1 min-w-[200px]">
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
                  className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium shadow-sm flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>{t('tempLogs.batchLog')}</span>
                </button>
              </div>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getSortedEquipment().map((eq) => (
                <div key={eq.id} className={`bg-white rounded-lg shadow p-6 ${isEquipmentOutOfRange(eq) ? 'border-2 border-red-300' : 'border-2 border-green-300'}`}>
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
                    {t('tempLogs.range')} {eq.min_temp}°{eq.unit} - {eq.max_temp}°{eq.unit}
                  </div>

                  <button
                    onClick={() => handleLogTemp(eq)}
                    className={`w-full px-4 py-2 text-white rounded-lg transition-colors font-medium shadow-sm ${isEquipmentOutOfRange(eq) ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e4d6b] hover:bg-[#163a52]'}`}
                  >
                    {isEquipmentOutOfRange(eq) ? t('tempLogs.logTempNowWarning') : t('tempLogs.logTemp')}
                  </button>
                </div>
              ))}

              {equipment.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Thermometer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No equipment configured yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receiving Tab */}
        {activeTab === 'receiving' && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
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
                  onChange={(e) => setFoodCategory(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="">Select category...</option>
                  <option value="Meat/Poultry">{t('tempLogs.meatPoultry')}</option>
                  <option value="Seafood">{t('tempLogs.seafood')}</option>
                  <option value="Dairy">{t('tempLogs.dairy')}</option>
                  <option value="Frozen">{t('tempLogs.frozen')}</option>
                  <option value="Produce">{t('tempLogs.produce')}</option>
                  <option value="Other">{t('tempLogs.other')}</option>
                </select>
                {foodCategory && (
                  <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                    <p className="text-sm font-medium" style={{ color: '#1e4d6b' }}>
                      {t('tempLogs.receivingStandard')} {getCategoryStandard(foodCategory)}
                    </p>
                  </div>
                )}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.temperatureF')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={receivingTemp}
                    onChange={(e) => setReceivingTemp(e.target.value)}
                    required
                    className={`w-full px-4 py-6 text-4xl font-bold text-center border-4 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                      receivingTemp && parseFloat(receivingTemp) <= 41
                        ? 'border-green-500 focus:ring-green-200 bg-green-50'
                        : receivingTemp
                        ? 'border-red-500 focus:ring-red-200 bg-red-50'
                        : 'border-gray-300 focus:ring-[#d4af37]'
                    }`}
                    placeholder="00.0"
                  />
                  {receivingTemp && (
                    <div className="mt-2 text-center">
                      {parseFloat(receivingTemp) <= 41 ? (
                        <span className="text-green-600 font-bold text-xl">PASS ✓</span>
                      ) : (
                        <span className="text-red-600 font-bold text-xl">FAIL ✗</span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium"
                >
                  {t('tempLogs.addItem')}
                </button>
              </form>

              {/* Added Items List */}
              {receivingItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">{t('tempLogs.itemsAdded')} ({receivingItems.length})</h3>
                  {receivingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{item.itemDescription}</p>
                        <p className="text-sm text-gray-600">{item.temperature}°F</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.isPass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.isPass ? t('common.pass') : t('common.fail')}
                      </span>
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
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
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
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.from')}</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
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

                <div className="flex-1 min-w-[200px]">
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

                <div className="flex-1 min-w-[150px]">
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

                <div className="flex space-x-2">
                  <button
                    onClick={() => setHistoryView('table')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      historyView === 'table'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('tempLogs.table')}
                  </button>
                  <button
                    onClick={() => setHistoryView('chart')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      historyView === 'chart'
                        ? 'bg-[#1e4d6b] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('tempLogs.chart')}
                  </button>
                </div>

                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('tempLogs.exportCsv')}</span>
                </button>
              </div>
            </div>

            {/* Table View */}
            {historyView === 'table' && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.recorded_by_name}
                          </td>
                        </tr>
                        {showHistoryDetails && log.corrective_action && (
                          <tr key={`${log.id}-details`} className="bg-yellow-50">
                            <td colSpan={5} className="px-6 py-3">
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

                {getFilteredHistory().length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No temperature logs found for the selected filters.</p>
                  </div>
                )}
              </div>
            )}

            {/* Chart View */}
            {historyView === 'chart' && (() => {
              const chartData = getChartData();
              const chartNames = getChartEquipmentNames();
              const selectedEq = historyEquipment !== 'all' ? equipment.find(e => e.id === historyEquipment) : null;

              return (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Temperature Trends</h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{t('tempLogs.cooldownTracker')}</h2>
              <button
                onClick={() => setShowStartCooldown(true)}
                className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium shadow-sm flex items-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>{t('tempLogs.startCooldown')}</span>
              </button>
            </div>

            {/* Active Cooldowns */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('tempLogs.activeCooldowns')}</h3>
              {cooldowns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {cooldowns.map(cooldown => {
                    const progress = getCooldownProgress(cooldown);
                    const status = getCooldownStatus(cooldown);
                    const currentTemp = cooldown.checks[cooldown.checks.length - 1].temperature;

                    return (
                      <div key={cooldown.id} className="bg-white rounded-lg shadow p-6" style={{ border: '2px solid #1e4d6b' }}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">{cooldown.itemName}</h4>
                            <p className="text-sm text-gray-600">{cooldown.location}</p>
                            <p className="text-xs text-gray-500">Started by {cooldown.startedBy}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 text-center">
                              {formatCooldownTime(cooldown.startTime)}
                            </div>
                            <p className="text-xs text-gray-500">{t('tempLogs.elapsed')}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {progress.stage === 1 ? t('tempLogs.stage1') : t('tempLogs.stage2')} {progress.stage === 1 ? '135°F → 70°F' : '70°F → 41°F'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              status === 'on-track' ? 'bg-green-100 text-green-800' :
                              status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {status === 'on-track' ? t('tempLogs.onTrack') : status === 'warning' ? t('tempLogs.warning') : t('tempLogs.failed')}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                progress.stage === 1 ? 'bg-[#1e4d6b]' : 'bg-[#22c55e]'
                              }`}
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {progress.elapsed.toFixed(1)}h / {progress.limit}h limit
                          </p>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">{t('tempLogs.currentTemperature')}</p>
                          <div className="text-3xl font-bold text-gray-900 text-center">{currentTemp}°F</div>
                        </div>

                        {/* Mini chart */}
                        <div className="mb-4" style={{ height: '100px' }}>
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
                            className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150 font-medium"
                          >
                            {t('tempLogs.logCheck')}
                          </button>
                          <button
                            onClick={() => handleCompleteCooldown(cooldown.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            {t('tempLogs.complete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active cooldowns</p>
                </div>
              )}
            </div>

            {/* Completed Cooldowns */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('tempLogs.completedCooldowns')}</h3>
              <div className="bg-white shadow rounded-lg overflow-hidden">
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

                {completedCooldowns.length === 0 && (
                  <div className="text-center py-12">
                    <StopCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No completed cooldowns yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Temperature Modal */}
      {showLogModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
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
                      <span className="text-green-600 font-bold text-2xl">PASS ✓</span>
                    ) : (
                      <span className="text-red-600 font-bold text-2xl">FAIL ✗</span>
                    )}
                  </div>
                )}
              </div>

              {temperature && !isWithinRange && (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <X className="h-6 w-6 text-red-600 mr-2" />
                    <span className="text-lg font-bold text-red-600">Temperature out of range!</span>
                  </div>

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
                  className="px-6 py-4 border-2 border-[#1e4d6b] rounded-lg text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{entry.equipment_name}</h4>
                        <p className="text-sm text-gray-600">
                          {t('tempLogs.range')} {entry.min_temp}°F - {entry.max_temp}°F
                        </p>
                      </div>

                      {!entry.skipped && (
                        <div className="flex items-center space-x-4">
                          <input
                            type="number"
                            step="0.1"
                            value={entry.temperature}
                            onChange={(e) => handleBatchTempChange(entry.equipment_id, e.target.value)}
                            placeholder="Temp"
                            className="w-32 px-4 py-2 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
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
                        className={`ml-4 px-4 py-2 rounded-lg font-medium ${
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
                className="px-6 py-4 border-2 border-[#1e4d6b] rounded-lg text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
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

      {/* Cooldown Check Modal */}
      {showCooldownCheckModal && selectedCooldown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-2xl font-bold mb-2">{selectedCooldown.itemName}</h3>
            <p className="text-gray-600 mb-6">Log Temperature Check</p>

            <form onSubmit={handleLogCooldownCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tempLogs.temperatureF')}</label>
                <input
                  type="number"
                  step="0.1"
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
