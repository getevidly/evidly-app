import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, CheckCircle, AlertTriangle, Clock, XCircle, Filter,
  Building2, MapPin, Calendar, FileText,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import {
  VENDOR_CATEGORIES,
  SERVICE_TYPE_TO_CATEGORY,
  getRequiredCategories,
  getCategoryById,
  type VendorCategory,
} from '../config/vendorCategories';
import { DEMO_SERVICE_RECORDS, type DemoServiceRecord } from '../data/demoServiceRecords';
import { vendors as demoVendors, locations as demoLocations } from '../data/demoData';

// ── Types ──────────────────────────────────────────────────────────

type ServiceStatus = 'current' | 'due_soon' | 'overdue' | 'no_vendor';

interface RequiredServiceStatus {
  category: VendorCategory;
  serviceName: string;
  vendorName: string | null;
  lastServiceDate: string | null;
  nextDueDate: string | null;
  status: ServiceStatus;
}

// ── Helpers ────────────────────────────────────────────────────────

function computeServiceStatus(nextDueDate: string | null, hasVendor: boolean): ServiceStatus {
  if (!hasVendor) return 'no_vendor';
  if (!nextDueDate) return 'current';
  const daysUntilDue = differenceInDays(new Date(nextDueDate), new Date());
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 30) return 'due_soon';
  return 'current';
}

