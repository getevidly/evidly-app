import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Plus, Building2, Mail, Phone, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { vendors as demoVendors } from '../data/demoData';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';

interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  status: string;
}

interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  category: string;
  reliability_score: number;
  on_time_rate: number;
  doc_compliance_rate: number;
  last_service: string;
  next_due: string;
  trend: 'improving' | 'declining' | 'stable';
}

export function Vendors() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'scorecard'>('list');

  const demoPerformance: VendorPerformance[] = [
    {
      vendor_id: '1',
      vendor_name: 'ABC Fire Protection',
      category: 'Hood Cleaning',
      reliability_score: 98,
      on_time_rate: 100,
      doc_compliance_rate: 95,
      last_service: '2025-10-12',
      next_due: '2026-02-12',
      trend: 'stable',
    },
    {
      vendor_id: '3',
      vendor_name: 'Valley Fire Systems',
      category: 'Fire Suppression',
      reliability_score: 95,
      on_time_rate: 97,
      doc_compliance_rate: 100,
      last_service: '2025-12-03',
      next_due: '2026-06-03',
      trend: 'improving',
    },
    {
      vendor_id: '4',
      vendor_name: 'CleanAir HVAC',
      category: 'HVAC Service',
      reliability_score: 88,
      on_time_rate: 85,
      doc_compliance_rate: 90,
      last_service: '2026-02-03',
      next_due: '2026-02-10',
      trend: 'declining',
    },
    {
      vendor_id: '2',
      vendor_name: 'Pacific Pest Control',
      category: 'Pest Control',
      reliability_score: 92,
      on_time_rate: 95,
      doc_compliance_rate: 88,
      last_service: '2026-01-15',
      next_due: '2026-02-15',
      trend: 'stable',
    },
  ];

  useEffect(() => {
    if (profile?.organization_id) {
      fetchVendors();
    }
  }, [profile]);

  const fetchVendors = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('name', { ascending: true });

    if (data) setVendors(data);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-400" />;
  };

  const compliantVendors = demoPerformance.filter(v => v.reliability_score >= 90).length;
  const totalVendors = demoPerformance.length;

  return (
    <Layout title="Vendors">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors' }]} />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'list'
                  ? 'border-b-2 border-[#1e4d6b] text-[#1e4d6b]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendor List
            </button>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'scorecard'
                  ? 'border-b-2 border-[#1e4d6b] text-[#1e4d6b]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Performance Scorecard
            </button>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f] shadow-sm">
            <Plus className="h-5 w-5" />
            <span>Add Vendor</span>
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoVendors.map((vendor) => (
              <div key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vendor.companyName}</h3>
                      <span className="text-xs text-gray-500">{vendor.serviceType}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      vendor.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : vendor.status === 'upcoming'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {vendor.status === 'overdue' ? 'Overdue' : vendor.status === 'upcoming' ? 'Due Soon' : 'Current'}
                  </span>
                </div>

                <p className="text-sm font-medium text-gray-700 mb-1">{vendor.contactName}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span>{vendor.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4" />
                    <span>{vendor.phone}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Service:</span>
                    <span className="font-medium text-gray-900">{format(new Date(vendor.lastService), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Next Due:</span>
                    <span className={`font-medium ${vendor.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                      {format(new Date(vendor.nextDue), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Documents:</span>
                    <span className="flex items-center space-x-1 font-medium text-gray-900">
                      <FileText className="h-4 w-4" />
                      <span>{vendor.documentsCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          }
          </div>
        )}

        {activeTab === 'scorecard' && (
          <>
            <div className="bg-gradient-to-r from-[#1b4965] to-[#2c5f7f] rounded-lg p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">Vendor Performance Overview</h3>
              <p className="text-gray-200 mb-4">Track reliability, service quality, and document compliance</p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold">{compliantVendors}/{totalVendors}</div>
                    <div className="text-sm text-gray-300">Fully Compliant</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {demoPerformance.map((vendor, index) => (
                <div key={index} onClick={() => navigate(`/vendors/${vendor.vendor_id}`)} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vendor.vendor_name}</h3>
                      <span className="text-sm text-gray-500">{vendor.category}</span>
                    </div>
                    {getTrendIcon(vendor.trend)}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Reliability Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(vendor.reliability_score)}`}>
                        {vendor.reliability_score}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          vendor.reliability_score >= 90
                            ? 'bg-green-500'
                            : vendor.reliability_score >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${vendor.reliability_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className={`p-3 rounded-lg ${getScoreBg(vendor.on_time_rate)}`}>
                      <div className="text-xs text-gray-600 mb-1">On-time Service</div>
                      <div className={`text-xl font-bold ${getScoreColor(vendor.on_time_rate)}`}>
                        {vendor.on_time_rate}%
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg ${getScoreBg(vendor.doc_compliance_rate)}`}>
                      <div className="text-xs text-gray-600 mb-1">Doc Compliance</div>
                      <div className={`text-xl font-bold ${getScoreColor(vendor.doc_compliance_rate)}`}>
                        {vendor.doc_compliance_rate}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Service:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(vendor.last_service).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next Due:</span>
                      <span className="font-medium text-gray-900 flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(vendor.next_due).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <div className="text-xs text-gray-500 mb-1">Trend</div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.trend === 'improving'
                          ? 'bg-green-100 text-green-800'
                          : vendor.trend === 'declining'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vendor.trend === 'improving' ? 'Improving' : vendor.trend === 'declining' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
