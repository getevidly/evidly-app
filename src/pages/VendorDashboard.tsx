import { useState, useEffect } from 'react';
import { Upload, Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface VendorStats {
  pending_uploads: number;
  clients_served: number;
  documents_on_file: number;
}

interface UploadRequest {
  id: string;
  request_type: string;
  description: string;
  status: string;
  created_at: string;
  organization_id: string;
}

export function VendorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats>({
    pending_uploads: 0,
    clients_served: 0,
    documents_on_file: 0
  });
  const [pendingRequests, setPendingRequests] = useState<UploadRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<UploadRequest[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const { data: vendorUser } = await supabase
      .from('vendor_users')
      .select('vendor_id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!vendorUser) return;

    const [pendingResult, completedResult, clientsResult] = await Promise.all([
      supabase
        .from('vendor_upload_requests')
        .select('*')
        .eq('vendor_id', vendorUser.vendor_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('vendor_upload_requests')
        .select('*')
        .eq('vendor_id', vendorUser.vendor_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5),
      supabase
        .from('vendor_client_relationships')
        .select('id', { count: 'exact' })
        .eq('vendor_id', vendorUser.vendor_id)
    ]);

    setPendingRequests(pendingResult.data || []);
    setCompletedRequests(completedResult.data || []);

    setStats({
      pending_uploads: pendingResult.data?.length || 0,
      clients_served: clientsResult.count || 0,
      documents_on_file: completedResult.data?.length || 0
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-12">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-2xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
                <span className="ml-2 text-sm text-gray-600">Vendor Portal</span>
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending Uploads</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending_uploads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Clients Served</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clients_served}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Documents on File</p>
                <p className="text-3xl font-bold text-gray-900">{stats.documents_on_file}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Action Required</h2>
            </div>
            <div className="p-6">
              {pendingRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending upload requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{request.request_type}</h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Requested {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </span>
                        <button className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg text-sm font-medium hover:bg-[#2a6a8f]">
                          Upload Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Uploads</h2>
            </div>
            <div className="p-6">
              {completedRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No completed uploads yet</p>
              ) : (
                <div className="space-y-4">
                  {completedRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{request.request_type}</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          Completed
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                      <span className="text-xs text-gray-500">
                        Completed {request.completed_at ? format(new Date(request.completed_at), 'MMM d, yyyy') : 'Recently'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