function getStatusBadge(status: ServiceStatus) {
  switch (status) {
    case 'current':
      return { icon: CheckCircle, label: 'Current', bg: 'bg-green-100', text: 'text-green-800', iconColor: 'text-green-600' };
    case 'due_soon':
      return { icon: Clock, label: 'Due Soon', bg: 'bg-amber-100', text: 'text-amber-800', iconColor: 'text-amber-600' };
    case 'overdue':
      return { icon: AlertTriangle, label: 'Overdue', bg: 'bg-red-100', text: 'text-red-800', iconColor: 'text-red-600' };
    case 'no_vendor':
      return { icon: XCircle, label: 'No Vendor', bg: 'bg-gray-100', text: 'text-gray-600', iconColor: 'text-gray-400' };
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function ServicesPage() {
  const navigate = useNavigate();
  const { getAccessibleLocations, showAllLocationsOption } = useRole();
  const accessibleLocs = getAccessibleLocations();

  // Filters
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Log Service modal
  const [showLogService, setShowLogService] = useState(false);
  const [logForm, setLogForm] = useState({
    locationId: '',
    categoryId: '',
    serviceId: '',
    vendorName: '',
    serviceDate: new Date().toISOString().split('T')[0],
    technicianName: '',
    nextServiceDate: '',
    notes: '',
  });

  // Local records added via Log Service
  const [localRecords, setLocalRecords] = useState<DemoServiceRecord[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { isDemoMode } = useDemo();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Non-demo mode: show empty state (no hardcoded data for authenticated users)
  if (!isDemoMode) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendor Services</h1>
        <p className="text-sm text-gray-500 mb-6">Track and manage vendor service schedules across your locations.</p>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Service Records Yet</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Add vendors and log service visits to track your maintenance schedules.
          </p>
        </div>
      </div>
    );
  }

  // All service records (demo + local)
  const allRecords = useMemo(() => [...DEMO_SERVICE_RECORDS, ...localRecords], [localRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return allRecords
      .filter((r) => locationFilter === 'all' || r.locationId === locationFilter)
      .filter((r) => categoryFilter === 'all' || r.categoryId === categoryFilter)
      .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }, [allRecords, locationFilter, categoryFilter]);

  // Build vendor lookup by category for the Log Service modal
  const vendorsByCategory = useMemo(() => {
    const map: Record<string, { name: string; id: string }[]> = {};
    const seen = new Set<string>();
    demoVendors.forEach((v) => {
      const catId = SERVICE_TYPE_TO_CATEGORY[v.serviceType];
      if (!catId) return;
      const key = `${catId}:${v.companyName}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (!map[catId]) map[catId] = [];
      map[catId].push({ name: v.companyName, id: v.id });
    });
    return map;
  }, []);

  // Build required services status overview
  const requiredStatuses = useMemo(() => {
    const required = getRequiredCategories();
    return required.map((cat): RequiredServiceStatus => {
      const reqService = cat.services.find((s) => s.required);
      const serviceName = reqService?.name || cat.name;

      // Find latest record for this category (optionally filtered by location)
      const records = allRecords
        .filter((r) => r.categoryId === cat.id)
        .filter((r) => locationFilter === 'all' || r.locationId === locationFilter)
        .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());

      const latestRecord = records[0];
      const hasVendor = !!vendorsByCategory[cat.id]?.length;

      return {
        category: cat,
        serviceName,
        vendorName: latestRecord?.vendorName || (hasVendor ? vendorsByCategory[cat.id][0].name : null),
        lastServiceDate: latestRecord?.serviceDate || null,
        nextDueDate: latestRecord?.nextDueDate || null,
        status: computeServiceStatus(latestRecord?.nextDueDate || null, hasVendor),
      };
    });
  }, [allRecords, locationFilter, vendorsByCategory]);

  // Services for selected category in the Log Service form
  const selectedCategoryServices = useMemo(() => {
    if (!logForm.categoryId) return [];
    const cat = getCategoryById(logForm.categoryId);
    return cat?.services || [];
  }, [logForm.categoryId]);

  // Vendors for selected category in the Log Service form
  const selectedCategoryVendors = useMemo(() => {
    return vendorsByCategory[logForm.categoryId] || [];
  }, [logForm.categoryId, vendorsByCategory]);

  // Location name lookup
  const locationNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    demoLocations.forEach((l) => { map[l.id] = l.name; });
    return map;
  }, []);

  // Check if a category has a vendor (for graying out in Log Service)
  const categoryHasVendor = (catId: string) => !!(vendorsByCategory[catId]?.length);

  const handleLogServiceSubmit = () => {
    if (!logForm.locationId || !logForm.categoryId || !logForm.serviceId || !logForm.vendorName || !logForm.serviceDate) {
      showToast('Please fill in all required fields.');
      return;
    }
    const cat = getCategoryById(logForm.categoryId);
    const svc = cat?.services.find((s) => s.id === logForm.serviceId);

    const newRecord: DemoServiceRecord = {
      id: 'local-' + Date.now(),
      vendorName: logForm.vendorName,
      categoryId: logForm.categoryId,
      serviceId: logForm.serviceId,
      serviceName: svc?.name || logForm.serviceId,
      locationId: logForm.locationId,
      locationName: locationNameMap[logForm.locationId] || logForm.locationId,
      serviceDate: logForm.serviceDate,
      nextDueDate: logForm.nextServiceDate || '',
      technicianName: logForm.technicianName,
      status: 'completed',
      result: 'pass',
      cost: null,
      notes: logForm.notes,
      certificateNumber: null,
    };

    setLocalRecords((prev) => [...prev, newRecord]);
    showToast('Service record logged successfully');
    setShowLogService(false);
    setLogForm({
      locationId: '', categoryId: '', serviceId: '', vendorName: '',
      serviceDate: new Date().toISOString().split('T')[0],
      technicianName: '', nextServiceDate: '', notes: '',
    });
  };

  // Check if a service is required
  const isRequiredService = (categoryId: string, serviceId: string): boolean => {
    const cat = getCategoryById(categoryId);
    return cat?.services.find((s) => s.id === serviceId)?.required ?? false;
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0B1628' }}>Vendor Services</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and log vendor-provided service records across your locations.
            </p>
          </div>
          <button
            onClick={() => setShowLogService(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium transition-colors self-start"
          >
            <Plus className="h-4 w-4" />
            Log Service
          </button>
        </div>

        {/* Required Services Status Overview */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Required Services — Status Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {requiredStatuses.map((rs) => {
              const badge = getStatusBadge(rs.status);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={rs.category.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{rs.serviceName}</p>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">Required</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {rs.vendorName || 'No vendor assigned'}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                      <BadgeIcon className={`h-3 w-3 ${badge.iconColor}`} />
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {rs.lastServiceDate && (
                      <span>Last: {format(new Date(rs.lastServiceDate), 'MMM d, yyyy')}</span>
                    )}
                    {rs.nextDueDate && (
                      <span>Next due: {format(new Date(rs.nextDueDate), 'MMM d, yyyy')}</span>
                    )}
                    {!rs.lastServiceDate && !rs.nextDueDate && (
                      <span className="italic">No records</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
            >
              {showAllLocationsOption() && <option value="all">All Locations</option>}
              {accessibleLocs.map((loc) => (
                <option key={loc.locationId} value={loc.locationId}>{loc.locationName}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
            >
              <option value="all">All Categories</option>
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {(locationFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => { setLocationFilter('all'); setCategoryFilter('all'); }}
                className="text-sm text-[#1e4d6b] hover:text-[#163a52] font-medium px-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Service History */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Service History</h2>
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No service records found</p>
              <p className="text-xs text-gray-400 mt-1">Log a service to see records here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Technician</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((record) => {
                      const required = isRequiredService(record.categoryId, record.serviceId);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            {format(new Date(record.serviceDate), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900">{record.serviceName}</span>
                            {required && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">Required</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{record.vendorName}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-gray-600">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {record.locationName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{record.technicianName || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              record.result === 'pass' ? 'bg-green-100 text-green-800' :
                              record.result === 'fail' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {record.result === 'pass' ? 'Pass' : record.result === 'fail' ? 'Fail' : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {record.nextDueDate ? format(new Date(record.nextDueDate), 'MMM d, yyyy') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredRecords.map((record) => {
                  const required = isRequiredService(record.categoryId, record.serviceId);
                  return (
                    <div key={record.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {record.serviceName}
                            {required && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">Required</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{record.vendorName}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          record.result === 'pass' ? 'bg-green-100 text-green-800' :
                          record.result === 'fail' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {record.result === 'pass' ? 'Pass' : record.result === 'fail' ? 'Fail' : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.serviceDate), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.locationName}
                        </span>
                      </div>
                      {record.nextDueDate && (
                        <p className="text-xs text-gray-400">Next due: {format(new Date(record.nextDueDate), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Service Modal */}
      {showLogService && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowLogService(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-sm border border-gray-200 w-[95vw] sm:w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#eef4f8] rounded-lg">
                      <Plus className="h-5 w-5 text-[#1e4d6b]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Log a Service</h3>
                      <p className="text-sm text-gray-500">Record a completed vendor service</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLogService(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                  <select
                    value={logForm.locationId}
                    onChange={(e) => setLogForm({ ...logForm, locationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  >
                    <option value="">Select location...</option>
                    {accessibleLocs.map((loc) => (
                      <option key={loc.locationId} value={loc.locationId}>{loc.locationName}</option>
                    ))}
                  </select>
                </div>

                {/* Service Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Category <span className="text-red-500">*</span></label>
                  <select
                    value={logForm.categoryId}
                    onChange={(e) => {
                      const catId = e.target.value;
                      if (catId && !categoryHasVendor(catId)) {
                        navigate('/vendors');
                        return;
                      }
                      setLogForm({ ...logForm, categoryId: catId, serviceId: '', vendorName: '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  >
                    <option value="">Select category...</option>
                    {VENDOR_CATEGORIES.map((cat) => {
                      const hasVendor = categoryHasVendor(cat.id);
                      const reqServices = cat.services.filter((s) => s.required);
                      return (
                        <option key={cat.id} value={cat.id} className={!hasVendor ? 'text-gray-400' : ''}>
                          {cat.name}{!hasVendor ? ' (Add vendor first)' : ''}{reqServices.length > 0 ? ' *' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Service */}
                {logForm.categoryId && categoryHasVendor(logForm.categoryId) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service <span className="text-red-500">*</span></label>
                    <select
                      value={logForm.serviceId}
                      onChange={(e) => setLogForm({ ...logForm, serviceId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    >
                      <option value="">Select service...</option>
                      {selectedCategoryServices.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name}{svc.required ? ' (Required)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Vendor */}
                {logForm.categoryId && categoryHasVendor(logForm.categoryId) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor <span className="text-red-500">*</span></label>
                    <select
                      value={logForm.vendorName}
                      onChange={(e) => setLogForm({ ...logForm, vendorName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    >
                      <option value="">Select vendor...</option>
                      {selectedCategoryVendors.map((v) => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Performed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Performed <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={logForm.serviceDate}
                    onChange={(e) => setLogForm({ ...logForm, serviceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  />
                </div>

                {/* Technician Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician Name</label>
                  <input
                    type="text"
                    value={logForm.technicianName}
                    onChange={(e) => setLogForm({ ...logForm, technicianName: e.target.value })}
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  />
                </div>

                {/* Next Service Due */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Due</label>
                  <input
                    type="date"
                    value={logForm.nextServiceDate}
                    onChange={(e) => setLogForm({ ...logForm, nextServiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                    placeholder="Service details, observations, follow-up items..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowLogService(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogServiceSubmit}
                  className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium"
                >
                  Log Service
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}
    </>
  );
}
