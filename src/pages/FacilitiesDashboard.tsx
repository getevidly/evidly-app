import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Clock, ChevronRight, FileText, Flame, Wind, Droplets, Trash2, FileCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface EquipmentStatus {
  id: string;
  name: string;
  icon: any;
  lastService: string;
  nextDue: string;
  status: 'on_track' | 'due_soon' | 'overdue';
  vendor: string;
}

interface VendorAction {
  id: string;
  vendor: string;
  message: string;
  link: string;
  priority: 'high' | 'medium';
}

interface Document {
  id: string;
  name: string;
  status: 'current' | 'expiring' | 'expired';
  expiryDate?: string;
  link: string;
}

export function FacilitiesDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [equipmentSystems] = useState<EquipmentStatus[]>([
    {
      id: '1',
      name: 'Hood System',
      icon: Flame,
      lastService: 'Jan 15, 2026',
      nextDue: 'Apr 15, 2026',
      status: 'on_track',
      vendor: 'Pro Hood Cleaning'
    },
    {
      id: '2',
      name: 'Fire Suppression',
      icon: Flame,
      lastService: 'Aug 10, 2025',
      nextDue: 'Feb 10, 2026',
      status: 'overdue',
      vendor: 'Valley Fire Systems'
    },
    {
      id: '3',
      name: 'Fire Extinguishers',
      icon: Flame,
      lastService: 'Nov 1, 2025',
      nextDue: 'May 1, 2026',
      status: 'on_track',
      vendor: 'ABC Fire Protection'
    },
    {
      id: '4',
      name: 'Grease Trap',
      icon: Droplets,
      lastService: 'Sep 20, 2025',
      nextDue: 'Mar 20, 2026',
      status: 'due_soon',
      vendor: 'Grease Masters'
    },
    {
      id: '5',
      name: 'HVAC',
      icon: Wind,
      lastService: 'Jan 4, 2026',
      nextDue: 'Apr 4, 2026',
      status: 'on_track',
      vendor: 'Cool Air Services'
    }
  ]);

  const [vendorActions] = useState<VendorAction[]>([
    {
      id: '1',
      vendor: 'Valley Fire Systems',
      message: 'Fire Suppression OVERDUE. Contact vendor to schedule.',
      link: '/vendors',
      priority: 'high'
    },
    {
      id: '2',
      vendor: 'Grease Masters',
      message: 'Service due in 32 days. Confirm appointment.',
      link: '/vendors',
      priority: 'medium'
    },
    {
      id: '3',
      vendor: 'ABC Fire Protection',
      message: 'COI expires Mar 15. Request updated certificate.',
      link: '/vendors',
      priority: 'medium'
    }
  ]);

  const [documents] = useState<Document[]>([
    {
      id: '1',
      name: 'Fire Suppression Report',
      status: 'expired',
      expiryDate: 'Feb 10, 2026',
      link: '/documents'
    },
    {
      id: '2',
      name: 'HVAC Maintenance Record',
      status: 'current',
      expiryDate: 'Apr 4, 2026',
      link: '/documents'
    },
    {
      id: '3',
      name: 'Grease Trap Service Log',
      status: 'expiring',
      expiryDate: 'Mar 20, 2026',
      link: '/documents'
    }
  ]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600';
      case 'due_soon': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-50 border-green-200';
      case 'due_soon': return 'bg-yellow-50 border-yellow-200';
      case 'overdue': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_track': return 'ON TRACK';
      case 'due_soon': return 'DUE SOON';
      case 'overdue': return 'OVERDUE';
      default: return 'UNKNOWN';
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-600';
      case 'expiring': return 'text-yellow-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDocumentStatusLabel = (status: string) => {
    switch (status) {
      case 'current': return 'current';
      case 'expiring': return 'expiring soon';
      case 'expired': return 'EXPIRED';
      default: return 'unknown';
    }
  };

  const overdueCount = equipmentSystems.filter(e => e.status === 'overdue').length;

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 sm:p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">{greeting}, {firstName}!</h1>
          <p className="text-blue-100">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Equipment Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentSystems.map((equipment) => {
              const Icon = equipment.icon;
              return (
                <div
                  key={equipment.id}
                  className={`rounded-lg border-2 p-4 sm:p-5 transition-all ${getStatusBg(equipment.status)}`}
                >
                  <div className="flex items-start space-x-3 mb-4">
                    <div className={`p-2 rounded-lg bg-white ${getStatusColor(equipment.status)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{equipment.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{equipment.vendor}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Service:</span>
                      <span className="font-medium text-gray-900">{equipment.lastService}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Due:</span>
                      <span className="font-medium text-gray-900">{equipment.nextDue}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold uppercase ${getStatusColor(equipment.status)}`}>
                      {getStatusLabel(equipment.status)}
                    </span>
                    {equipment.status !== 'on_track' && (
                      <button
                        onClick={() => navigate('/vendors')}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
                      >
                        {equipment.status === 'overdue' ? 'Schedule Now' : 'Schedule Service'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {vendorActions.length > 0 && (
          <div className={`rounded-lg p-4 sm:p-6 ${overdueCount > 0 ? 'bg-red-50 border-l-4 border-red-600' : 'bg-yellow-50 border-l-4 border-yellow-500'}`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`h-6 w-6 flex-shrink-0 mt-0.5 ${overdueCount > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-4 ${overdueCount > 0 ? 'text-red-900' : 'text-yellow-900'}`}>
                  Vendor Actions Needed
                </h3>
                <div className="space-y-3">
                  {vendorActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between flex-wrap gap-2 bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{action.vendor}</div>
                        <div className="text-sm text-gray-600 mt-1">{action.message}</div>
                      </div>
                      <button
                        onClick={() => navigate(action.link)}
                        className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-colors min-h-[44px] ${
                          action.priority === 'high'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Documents to Review</h3>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(doc.link)}
                className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <FileText className={`h-5 w-5 ${getDocumentStatusColor(doc.status)}`} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{doc.name}</div>
                    {doc.expiryDate && (
                      <div className="text-sm text-gray-600">Expires: {doc.expiryDate}</div>
                    )}
                  </div>
                  <span className={`text-sm font-semibold uppercase ${getDocumentStatusColor(doc.status)}`}>
                    {getDocumentStatusLabel(doc.status)}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-3" />
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/documents')}
            className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
          >
            Upload Document
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/vendors')}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 sm:p-8 hover:border-blue-500 hover:shadow-md transition-all text-center group min-h-[44px]"
            style={{ minHeight: '120px' }}
          >
            <FileCheck className="h-12 w-12 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-lg font-bold text-gray-900">View Vendors</div>
          </button>

          <button
            onClick={() => navigate('/documents')}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 sm:p-8 hover:border-blue-500 hover:shadow-md transition-all text-center group min-h-[44px]"
            style={{ minHeight: '120px' }}
          >
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-lg font-bold text-gray-900">Upload Document</div>
          </button>

          <button
            onClick={() => navigate('/alerts')}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 sm:p-8 hover:border-blue-500 hover:shadow-md transition-all text-center group min-h-[44px]"
            style={{ minHeight: '120px' }}
          >
            <AlertTriangle className="h-12 w-12 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-lg font-bold text-gray-900">View Alerts</div>
          </button>
        </div>
      </div>
    </>
  );
}
