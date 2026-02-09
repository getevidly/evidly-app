import { useState, useEffect } from 'react';
import { ChevronDown, MapPin, User, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ProfileModal } from '../ProfileModal';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';

interface LocationOption {
  id: string;
  name: string;
}

interface TopBarProps {
  title: string;
  locations?: LocationOption[];
  selectedLocation?: string | null;
  onLocationChange?: (locationId: string | null) => void;
  demoMode?: boolean;
}

export function TopBar({ title, locations, selectedLocation, onLocationChange, demoMode = false }: TopBarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { userRole, setUserRole } = useRole();
  const { isDemoMode } = useDemo();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="sticky top-0 z-50 flex-shrink-0 flex h-16 bg-white shadow">
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div style={{ width: '40px', height: '40px', border: '2px dashed #d1d5db', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>Logo</span>
          </div>
          <div>
            <div className="text-xl font-semibold text-gray-900">
              {isDemoMode ? 'Pacific Coast Dining' : profile?.organization_name || title}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Compliance Simplified</div>
          </div>
        </div>

        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          {locations && locations.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowLocationMenu(!showLocationMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <MapPin className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedLocation
                    ? locations.find((loc) => loc.id === selectedLocation)?.name || 'All Locations'
                    : 'All Locations'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {showLocationMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onLocationChange?.(null);
                        setShowLocationMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        !selectedLocation
                          ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Locations
                    </button>
                    {locations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => {
                          onLocationChange?.(location.id);
                          setShowLocationMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          selectedLocation === location.id
                            ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role switcher - only visible in demo mode */}
          {isDemoMode && (
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {userRole === 'management' ? 'Management View' : userRole === 'kitchen' ? 'Kitchen Staff View' : 'Facilities View'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {showRoleMenu && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserRole('management');
                      setShowRoleMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      userRole === 'management'
                        ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Management View
                  </button>
                  <button
                    onClick={() => {
                      setUserRole('kitchen');
                      setShowRoleMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      userRole === 'kitchen'
                        ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Kitchen Staff View
                  </button>
                  <button
                    onClick={() => {
                      setUserRole('facilities');
                      setShowRoleMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      userRole === 'facilities'
                        ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Facilities View
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white font-medium">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {profile?.full_name || 'User'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {showUserMenu && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-1 ml-2">
            <ShieldCheck className="h-6 w-6" style={{ color: '#d4af37' }} />
            <div>
              <span className="font-bold text-lg">
                <span style={{ color: '#1e4d6b' }}>Evid</span>
                <span style={{ color: '#d4af37' }}>LY</span>
              </span>
              <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.5px', lineHeight: '1' }}>Compliance Simplified</div>
            </div>
          </div>
        </div>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
