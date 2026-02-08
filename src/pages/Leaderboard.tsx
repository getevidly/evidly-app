import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Trophy, Medal, Award, TrendingUp, Flame, Target, Zap, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Breadcrumb } from '../components/Breadcrumb';

interface LocationLeaderboard {
  location_id: string;
  location_name: string;
  total_temp_logs: number;
  total_checklists: number;
  total_documents: number;
  compliance_score: number;
  total_points: number;
}

const DEMO_LEADERBOARD: LocationLeaderboard[] = [
  { location_id: '1', location_name: 'Downtown Kitchen', total_temp_logs: 186, total_checklists: 92, total_documents: 24, compliance_score: 92, total_points: 3420 },
  { location_id: '2', location_name: 'Airport Cafe', total_temp_logs: 142, total_checklists: 78, total_documents: 18, compliance_score: 74, total_points: 2180 },
  { location_id: '3', location_name: 'University Dining', total_temp_logs: 98, total_checklists: 45, total_documents: 12, compliance_score: 58, total_points: 1240 },
];

export function Leaderboard() {
  const { profile } = useAuth();
  const [locations, setLocations] = useState<LocationLeaderboard[]>([]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchLeaderboard();
    } else {
      // Demo mode
      setLocations(DEMO_LEADERBOARD);
    }
  }, [profile]);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('v_location_leaderboard')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('total_points', { ascending: false });

    if (data && data.length > 0) {
      setLocations(data);
    } else {
      // Fall back to demo data if view doesn't exist or returns empty
      setLocations(DEMO_LEADERBOARD);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-700" />;
      default:
        return <span className="text-lg font-semibold text-gray-500">#{index + 1}</span>;
    }
  };

  return (
    <Layout title="Leaderboard">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leaderboard' }]} />
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-6 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Trophy className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-2xl font-bold">Location Leaderboard</h2>
          </div>
          <p className="text-gray-200">Track performance across all your locations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">
              {locations.length > 0 ? Math.round(locations.reduce((sum, l) => sum + l.compliance_score, 0) / locations.length) : 0}
            </div>
            <div className="text-sm text-gray-500">Avg Compliance</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Trophy className="h-8 w-8 text-[#d4af37] mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">{locations.length}</div>
            <div className="text-sm text-gray-500">Active Locations</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Award className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">{locations.reduce((sum, l) => sum + l.total_points, 0)}</div>
            <div className="text-sm text-gray-500">Total Points</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Rankings</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {locations.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No locations yet</p>
              </div>
            ) : (
              locations.map((location, index) => (
                <div key={location.location_id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 flex justify-center">{getRankIcon(index)}</div>
                    <div className="h-10 w-10 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white font-medium">
                      {location.location_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{location.location_name}</div>
                      <div className="text-sm text-gray-500">
                        {location.total_temp_logs} logs · {location.total_checklists} checklists · {location.compliance_score} compliance
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#d4af37]">{location.total_points}</div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {locations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locations.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="compliance_score" fill="#d4af37" name="Compliance Score" />
                <Bar dataKey="total_points" fill="#1e4d6b" name="Total Points" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Badges</h3>
          <p className="text-sm text-gray-600 mb-6">
            Earn badges by maintaining excellent compliance across your locations
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Flame className="h-8 w-8 text-yellow-900" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Perfect Week</h4>
              <p className="text-sm text-gray-600 mb-2">100% compliance for 7 consecutive days</p>
              <span className="text-xs text-yellow-800 font-semibold bg-yellow-200 px-2 py-1 rounded">EARNED</span>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="h-8 w-8 text-green-900" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">100% Temp Logs</h4>
              <p className="text-sm text-gray-600 mb-2">All temperature logs current for 30 days</p>
              <span className="text-xs text-green-800 font-semibold bg-green-200 px-2 py-1 rounded">EARNED</span>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-8 w-8 text-blue-900" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Zero Overdue Docs</h4>
              <p className="text-sm text-gray-600 mb-2">All vendor documents current and valid</p>
              <span className="text-xs text-gray-600 font-semibold bg-gray-200 px-2 py-1 rounded">LOCKED</span>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="h-8 w-8 text-purple-900" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Gold Standard</h4>
              <p className="text-sm text-gray-600 mb-2">90%+ compliance score for 90 days</p>
              <span className="text-xs text-gray-600 font-semibold bg-gray-200 px-2 py-1 rounded">LOCKED</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How to earn points:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Complete temperature logs: 10 points</li>
            <li>• Finish checklists: 25 points</li>
            <li>• Upload documents: 15 points</li>
            <li>• Resolve alerts: 20 points</li>
            <li>• Perfect week streak: 100 bonus points</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
